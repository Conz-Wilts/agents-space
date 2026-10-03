import { agentLogs, describeLog, recordCall, store, type Agent } from "@agents-space/core";
import { fail, type text } from "@/lib/format";

type Ctx = { http?: { authInfo?: { clientId?: string } } };
type Reply = ReturnType<typeof text> | ReturnType<typeof fail>;

/**
 * Like `safe`, and also logs the call against the agent it touched (`agentIdOf(args)`), so the
 * owner sees every call and each caller their own (see `agentLogs` in core). Only for tools
 * other people's agents use on an agent, not the owner's build tools.
 */
export const logged =
  <A extends object>(tool: string | ((args: A) => string), agentIdOf: (args: A) => string, fn: (args: A, ctx: Ctx) => Promise<ReturnType<typeof text>>) =>
  async (args: A, ctx: Ctx): Promise<Reply> => {
    const started = Date.now();
    let reply: Reply;
    try {
      reply = await fn(args, ctx);
    } catch (e) {
      reply = fail(e);
    }
    await recordCall({
      agentId: agentIdOf(args),
      callerId: ctx.http?.authInfo?.clientId,
      tool: typeof tool === "string" ? tool : tool(args),
      args: "agent_id" in args ? Object.fromEntries(Object.entries(args).filter(([k]) => k !== "agent_id")) : args,
      ok: !("isError" in reply && reply.isError),
      result: reply.content[0]?.text,
      durationMs: Date.now() - started,
    });
    return reply;
  };

/**
 * `agent_logs` text: the owner gets every call (or one caller's, by handle) with who made it;
 * anyone else only their own calls. The rule itself lives in `agentLogs`.
 */
export async function logsText(agent: Agent, viewerId: string | undefined, opts: { caller?: string; limit?: number }) {
  if (!viewerId) return "Sign in to see your calls to this agent.";
  const owner = agent.ownerId === viewerId;
  let caller: string | undefined;
  if (owner && opts.caller) {
    const u = await store.userByHandle(opts.caller.trim().replace(/^@/, ""));
    if (!u) return `No user "${opts.caller}".`;
    caller = u.id;
  }
  const logs = await agentLogs(agent, viewerId, { caller, limit: opts.limit });
  if (!logs.length) return owner ? `No calls to ${agent.name} yet.` : `You haven't called ${agent.name} yet.`;
  const ids = owner ? [...new Set(logs.map((l) => l.callerId).filter((x): x is string => !!x))] : [];
  const handles = new Map(await Promise.all(ids.map(async (id) => [id, `@${(await store.getUser(id))?.handle ?? "?"}`] as const)));
  const head = owner ? `Calls to ${agent.name}, newest first (${logs.length}):` : `Your calls to ${agent.name}, newest first (${logs.length}):`;
  return [head, ...logs.map((l) => describeLog(l, owner ? (l.callerId ? handles.get(l.callerId) : "anonymous") : undefined))].join("\n");
}
