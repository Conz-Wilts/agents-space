import { createMcpHandler } from "mcp-handler";
import { z } from "zod";
import { store, matchAgents, type Agent } from "@agents-space/core";

const fmt = (a: Agent) =>
  `• ${a.name} (${a.id}) — ${a.tagline}\n  tools: ${a.tools.join(", ")} | protocol: ${a.protocol} | pricing: ${a.pricing}${a.endpoint ? `\n  endpoint: ${a.endpoint}` : ""}`;

const text = (t: string) => ({ content: [{ type: "text" as const, text: t }] });

const handler = createMcpHandler(
  (server) => {
    server.registerTool(
      "describe_bottleneck",
      {
        title: "Describe your bottleneck",
        description:
          "A human explains the work where THEY are the bottleneck (what only they can unblock), and the tools they use. Returns agents from the directory that could take it off their plate.",
        inputSchema: z.object({
          role: z.string().describe("Who you are, e.g. 'Founder of a 5-person agency'"),
          description: z.string().min(10).describe("What work waits on you, and why"),
          tools: z.array(z.string()).default([]).describe("Tools you use for this work, e.g. ['Gmail','Stripe']"),
          hoursPerWeek: z.number().min(0).max(168).optional().describe("Rough hours per week this costs you"),
        }),
      },
      async (input) => {
        const b = await store.addBottleneck(input);
        const agents = (await Promise.all(b.matchedAgentIds.map((id) => store.getAgent(id)))).filter(
          (a): a is Agent => !!a,
        );
        if (!agents.length)
          return text(
            `Logged bottleneck ${b.id}. No agents match yet — this is a gap in the directory. Builders can fill it with register_agent.`,
          );
        return text(`Logged bottleneck ${b.id}. Agents that could unblock you:\n\n${agents.map(fmt).join("\n\n")}`);
      },
    );

    server.registerTool(
      "search_agents",
      {
        title: "Search the agent directory",
        description: "Find agents by job-to-be-done and/or the tools they operate.",
        inputSchema: z.object({
          query: z.string().describe("What you need done"),
          tools: z.array(z.string()).default([]),
          limit: z.number().int().min(1).max(25).default(5),
        }),
      },
      async ({ query, tools, limit }) => {
        const results = matchAgents(await store.listAgents(), query, tools, limit);
        return text(results.length ? results.map((r) => fmt(r.agent)).join("\n\n") : "No matching agents.");
      },
    );

    server.registerTool(
      "list_agents",
      {
        title: "List agents",
        description: "List every agent in the public directory, optionally filtered by category.",
        inputSchema: z.object({ category: z.string().optional() }),
      },
      async ({ category }) => text((await store.listAgents({ category })).map(fmt).join("\n\n") || "Directory is empty."),
    );

    server.registerTool(
      "get_agent",
      {
        title: "Get agent",
        description: "Full details for one agent by id.",
        inputSchema: z.object({ id: z.string() }),
      },
      async ({ id }) => {
        const a = await store.getAgent(id);
        return text(a ? JSON.stringify(a, null, 2) : `No agent with id "${id}".`);
      },
    );

    server.registerTool(
      "register_agent",
      {
        title: "Register an agent",
        description: "List your agent in the public Agents Space directory so humans (and other agents) can discover it.",
        inputSchema: z.object({
          name: z.string().min(2),
          tagline: z.string().max(140),
          description: z.string(),
          solves: z.array(z.string()).min(1).describe("Jobs / bottlenecks it removes"),
          tools: z.array(z.string()).default([]),
          category: z.string(),
          endpoint: z.string().url().optional(),
          protocol: z.enum(["mcp", "a2a", "api", "web"]).default("mcp"),
          owner: z.string(),
          pricing: z.enum(["free", "usage", "subscription", "contact"]).default("free"),
        }),
      },
      async (input) => {
        const a = await store.addAgent(input);
        return text(`Registered "${a.name}" as ${a.id}.\n\n${fmt(a)}`);
      },
    );
  },
  { serverInfo: { name: "agents-space", version: "0.1.0" } },
);

export { handler as GET, handler as POST, handler as DELETE };
