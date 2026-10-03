import type {
  AccessRequest,
  Agent,
  AgentSchedule,
  Bottleneck,
  Connector,
  ContextNote,
  DataTable,
  DeviceLogin,
  Model,
  NewAgentInput,
  NewBottleneckInput,
  TableRow,
  Payment,
  Price,
  User,
} from "../schema";
export type RowQuery = { where?: Record<string, unknown>; createdBy?: string; limit?: number; offset?: number; order?: "asc" | "desc" };
/** A verified Supabase Auth identity. */
export type AuthIdentity = { authId: string; email?: string; name?: string };

import { createMemoryStore } from "./memory";
import { createPrismaStore } from "./prisma";

/**
 * All data access goes through this. Two implementations:
 * - Prisma on Supabase Postgres, when DATABASE_URL is set (production).
 * - In-memory store otherwise (local hacking; resets on restart, not shared between apps).
 */
export interface Store {
  /** Published public + listed agents, the viewer's own agents (any mode, drafts), and restricted ones the viewer is approved for. */
  listAgents(opts?: { query?: string; category?: string; viewerId?: string }): Promise<Agent[]>;
  getAgent(id: string): Promise<Agent | undefined>;
  /** Id from the name (never a user's handle or a reserved one), or `opts.id` exactly (throws if taken). */
  addAgent(input: NewAgentInput, opts?: { id?: string }): Promise<Agent>;
  updateAgent(id: string, patch: Partial<Omit<Agent, "id" | "createdAt">>): Promise<Agent>;

  listNotes(agentId: string): Promise<ContextNote[]>;
  /** Create or replace the note with this slug. */
  upsertNote(note: Omit<ContextNote, "updatedAt">): Promise<ContextNote>;
  deleteNote(agentId: string, slug: string): Promise<boolean>;

  /** Stored table definitions (the built-in `outputs` is added by `agentTables`, not here). */
  listTables(agentId: string): Promise<DataTable[]>;
  /** Create or replace a table definition. Existing rows are kept. */
  saveTable(t: Omit<DataTable, "updatedAt" | "builtIn">): Promise<DataTable>;
  /** Deletes the definition and every row. */
  deleteTable(agentId: string, name: string): Promise<boolean>;
  insertRows(agentId: string, table: string, rows: { data: Record<string, unknown>; createdBy?: string }[]): Promise<TableRow[]>;
  /** Equality filters on data fields; newest first unless `order: "asc"`. */
  queryRows(agentId: string, table: string, q?: RowQuery): Promise<TableRow[]>;
  countRows(agentId: string, table: string): Promise<number>;
  getRow(agentId: string, table: string, id: string): Promise<TableRow | undefined>;
  /** Replaces the row's data. */
  updateRow(agentId: string, table: string, id: string, data: Record<string, unknown>): Promise<TableRow>;
  deleteRow(agentId: string, table: string, id: string): Promise<boolean>;

  listSchedules(agentId: string): Promise<AgentSchedule[]>;
  getSchedule(id: string): Promise<AgentSchedule | undefined>;
  addSchedule(s: Omit<AgentSchedule, "id" | "createdAt">): Promise<AgentSchedule>;
  updateSchedule(id: string, patch: Partial<Omit<AgentSchedule, "id" | "agentId" | "createdAt">>): Promise<AgentSchedule>;
  deleteSchedule(id: string): Promise<boolean>;
  /** Enabled schedules whose `nextRunAt` has passed, oldest first. */
  dueSchedules(now: string, limit: number): Promise<AgentSchedule[]>;
  /** Moves `nextRunAt` on only if it is still `from`: true for exactly one concurrent caller. */
  claimSchedule(id: string, from: string, next: string): Promise<boolean>;

  /** Returns the API key once; only its hash is kept. */
  createUser(handle: string): Promise<{ user: User; apiKey: string }>;
  getUser(id: string): Promise<User | undefined>;
  userByApiKey(key: string): Promise<User | undefined>;
  userByHandle(handle: string): Promise<User | undefined>;
  /** Throws if another user has it. */
  setHandle(userId: string, handle: string): Promise<User>;
  /** The account linked to a Supabase Auth user, created (handle derived from name/email) on first sign-in. */
  userForAuth(auth: AuthIdentity): Promise<User>;
  /** Issues a new API key (shown once), revoking the previous one. */
  rotateApiKey(userId: string): Promise<string>;

  /** Create or replace. Throws if the name belongs to another owner. */
  saveConnector(c: Omit<Connector, "createdAt">): Promise<Connector>;
  getConnector(name: string): Promise<Connector | undefined>;
  listConnectors(ownerId: string): Promise<Connector[]>;
  /** Stores an already-encrypted secret value. */
  setSecret(connector: string, name: string, ciphertext: string): Promise<void>;
  /** Encrypted values by secret name. Only the connector runtime should read these. */
  getSecrets(connector: string): Promise<Record<string, string>>;

  /** Create or replace. Throws if the name belongs to another owner. Keeps a stored key. */
  saveModel(m: Omit<Model, "createdAt" | "hasKey">): Promise<Model>;
  getModel(name: string): Promise<Model | undefined>;
  listModels(ownerId: string): Promise<Model[]>;
  /** Also unsets it on agents that used it. */
  deleteModel(name: string): Promise<boolean>;
  /** Stores an already-encrypted API key. */
  setModelKey(name: string, ciphertext: string): Promise<void>;
  /** The encrypted key. Only the model runtime should read it. */
  getModelKey(name: string): Promise<string | undefined>;

  /** Link (or unlink, with undefined) the user's Stripe Connect account. */
  setStripeAccount(userId: string, accountId: string | undefined): Promise<User>;

  listPrices(agentId: string): Promise<Price[]>;
  /** Create or replace the price with this name. */
  upsertPrice(price: Omit<Price, "updatedAt">): Promise<Price>;
  deletePrice(agentId: string, name: string): Promise<boolean>;

  addPayment(p: Omit<Payment, "id" | "createdAt" | "status" | "paidAt">): Promise<Payment>;
  getPayment(id: string): Promise<Payment | undefined>;
  setPaymentStatus(id: string, status: Payment["status"]): Promise<Payment>;
  listPayments(opts: { agentId?: string; payerId?: string }): Promise<Payment[]>;

  requestAccess(agentId: string, requesterId: string, message?: string): Promise<AccessRequest>;
  listAccessRequests(opts: { ownerId?: string; requesterId?: string }): Promise<AccessRequest[]>;
  decideAccessRequest(id: string, status: "approved" | "denied"): Promise<AccessRequest>;
  /** May use the agent: owner; anyone if public; approved users if listed/restricted; nobody else (drafts and private: owner only). */
  hasAccess(agentId: string, userId?: string): Promise<boolean>;
  /** May read the agent's info: owner; anyone if public/listed; approved users if restricted; nobody else. */
  canSeeInfo(agentId: string, userId?: string): Promise<boolean>;

  /** Begins a CLI sign-in. The device code is returned once; only its hash is kept. Also purges expired rows. */
  startDeviceLogin(clientName?: string): Promise<{ deviceCode: string; userCode: string; expiresAt: string }>;
  /** The live (unexpired) login for a user code typed by a human; sloppy input is normalized. */
  getDeviceLogin(userCode: string): Promise<DeviceLogin | undefined>;
  /** Approve or deny a pending, unexpired login. False if it was not pending or already expired. */
  decideDeviceLogin(userCode: string, userId: string, decision: "approved" | "denied"): Promise<boolean>;
  /** What the CLI's poll gets. Approved logins are consumed exactly once and yield a freshly rotated API key. */
  redeemDeviceLogin(deviceCode: string): Promise<{ status: "pending" | "denied" | "expired" } | { status: "approved"; apiKey: string; user: User }>;

  listBottlenecks(): Promise<Bottleneck[]>;
  addBottleneck(input: NewBottleneckInput): Promise<Bottleneck>;
}

export { slug, hashKey, normalizeHandle, RESERVED_HANDLES, SPACE_CATEGORY } from "./util";

// Survive Next.js dev hot reloads.
const g = globalThis as unknown as { __agentsSpaceStore?: Store };
export const store: Store = (g.__agentsSpaceStore ??= process.env.DATABASE_URL ? createPrismaStore(process.env.DATABASE_URL) : createMemoryStore());
