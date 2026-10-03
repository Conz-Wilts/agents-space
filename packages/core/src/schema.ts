import { z } from "zod";

/**
 * A person (or org) on the platform. Signs in on the web with Google (Supabase Auth) and/or
 * authenticates to the MCP with an API key or a Supabase access token.
 */
export const UserSchema = z.object({
  id: z.string(),
  handle: z.string().regex(/^[a-z0-9-]{2,32}$/),
  /** sha256 of the API key. The key itself is shown once and never stored. */
  keyHash: z.string().optional(),
  /** Supabase Auth user id, for accounts created by signing in on the web. */
  authId: z.string().optional(),
  email: z.string().optional(),
  /** Stripe Connect (Express) account that receives this user's payments. */
  stripeAccountId: z.string().optional(),
  /** Public URL of the profile icon (Google picture copied to the profile icons bucket). */
  avatarUrl: z.string().optional(),
  createdAt: z.string(),
});
export type User = z.infer<typeof UserSchema>;

/** A pending CLI sign-in (device flow). The device code itself is never stored. */
export const DeviceLoginSchema = z.object({
  userCode: z.string(),
  status: z.enum(["pending", "approved", "denied"]),
  userId: z.string().optional(),
  clientName: z.string().optional(),
  createdAt: z.string(),
  expiresAt: z.string(),
});
export type DeviceLogin = z.infer<typeof DeviceLoginSchema>;

/**
 * Which connector an agent may use, and which of its declared actions.
 * This is the scope: callers of the agent can only run these actions.
 */
export const ConnectorScopeSchema = z.object({
  connector: z.string(),
  /** Declared action names callers may run. Empty = every declared action. */
  actions: z.array(z.string()).default([]),
});
export type ConnectorScope = z.infer<typeof ConnectorScopeSchema>;

/**
 * Who can find and use an agent. `public`: listed, anyone can use. `listed`: listed, info open,
 * use needs owner approval. `restricted`: listed and readable only for approved people (anyone
 * else with the link sees the name and can request access). `private`: owner only; invisible.
 */
export const VisibilitySchema = z.enum(["public", "listed", "restricted", "private"]);
export type Visibility = z.infer<typeof VisibilitySchema>;

/** An agent listed in the directory. */
export const AgentSchema = z.object({
  id: z.string(),
  name: z.string().min(2),
  tagline: z.string().max(140),
  description: z.string(),
  /** What job / bottleneck this agent takes off a human's plate. */
  solves: z.array(z.string()),
  /** Tools the agent can operate (Gmail, Linear, Stripe, Notion, ...). */
  tools: z.array(z.string()),
  category: z.string(),
  /** Where to reach it. Hosted agents get `<mcp>/a/<id>/mcp`. */
  endpoint: z.string().url().optional(),
  protocol: z.enum(["mcp", "a2a", "api", "web"]).default("mcp"),
  /** Display name of the owner. */
  owner: z.string(),
  pricing: z.enum(["free", "usage", "subscription", "contact"]).default("free"),
  createdAt: z.string(),

  /**
   * `hosted`: built on Agents Space — instructions + context notes + scoped connector actions,
   * served over MCP at `/a/<id>/mcp`. `external`: a listing that points at someone else's endpoint.
   */
  kind: z.enum(["hosted", "external"]).default("external"),
  visibility: VisibilitySchema.default("public"),
  /**
   * `skill`: for other people's agents to call (the default). `scheduled`: works for its owner
   * on a schedule (see `AgentScheduleSchema`); owner-only, never listed or shared.
   */
  mode: z.enum(["skill", "scheduled"]).default("skill"),
  /** Drafts are only visible to their owner. */
  status: z.enum(["draft", "published"]).default("published"),
  /** User id of the owner (absent for anonymous external listings). */
  ownerId: z.string().optional(),
  /** The skill: how the agent should behave. */
  instructions: z.string().default(""),
  connectors: z.array(ConnectorScopeSchema).default([]),
  /** Name of one of the owner's models (`Model`) that runs it; unset = the platform default. */
  model: z.string().optional(),
});
export type Agent = z.infer<typeof AgentSchema>;

/** Knowledge an agent carries (menu, opening hours, policies, FAQ). Part of its skill. */
export const ContextNoteSchema = z.object({
  agentId: z.string(),
  slug: z.string(),
  title: z.string(),
  /** Markdown. */
  body: z.string(),
  updatedAt: z.string(),
});
export type ContextNote = z.infer<typeof ContextNoteSchema>;

export const TableColumnSchema = z.object({
  name: z.string().regex(/^[a-z][a-z0-9_]{0,39}$/),
  type: z.enum(["text", "number", "boolean", "date", "datetime", "json"]).default("text"),
  description: z.string().default(""),
  required: z.boolean().default(false),
  /**
   * Personal details (name, phone, notes): only the owner and whoever added the row see the value.
   * Other callers see the row with this column left out, e.g. a booked time slot but not who booked it.
   */
  private: z.boolean().optional(),
});
export type TableColumn = z.infer<typeof TableColumnSchema>;

/**
 * What callers of an agent (not its owner) may do with a table's rows.
 * `none` owner only · `insert` add rows · `own` add rows and read/change/delete their own ·
 * `book` add rows, read all rows, change/delete only their own (reservations: everyone sees which
 * slots are taken; private columns stay hidden on other people's rows) ·
 * `read` read all rows · `write` read and change all rows.
 */
export const CallerAccessSchema = z.enum(["none", "insert", "own", "book", "read", "write"]);
export type CallerAccess = z.infer<typeof CallerAccessSchema>;

/** A data table an agent keeps, e.g. reservations or leads. Every hosted agent has `outputs`. */
export const DataTableSchema = z.object({
  agentId: z.string(),
  name: z.string().regex(/^[a-z][a-z0-9_]{0,39}$/),
  title: z.string(),
  /** Markdown: what the table is for and how the agent should use it. Part of the skill. */
  context: z.string().default(""),
  columns: z.array(TableColumnSchema).default([]),
  callerAccess: CallerAccessSchema.default("own"),
  /** True for the default `outputs` table until the owner customises it. */
  builtIn: z.boolean().default(false),
  updatedAt: z.string(),
});
export type DataTable = z.infer<typeof DataTableSchema>;

export const TableRowSchema = z.object({
  id: z.string(),
  agentId: z.string(),
  table: z.string(),
  data: z.record(z.string(), z.unknown()),
  /** User id of whoever added it; absent for anonymous callers. */
  createdBy: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type TableRow = z.infer<typeof TableRowSchema>;

/**
 * Where an agent's LLM comes from. `gateway` = Vercel AI Gateway (any `<vendor>/<model>` id,
 * no key needed); the others call the provider directly with the owner's API key. `custom` is
 * any OpenAI-compatible endpoint (`baseUrl`).
 */
export const ModelProviderSchema = z.enum(["gateway", "openai", "anthropic", "google", "openrouter", "custom"]);
export type ModelProvider = z.infer<typeof ModelProviderSchema>;

/** A model an owner added, named `<handle>-<name>` like connectors. The API key is stored encrypted, never returned. */
export const ModelSchema = z.object({
  name: z.string(),
  ownerId: z.string(),
  title: z.string(),
  provider: ModelProviderSchema,
  /** The provider's model id, e.g. `gpt-5`, `claude-sonnet-5-5`, `deepseek/deepseek-chat` (OpenRouter). */
  model: z.string().min(1),
  baseUrl: z.string().url().optional(),
  hasKey: z.boolean().default(false),
  createdAt: z.string(),
});
export type Model = z.infer<typeof ModelSchema>;

/** When a `scheduled` agent runs by itself, and what it should do each time. */
export const AgentScheduleSchema = z.object({
  id: z.string(),
  agentId: z.string(),
  /** Plain-language task for this run, e.g. "Summarise yesterday's reservations". */
  task: z.string().min(3),
  /** 5-field cron expression (minute hour day month weekday), read in `timezone`. */
  cron: z.string(),
  /** IANA timezone, e.g. "Pacific/Auckland". */
  timezone: z.string().default("UTC"),
  enabled: z.boolean().default(true),
  nextRunAt: z.string(),
  lastRunAt: z.string().optional(),
  lastStatus: z.enum(["ok", "error"]).optional(),
  /** Final answer of the last run, or its error. */
  lastResult: z.string().optional(),
  createdAt: z.string(),
});
export type AgentSchedule = z.infer<typeof AgentScheduleSchema>;

/** One call to a hosted agent: a tool on its MCP server, or a scheduled run. See `logs.ts`. */
export const AgentLogSchema = z.object({
  id: z.string(),
  agentId: z.string(),
  /** Who made the call; unset = anonymous (public agents). */
  callerId: z.string().optional(),
  /** Tool name, e.g. "insert_rows", "gmail__send_email", "scheduled run". */
  tool: z.string(),
  /** The call's inputs, trimmed. */
  args: z.unknown().optional(),
  ok: z.boolean(),
  /** Start of the reply or error, trimmed. */
  result: z.string().default(""),
  durationMs: z.number().int().default(0),
  createdAt: z.string(),
});
export type AgentLog = z.infer<typeof AgentLogSchema>;

export const ActionParamSchema = z.object({
  type: z.enum(["string", "number", "boolean", "object", "array"]).default("string"),
  description: z.string().optional(),
  required: z.boolean().default(false),
});
export type ActionParam = z.infer<typeof ActionParamSchema>;

const actionBase = {
  name: z.string().regex(/^[a-z][a-z0-9_]*$/),
  description: z.string(),
  params: z.record(z.string(), ActionParamSchema).default({}),
};

/**
 * A declarative HTTP call. Strings may contain `{{args.<param>}}` and `{{secret.<NAME>}}`
 * placeholders, filled in at run time. No builder code ever runs on Agents Space.
 */
export const HttpActionSchema = z.object({
  ...actionBase,
  type: z.literal("http"),
  method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]).default("GET"),
  /** Absolute URL; the host must be fixed (no placeholders) and listed in the connector's hosts. */
  url: z.string(),
  query: z.record(z.string(), z.string()).default({}),
  headers: z.record(z.string(), z.string()).default({}),
  /** JSON body template. A string that is exactly one placeholder keeps the arg's type. */
  body: z.unknown().optional(),
});

/** Calls a tool on a remote MCP server (e.g. an existing reviews or booking MCP). */
export const McpActionSchema = z.object({
  ...actionBase,
  type: z.literal("mcp"),
  url: z.string().url(),
  headers: z.record(z.string(), z.string()).default({}),
  /** `list_tools`, or `call_tool` — of a fixed `tool`, or of `args.tool` with `args.arguments`. */
  op: z.enum(["list_tools", "call_tool"]),
  tool: z.string().optional(),
});

/**
 * Runs one Composio tool (e.g. `GMAIL_SEND_EMAIL`) on the connector owner's connected account,
 * with the platform's Composio key. Created by `connect_app`, never by hand.
 */
export const ComposioActionSchema = z.object({
  ...actionBase,
  type: z.literal("composio"),
  tool: z.string().regex(/^[A-Z0-9_]+$/),
});

export const ConnectorActionSchema = z.discriminatedUnion("type", [HttpActionSchema, McpActionSchema, ComposioActionSchema]);
export type ConnectorAction = z.infer<typeof ConnectorActionSchema>;
export type ConnectorActionInput = z.input<typeof ConnectorActionSchema>;

/** A connection to an external system, owned by a user and named `<handle>-<name>`. */
export const ConnectorSchema = z.object({
  name: z.string(),
  ownerId: z.string(),
  title: z.string(),
  description: z.string(),
  /** Every host the actions may call. */
  hosts: z.array(z.string()),
  /** Names of secrets the actions reference. Values are stored encrypted and never returned. */
  secrets: z.array(z.string()),
  actions: z.array(ConnectorActionSchema),
  createdAt: z.string(),
});
export type Connector = z.infer<typeof ConnectorSchema>;

export const AccessRequestSchema = z.object({
  id: z.string(),
  agentId: z.string(),
  requesterId: z.string(),
  message: z.string().default(""),
  status: z.enum(["pending", "approved", "denied"]),
  createdAt: z.string(),
  decidedAt: z.string().optional(),
});
export type AccessRequest = z.infer<typeof AccessRequestSchema>;

/** Something an agent charges for (e.g. a dental cleaning), paid through the owner's Stripe account. */
export const PriceSchema = z.object({
  agentId: z.string(),
  /** Slug callers pass to request_payment, e.g. `cleaning`. */
  name: z.string().regex(/^[a-z0-9][a-z0-9-]*$/),
  title: z.string(),
  description: z.string().default(""),
  /** In the currency's smallest unit (cents / centavos). */
  amount: z.number().int().positive(),
  /** Lowercase ISO code, e.g. `mxn`, `usd`. */
  currency: z.string().regex(/^[a-z]{3}$/),
  updatedAt: z.string(),
});
export type Price = z.infer<typeof PriceSchema>;

/** A checkout link one caller got for one price. Paid out to the agent owner (Stripe destination charge). */
export const PaymentSchema = z.object({
  id: z.string(),
  agentId: z.string(),
  price: z.string(),
  /** Who asked for the link; absent for anonymous callers of a public agent. */
  payerId: z.string().optional(),
  amount: z.number().int(),
  currency: z.string(),
  /** What it's for, e.g. "Cleaning, Tue Oct 7 10:00". Shown on the checkout page. */
  note: z.string().default(""),
  stripeSessionId: z.string(),
  url: z.string(),
  status: z.enum(["open", "paid", "expired"]),
  createdAt: z.string(),
  paidAt: z.string().optional(),
});
export type Payment = z.infer<typeof PaymentSchema>;

/** A human explaining how they are the bottleneck. */
export const BottleneckSchema = z.object({
  id: z.string(),
  /** Who / what role, e.g. "Founder at a 6-person agency". */
  role: z.string(),
  /** Plain-language description of the work only they can unblock today. */
  description: z.string().min(10),
  /** Tools they currently use for this work. */
  tools: z.array(z.string()),
  /** Rough hours per week lost to it. */
  hoursPerWeek: z.number().min(0).max(168).optional(),
  /** Agent ids matched at submission time. */
  matchedAgentIds: z.array(z.string()),
  createdAt: z.string(),
});
export type Bottleneck = z.infer<typeof BottleneckSchema>;

export const NewAgentInput = AgentSchema.omit({ id: true, createdAt: true });
export type NewAgentInput = z.input<typeof NewAgentInput>;

export const NewBottleneckInput = BottleneckSchema.omit({
  id: true,
  createdAt: true,
  matchedAgentIds: true,
});
export type NewBottleneckInput = z.infer<typeof NewBottleneckInput>;
