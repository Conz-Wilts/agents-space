import { z } from "zod";

/** An agent listed in the public directory. */
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
  /** Where to reach it: MCP server URL, API endpoint, or website. */
  endpoint: z.string().url().optional(),
  protocol: z.enum(["mcp", "a2a", "api", "web"]).default("mcp"),
  owner: z.string(),
  pricing: z.enum(["free", "usage", "subscription", "contact"]).default("free"),
  createdAt: z.string(),
});
export type Agent = z.infer<typeof AgentSchema>;

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
export type NewAgentInput = z.infer<typeof NewAgentInput>;

export const NewBottleneckInput = BottleneckSchema.omit({
  id: true,
  createdAt: true,
  matchedAgentIds: true,
});
export type NewBottleneckInput = z.infer<typeof NewBottleneckInput>;
