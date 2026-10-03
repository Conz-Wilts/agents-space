import type {
  AccessRequest,
  Agent,
  Bottleneck,
  Connector,
  ContextNote,
  DeviceLogin,
  NewAgentInput,
  NewBottleneckInput,
  User,
} from "../schema";
/** A verified Supabase Auth identity. */
export type AuthIdentity = { authId: string; email?: string; name?: string };

import { createMemoryStore } from "./memory";
import { createPrismaStore } from "./prisma";

/**
 * All data access goes through this. Two implementations:
 * - Prisma on Supabase Postgres, when DATABASE_URL is set (production).
 * - In-memory seeded store otherwise (local hacking; resets on restart, not shared between apps).
 */
export interface Store {
  /** Published agents plus the viewer's own drafts. */
  listAgents(opts?: { query?: string; category?: string; viewerId?: string }): Promise<Agent[]>;
  getAgent(id: string): Promise<Agent | undefined>;
  addAgent(input: NewAgentInput): Promise<Agent>;
  updateAgent(id: string, patch: Partial<Omit<Agent, "id" | "createdAt">>): Promise<Agent>;

  listNotes(agentId: string): Promise<ContextNote[]>;
  /** Create or replace the note with this slug. */
  upsertNote(note: Omit<ContextNote, "updatedAt">): Promise<ContextNote>;
  deleteNote(agentId: string, slug: string): Promise<boolean>;

  /** Returns the API key once; only its hash is kept. */
  createUser(handle: string): Promise<{ user: User; apiKey: string }>;
  getUser(id: string): Promise<User | undefined>;
  userByApiKey(key: string): Promise<User | undefined>;
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

  requestAccess(agentId: string, requesterId: string, message?: string): Promise<AccessRequest>;
  listAccessRequests(opts: { ownerId?: string; requesterId?: string }): Promise<AccessRequest[]>;
  decideAccessRequest(id: string, status: "approved" | "denied"): Promise<AccessRequest>;
  hasAccess(agentId: string, userId?: string): Promise<boolean>;

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

export { slug, hashKey, normalizeHandle } from "./util";

// Survive Next.js dev hot reloads.
const g = globalThis as unknown as { __agentsSpaceStore?: Store };
export const store: Store = (g.__agentsSpaceStore ??= process.env.DATABASE_URL ? createPrismaStore(process.env.DATABASE_URL) : createMemoryStore());
