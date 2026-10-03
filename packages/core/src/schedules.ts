import { ToolLoopAgent, isStepCount, tool, type LanguageModel, type ToolSet } from "ai";
import { CronExpressionParser } from "cron-parser";
import { z } from "zod";
import { store } from "./store";
import { actionInputSchema, loadSkill, runAgentAction, scopedActions } from "./agents";
import { agentLanguageModel } from "./models";
import { recordCall } from "./logs";
import { OUTPUTS_TABLE, actorFor, agentTables, deleteRow, insertRows, queryRows, updateRow } from "./tables";
import type { Agent, AgentSchedule } from "./schema";

/**
 * Scheduled agents work for their owner instead of answering other people's agents. Each
 * schedule is a cron expression (in the owner's timezone) plus a plain-language task. A cron
 * route calls `runDueSchedules` every minute; each due run is an LLM loop (AI Gateway) over the
 * agent's own skill, scoped connector actions and data tables, acting as the owner. The final
 * report lands in the schedule (`lastResult`) and as a row in the agent's `outputs` table.
 */

const MAX_SCHEDULES = 10;
/** Cost guard: runs at least this far apart. */
const MIN_INTERVAL_MS = 15 * 60_000;
const MAX_STEPS = 15;

function checkTimezone(tz: string) {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
  } catch {
    throw new Error(`Unknown timezone "${tz}". Use an IANA name like "Pacific/Auckland" or "America/New_York".`);
  }
}

/** The next run after `from`, as ISO. Throws on a bad expression. */
export function nextRunAt(cron: string, timezone: string, from = new Date()): string {
  return CronExpressionParser.parse(cron, { currentDate: from, tz: timezone }).next().toDate().toISOString();
}

function checkCron(cron: string, timezone: string) {
  checkTimezone(timezone);
  if (cron.trim().split(/\s+/).length !== 5) throw new Error(`Use a 5-field cron expression (minute hour day month weekday), e.g. "0 8 * * 1-5" for 8am on weekdays.`);
  let it;
  try {
    it = CronExpressionParser.parse(cron, { tz: timezone });
  } catch (e) {
    throw new Error(`Bad cron expression "${cron}": ${e instanceof Error ? e.message : e}`);
  }
  const [a, b] = [it.next().getTime(), it.next().getTime()];
  if (b - a < MIN_INTERVAL_MS) throw new Error("Scheduled runs must be at least 15 minutes apart.");
}

/** "every day at 08:00 (Pacific/Auckland) · next Sat 4 Oct, 08:00" style line for owners. */
export function describeSchedule(s: AgentSchedule) {
  const next = new Date(s.nextRunAt).toLocaleString("en-GB", { timeZone: s.timezone, weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  const last = s.lastRunAt ? `\n  last run ${s.lastRunAt} (${s.lastStatus}): ${(s.lastResult ?? "").slice(0, 300)}` : "";
  return `• ${s.id} — "${s.task}"\n  cron ${s.cron} (${s.timezone}) · ${s.enabled ? `next ${next}` : "paused"}${last}`;
}

function scheduledOnly(agent: Agent) {
  if (agent.kind !== "hosted") throw new Error("Only hosted agents can run on a schedule.");
  if (agent.mode !== "scheduled")
    throw new Error(`${agent.name} is a skill for other people's agents. To have it run for you on a schedule, update_agent mode "scheduled" first.`);
}

export async function addSchedule(agent: Agent, spec: { task: string; cron: string; timezone?: string }): Promise<AgentSchedule> {
  scheduledOnly(agent);
  const timezone = spec.timezone || "UTC";
  checkCron(spec.cron, timezone);
  if ((await store.listSchedules(agent.id)).length >= MAX_SCHEDULES) throw new Error(`An agent can have at most ${MAX_SCHEDULES} schedules.`);
  return store.addSchedule({ agentId: agent.id, task: spec.task, cron: spec.cron.trim(), timezone, enabled: true, nextRunAt: nextRunAt(spec.cron, timezone) });
}

export async function updateSchedule(agent: Agent, id: string, patch: { task?: string; cron?: string; timezone?: string; enabled?: boolean }) {
  const s = await store.getSchedule(id);
  if (!s || s.agentId !== agent.id) throw new Error(`${agent.name} has no schedule "${id}".`);
  const cron = patch.cron ?? s.cron;
  const timezone = patch.timezone ?? s.timezone;
  const timing = patch.cron !== undefined || patch.timezone !== undefined || (patch.enabled && !s.enabled);
  if (timing) checkCron(cron, timezone);
  return store.updateSchedule(id, { ...patch, cron, timezone, ...(timing ? { nextRunAt: nextRunAt(cron, timezone) } : {}) });
}

export async function removeSchedule(agent: Agent, id: string) {
  const s = await store.getSchedule(id);
  if (!s || s.agentId !== agent.id) throw new Error(`${agent.name} has no schedule "${id}".`);
  return store.deleteSchedule(id);
}

/** The agent's tools for a run: its scoped actions plus its tables, all acting as the owner. */
async function runTools(agent: Agent): Promise<ToolSet> {
  const actor = actorFor(agent, agent.ownerId);
  const tables = (await agentTables(agent)).map((t) => t.name);
  const tableName = z.enum(tables as [string, ...string[]]);
  const tools: ToolSet = {
    insert_rows: tool({
      description: "Add rows to one of your data tables.",
      inputSchema: z.object({ table: tableName, rows: z.array(z.record(z.string(), z.unknown())).min(1).max(50) }),
      execute: async ({ table, rows }) => (await insertRows(agent, table, actor, rows)).map((r) => ({ id: r.id, ...r.data })),
    }),
    query_rows: tool({
      description: "Read rows from one of your data tables, newest first. Filter by exact column values.",
      inputSchema: z.object({ table: tableName, where: z.record(z.string(), z.unknown()).default({}), limit: z.number().int().min(1).max(200).default(50) }),
      execute: async ({ table, where, limit }) => (await queryRows(agent, table, actor, { where, limit })).map((r) => ({ id: r.id, created_at: r.createdAt, ...r.data })),
    }),
    update_row: tool({
      description: "Change fields of one row by id; null clears a field.",
      inputSchema: z.object({ table: tableName, row_id: z.string(), values: z.record(z.string(), z.unknown()) }),
      execute: async ({ table, row_id, values }) => (await updateRow(agent, table, actor, row_id, values)).data,
    }),
    delete_row: tool({
      description: "Delete one row by id.",
      inputSchema: z.object({ table: tableName, row_id: z.string() }),
      execute: async ({ table, row_id }) => (await deleteRow(agent, table, actor, row_id), { deleted: row_id }),
    }),
  };
  for (const a of await scopedActions(agent))
    tools[`${a.connector}__${a.action}`.slice(0, 64)] = tool({
      description: a.description,
      inputSchema: actionInputSchema(a.params),
      execute: async (args) => runAgentAction(agent, a.connector, a.action, args as Record<string, unknown>),
    });
  return tools;
}

export type RunResult = { status: "ok" | "error"; result: string; steps: number };

/** Run one schedule now (cron tick or the owner's "run now"). Records the result either way. */
export async function runSchedule(s: AgentSchedule, opts: { model?: LanguageModel } = {}): Promise<RunResult> {
  const startedAt = new Date();
  let out: RunResult;
  const agent = await store.getAgent(s.agentId);
  try {
    if (!agent) throw new Error("Agent no longer exists.");
    scheduledOnly(agent);
    const owner = agent.ownerId ? await store.getUser(agent.ownerId) : undefined;
    if (!owner) throw new Error("Agent has no owner.");
    const localNow = startedAt.toLocaleString("en-GB", { timeZone: s.timezone, dateStyle: "full", timeStyle: "short" });
    const runner = new ToolLoopAgent({
      model: opts.model ?? (await agentLanguageModel(agent)).model,
      instructions: [
        await loadSkill(agent),
        `## This run\n\nYou are running on a schedule for your owner, @${owner.handle}. Nobody is chatting with you: do the task with your tools, then reply with a short report for the owner (what you did, what you found, anything that needs them). It is ${localNow} (${s.timezone}).`,
      ].join("\n\n"),
      tools: await runTools(agent),
      stopWhen: isStepCount(MAX_STEPS),
    });
    const r = await runner.generate({ prompt: s.task });
    out = { status: "ok", result: r.text.trim() || "(no report)", steps: r.steps.length };
  } catch (e) {
    // Provider errors come with terminal colours.
    out = { status: "error", result: (e instanceof Error ? e.message : String(e)).replace(/\x1b\[[0-9;]*m/g, "").trim(), steps: 0 };
  }

  await store.updateSchedule(s.id, { lastRunAt: startedAt.toISOString(), lastStatus: out.status, lastResult: out.result.slice(0, 8000) });
  if (agent)
    await recordCall({ agentId: agent.id, callerId: agent.ownerId, tool: "scheduled run", args: { task: s.task }, ok: out.status === "ok", result: out.result, durationMs: Date.now() - startedAt.getTime() });
  if (agent?.ownerId)
    try {
      await insertRows(agent, OUTPUTS_TABLE, actorFor(agent, agent.ownerId), [
        { kind: "scheduled_run", summary: `${out.status === "error" ? "Failed: " : ""}${out.result.slice(0, 280)}`, data: { schedule_id: s.id, task: s.task, ...out } },
      ]);
    } catch (e) {
      // A customised outputs table may not take these fields; lastResult still has the report.
      console.warn("[schedule] outputs row", s.id, e instanceof Error ? e.message : e);
    }
  return out;
}

/** Called by the cron route: claims every due schedule (once, even with overlapping ticks) and runs them. */
export async function runDueSchedules(limit = 10) {
  const now = new Date();
  const due = await store.dueSchedules(now.toISOString(), limit);
  const runs = await Promise.all(
    due.map(async (s) => {
      let next: string;
      try {
        next = nextRunAt(s.cron, s.timezone, now);
      } catch {
        await store.updateSchedule(s.id, { enabled: false, lastStatus: "error", lastResult: "Invalid cron expression; schedule paused." });
        return undefined;
      }
      if (!(await store.claimSchedule(s.id, s.nextRunAt, next))) return undefined;
      return { id: s.id, ...(await runSchedule(s)) };
    }),
  );
  return runs.filter((r) => !!r);
}
