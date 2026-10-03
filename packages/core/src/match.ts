import type { Agent } from "./schema";

const words = (s: string) =>
  s.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 2);

/**
 * Naive keyword scoring: tool overlap is weighted highest, then "solves" terms,
 * then free-text overlap. Swap for embeddings later (see docs/memory/decisions.md).
 */
export function scoreAgent(agent: Agent, query: string, tools: string[] = []): number {
  const q = new Set(words(query));
  const userTools = new Set(tools.map((x) => x.toLowerCase()));
  let score = 0;
  for (const tool of agent.tools) if (userTools.has(tool.toLowerCase()) || q.has(tool.toLowerCase())) score += 3;
  for (const s of agent.solves) for (const w of words(s)) if (q.has(w)) score += 2;
  for (const w of words(`${agent.name} ${agent.tagline} ${agent.description} ${agent.category}`)) if (q.has(w)) score += 0.5;
  return score;
}

export function matchAgents(agents: Agent[], query: string, tools: string[] = [], limit = 5) {
  return agents
    .map((agent) => ({ agent, score: scoreAgent(agent, query, tools) }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
