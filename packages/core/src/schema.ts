import { z } from "zod";

/** A person (or org) on the platform. Authenticates to the MCP with an API key. */
export const UserSchema = z.object({
  id: z.string(),
  handle: z.string().regex(/^[a-z0-9-]{2,32}$/),
  /** sha256 of the API key. The key itself is shown once and never stored. */
  keyHash: z.string(),
  createdAt: z.string(),
});
export type User = z.infer<typeof UserSchema>;

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
  /** `public`: anyone can use it. `private`: listed, but use requires owner approval. */
  visibility: z.enum(["public", "private"]).default("public"),
  /** Drafts are only visible to their owner. */
  status: z.enum(["draft", "published"]).default("published"),
  /** User id of the owner (absent for seed listings). */
  ownerId: z.string().optional(),
  /** The skill: how the agent should behave. */
  instructions: z.string().default(""),
  connectors: z.array(ConnectorScopeSchema).default([]),
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

export const ConnectorActionSchema = z.discriminatedUnion("type", [HttpActionSchema, McpActionSchema]);
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
