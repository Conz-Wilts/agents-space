import { seedAgents } from "./seed";
import { matchAgents } from "./match";
import type { Agent, Bottleneck, NewAgentInput, NewBottleneckInput } from "./schema";

/**
 * Storage interface. First build = in-memory (resets on cold start, NOT shared
 * between the web and mcp deployments). Replace with a DB-backed implementation
 * (Neon Postgres / Upstash Redis via Vercel Marketplace) behind the same interface.
 */
export interface Store {
  listAgents(opts?: { query?: string; category?: string }): Promise<Agent[]>;
  getAgent(id: string): Promise<Agent | undefined>;
  addAgent(input: NewAgentInput): Promise<Agent>;
  listBottlenecks(): Promise<Bottleneck[]>;
  addBottleneck(input: NewBottleneckInput): Promise<Bottleneck>;
}

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

function createMemoryStore(): Store {
  const agents = new Map(seedAgents.map((a) => [a.id, a]));
  const bottlenecks: Bottleneck[] = [];

  return {
    async listAgents({ query, category } = {}) {
      let all = [...agents.values()];
      if (category) all = all.filter((a) => a.category.toLowerCase() === category.toLowerCase());
      if (query) return matchAgents(all, query, [], all.length).map((r) => r.agent);
      return all;
    },
    async getAgent(id) {
      return agents.get(id);
    },
    async addAgent(input) {
      let id = slug(input.name) || crypto.randomUUID();
      if (agents.has(id)) id = `${id}-${crypto.randomUUID().slice(0, 6)}`;
      const agent: Agent = { ...input, id, createdAt: new Date().toISOString() };
      agents.set(id, agent);
      return agent;
    },
    async listBottlenecks() {
      return [...bottlenecks].reverse();
    },
    async addBottleneck(input) {
      const matches = matchAgents([...agents.values()], input.description, input.tools);
      const b: Bottleneck = {
        ...input,
        id: crypto.randomUUID(),
        matchedAgentIds: matches.map((m) => m.agent.id),
        createdAt: new Date().toISOString(),
      };
      bottlenecks.push(b);
      return b;
    },
  };
}

// Survive Next.js dev hot reloads.
const g = globalThis as unknown as { __agentsSpaceStore?: Store };
export const store: Store = (g.__agentsSpaceStore ??= createMemoryStore());
