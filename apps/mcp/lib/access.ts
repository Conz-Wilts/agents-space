import { store, type Agent } from "@agents-space/core";

/**
 * The agent, unless the viewer can't learn it exists: unknown, draft or `private`, and not theirs.
 * Those cases must be indistinguishable from a made-up id. A `restricted` agent is returned
 * (its name and "request access" are public), so check `store.canSeeInfo` before revealing more.
 */
export async function reachable(id: string, userId?: string): Promise<Agent | undefined> {
  const a = await store.getAgent(id);
  if (!a) return undefined;
  if (userId && a.ownerId === userId) return a;
  return a.status === "published" && a.visibility !== "private" ? a : undefined;
}
