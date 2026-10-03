import type { createMcpHandler } from "mcp-handler";
import { z } from "zod";
import { store, addSchedule, describeSchedule, removeSchedule, runSchedule, updateSchedule } from "@agents-space/core";
import { requireUser } from "@/lib/auth";
import { safe, text } from "@/lib/format";

type Server = Parameters<Parameters<typeof createMcpHandler>[0]>[0];

async function ownedAgent(id: string, userId: string) {
  const a = await store.getAgent(id);
  if (!a || a.ownerId !== userId) throw new Error(`You don't own an agent "${id}". See my_agents.`);
  return a;
}

const cron = z
  .string()
  .describe('5-field cron (minute hour day month weekday) in `timezone`, e.g. "0 8 * * *" daily 8am, "0 8 * * 1-5" weekdays 8am, "30 17 * * 5" Fridays 5:30pm. At least 15 minutes apart.');
const timezone = z.string().describe('IANA timezone of the owner, e.g. "Pacific/Auckland", "America/New_York". Ask if unsure.');

/** Owner tools for scheduled agents: agents that run by themselves for their owner. */
export function registerScheduleTools(server: Server) {
  server.registerTool(
    "schedule_agent",
    {
      title: "Schedule an agent",
      description:
        "Make one of your scheduled agents (mode \"scheduled\") run by itself at set times, for you. Each run follows the agent's instructions and context, uses its connector actions and tables, and leaves a report in its 'outputs' table (see schedule_runs). Skills for other people's agents (mode \"skill\") can't be scheduled.",
      inputSchema: z.object({
        agent_id: z.string(),
        task: z.string().min(3).describe("What to do each run, in plain words, e.g. 'Check new leads and draft replies'"),
        cron,
        timezone: timezone.default("UTC"),
      }),
    },
    safe(async ({ agent_id, ...spec }, ctx) => {
      const user = await requireUser(ctx);
      const a = await ownedAgent(agent_id, user.id);
      const s = await addSchedule(a, spec);
      return text(`Scheduled ${a.name}:\n${describeSchedule(s)}\n\nTry it now with run_schedule_now; see results with schedule_runs.`);
    }),
  );

  server.registerTool(
    "list_schedules",
    {
      title: "List an agent's schedules",
      description: "When your scheduled agent runs, its next run and how the last one went.",
      inputSchema: z.object({ agent_id: z.string() }),
    },
    safe(async ({ agent_id }, ctx) => {
      const user = await requireUser(ctx);
      const a = await ownedAgent(agent_id, user.id);
      const ss = await store.listSchedules(a.id);
      return text(ss.map(describeSchedule).join("\n") || `${a.name} has no schedules. Add one with schedule_agent.`);
    }),
  );

  server.registerTool(
    "update_schedule",
    {
      title: "Change a schedule",
      description: "Change a schedule's task or timing, or pause / resume it (enabled false / true).",
      inputSchema: z.object({
        agent_id: z.string(),
        schedule_id: z.string(),
        task: z.string().min(3).optional(),
        cron: cron.optional(),
        timezone: timezone.optional(),
        enabled: z.boolean().optional(),
      }),
    },
    safe(async ({ agent_id, schedule_id, ...patch }, ctx) => {
      const user = await requireUser(ctx);
      const a = await ownedAgent(agent_id, user.id);
      const clean = Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined));
      return text(`Updated.\n${describeSchedule(await updateSchedule(a, schedule_id, clean))}`);
    }),
  );

  server.registerTool(
    "delete_schedule",
    { title: "Delete a schedule", description: "Stop and remove one of an agent's schedules.", inputSchema: z.object({ agent_id: z.string(), schedule_id: z.string() }) },
    safe(async ({ agent_id, schedule_id }, ctx) => {
      const user = await requireUser(ctx);
      const a = await ownedAgent(agent_id, user.id);
      await removeSchedule(a, schedule_id);
      return text(`Deleted schedule ${schedule_id} from ${a.name}.`);
    }),
  );

  server.registerTool(
    "run_schedule_now",
    {
      title: "Run a schedule now",
      description: "Run one of your agent's schedules immediately (doesn't change its next run). Returns the agent's report. Takes up to a few minutes.",
      inputSchema: z.object({ agent_id: z.string(), schedule_id: z.string() }),
    },
    safe(async ({ agent_id, schedule_id }, ctx) => {
      const user = await requireUser(ctx);
      const a = await ownedAgent(agent_id, user.id);
      const s = await store.getSchedule(schedule_id);
      if (!s || s.agentId !== a.id) throw new Error(`${a.name} has no schedule "${schedule_id}".`);
      const r = await runSchedule(s);
      return text(`${r.status === "ok" ? "Done" : "Failed"} (${r.steps} step(s)).\n\n${r.result}`);
    }),
  );

  server.registerTool(
    "schedule_runs",
    {
      title: "Recent scheduled runs",
      description: "Reports from your scheduled agent's recent runs, newest first.",
      inputSchema: z.object({ agent_id: z.string(), limit: z.number().int().min(1).max(50).default(10) }),
    },
    safe(async ({ agent_id, limit }, ctx) => {
      const user = await requireUser(ctx);
      const a = await ownedAgent(agent_id, user.id);
      const rows = await store.queryRows(a.id, "outputs", { where: { kind: "scheduled_run" }, limit });
      return text(
        rows.map((r) => `• ${r.createdAt}: ${String((r.data.data as { result?: string } | undefined)?.result ?? r.data.summary ?? "").slice(0, 1500)}`).join("\n\n") ||
          `No runs yet. Try run_schedule_now.`,
      );
    }),
  );
}
