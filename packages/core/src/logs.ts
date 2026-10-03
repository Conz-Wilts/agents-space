import type { Agent, AgentLog } from "./schema";
import { store } from "./store";

/** How long logs are kept; the schedules cron prunes older ones. */
export const LOG_RETENTION_DAYS = 30;
export const MAX_LOGS = 100;
const MAX_TEXT = 2000;

/** Trim a call's inputs for storage: small values stay JSON, big ones become a cut string. */
function trimArgs(args: unknown): unknown {
  if (args === undefined || args === null) return undefined;
  const json = JSON.stringify(args);
  if (json === undefined || json === "{}") return undefined;
  return json.length <= MAX_TEXT ? args : `${json.slice(0, MAX_TEXT)}…`;
}

/**
 * Record one call to an agent. Never throws: a failed log must not fail the call it describes.
 * Connector secrets never reach here (`runAgentAction` redacts them from results; they are never args).
 */
export async function recordCall(e: { agentId: string; callerId?: string; tool: string; args?: unknown; ok: boolean; result?: string; durationMs?: number }) {
  try {
    await store.addLog({
      agentId: e.agentId,
      callerId: e.callerId,
      tool: e.tool.slice(0, 120),
      args: trimArgs(e.args),
      ok: e.ok,
      result: (e.result ?? "").slice(0, MAX_TEXT),
      durationMs: Math.max(0, Math.round(e.durationMs ?? 0)),
    });
  } catch (err) {
    console.warn("[logs] record", e.agentId, e.tool, err instanceof Error ? err.message : err);
  }
}

/**
 * The logs `viewerId` may see. The owner sees every call (optionally one caller's, via `caller`);
 * anyone else only the calls they made themselves, never other people's, whatever the agent's
 * visibility. Anonymous viewers see nothing (anonymous calls are the owner's to read).
 */
export async function agentLogs(agent: Agent, viewerId: string | undefined, opts: { caller?: string; limit?: number } = {}): Promise<AgentLog[]> {
  if (!viewerId) return [];
  const limit = Math.min(Math.max(1, opts.limit ?? MAX_LOGS), MAX_LOGS);
  const owner = !!agent.ownerId && agent.ownerId === viewerId;
  return store.listLogs(agent.id, { callerId: owner ? opts.caller : viewerId, limit });
}

/** Drop logs past the retention window. */
export const pruneLogs = (now = new Date()) => store.pruneLogs(new Date(now.getTime() - LOG_RETENTION_DAYS * 86_400_000).toISOString());

/** One log entry as text, for MCP. `who` is the caller's handle (owner view only). */
export function describeLog(l: AgentLog, who?: string) {
  const head = `• ${l.createdAt} ${l.ok ? "ok" : "ERROR"} ${l.tool}${who ? ` by ${who}` : ""} (${l.durationMs} ms)`;
  const args = l.args === undefined ? "" : `\n  input: ${(typeof l.args === "string" ? l.args : JSON.stringify(l.args)).slice(0, 300)}`;
  const result = l.result ? `\n  ${l.ok ? "result" : "error"}: ${l.result.slice(0, 300).replace(/\s+/g, " ")}` : "";
  return head + args + result;
}
