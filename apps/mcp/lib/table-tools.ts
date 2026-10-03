import type { createMcpHandler } from "mcp-handler";
import { z } from "zod";
import {
  store,
  actorFor,
  agentTables,
  deleteRow,
  describeTable,
  getTable,
  insertRows,
  queryRows,
  updateRow,
  viewRows,
  MAX_INSERT,
  MAX_QUERY,
} from "@agents-space/core";
import { currentUser } from "@/lib/auth";
import { text } from "@/lib/format";
import { logged } from "@/lib/logged";

type Server = Parameters<Parameters<typeof createMcpHandler>[0]>[0];
type Ctx = Parameters<typeof currentUser>[0];

const json = (v: unknown) => text(JSON.stringify(v, null, 2).slice(0, 20000));

/** The agent and who is acting, re-checking access on every call. */
async function resolve(agentId: string, ctx: Ctx) {
  const user = await currentUser(ctx);
  const agent = await store.getAgent(agentId);
  if (!agent || !(await store.hasAccess(agent.id, user?.id))) throw new Error(`No access to "${agentId}".`);
  if (agent.kind !== "hosted") throw new Error(`${agent.name} is an external agent; it has no tables here.`);
  return { agent, actor: actorFor(agent, user?.id) };
}

/**
 * Row tools for an agent's data tables. On the main server (`agentId` unset) every tool takes
 * `agent_id`; on a per-agent server it's fixed. Access per table is enforced in core.
 */
export function registerRowTools(server: Server, agentId?: string) {
  // One static shape for typing; on a per-agent server the field is simply absent.
  const idShape = (agentId ? {} : { agent_id: z.string() }) as { agent_id: z.ZodString };
  const idOf = (a: { agent_id?: string }) => agentId ?? a.agent_id ?? "";
  const table = z.string().describe("Table name, e.g. 'outputs' or 'reservations'");

  server.registerTool(
    "list_tables",
    {
      title: "List data tables",
      description: "The agent's data tables: columns, what each is for, and what you may do with it. Every agent has a built-in 'outputs' table.",
      inputSchema: z.object(idShape),
    },
    logged("list_tables", idOf, async (args: { agent_id?: string }, ctx) => {
      const { agent, actor } = await resolve(idOf(args), ctx);
      const tables = (await agentTables(agent)).filter((t) => actor.owner || t.callerAccess !== "none");
      const parts = await Promise.all(
        tables.map(async (t) => describeTable(t, actor.owner ? { rows: await store.countRows(agent.id, t.name) } : {})),
      );
      return text(parts.join("\n\n") || `${agent.name} has no tables you can use.`);
    }),
  );

  server.registerTool(
    "insert_rows",
    {
      title: "Add rows to a table",
      description: `Add up to ${MAX_INSERT} rows to one of the agent's tables (e.g. a reservation, a lead, an output). Values are checked against the columns. Returns the new row ids.`,
      inputSchema: z.object({
        ...idShape,
        table,
        rows: z.array(z.record(z.string(), z.unknown())).min(1).max(MAX_INSERT).describe("Objects keyed by column name"),
      }),
    },
    logged("insert_rows", idOf, async (args: { agent_id?: string; table: string; rows: Record<string, unknown>[] }, ctx) => {
      const { agent, actor } = await resolve(idOf(args), ctx);
      const rows = await insertRows(agent, args.table, actor, args.rows);
      return json({ inserted: rows.length, rows: await viewRows(await getTable(agent, args.table), rows, actor) });
    }),
  );

  server.registerTool(
    "query_rows",
    {
      title: "Look up rows",
      description: `Read rows from one of the agent's tables, newest first. Filter by exact column values. Max ${MAX_QUERY} per call.`,
      inputSchema: z.object({
        ...idShape,
        table,
        where: z.record(z.string(), z.unknown()).default({}).describe("Exact matches, e.g. {\"date\": \"2026-10-04\", \"status\": \"confirmed\"}"),
        limit: z.number().int().min(1).max(MAX_QUERY).default(50),
        offset: z.number().int().min(0).default(0),
        order: z.enum(["desc", "asc"]).default("desc").describe("By creation time"),
      }),
    },
    logged("query_rows", idOf, async (args: { agent_id?: string; table: string; where: Record<string, unknown>; limit: number; offset: number; order: "asc" | "desc" }, ctx) => {
      const { agent, actor } = await resolve(idOf(args), ctx);
      const rows = await queryRows(agent, args.table, actor, args);
      return json({ count: rows.length, rows: await viewRows(await getTable(agent, args.table), rows, actor) });
    }),
  );

  server.registerTool(
    "update_row",
    {
      title: "Change a row",
      description: "Change fields of one row by id. Only the fields you pass change; null clears a field.",
      inputSchema: z.object({ ...idShape, table, row_id: z.string(), values: z.record(z.string(), z.unknown()) }),
    },
    logged("update_row", idOf, async (args: { agent_id?: string; table: string; row_id: string; values: Record<string, unknown> }, ctx) => {
      const { agent, actor } = await resolve(idOf(args), ctx);
      const row = await updateRow(agent, args.table, actor, args.row_id, args.values);
      return json((await viewRows(await getTable(agent, args.table), [row], actor))[0]);
    }),
  );

  server.registerTool(
    "delete_row",
    {
      title: "Delete a row",
      description: "Delete one row by id.",
      inputSchema: z.object({ ...idShape, table, row_id: z.string() }),
    },
    logged("delete_row", idOf, async (args: { agent_id?: string; table: string; row_id: string }, ctx) => {
      const { agent, actor } = await resolve(idOf(args), ctx);
      await deleteRow(agent, args.table, actor, args.row_id);
      return text(`Deleted ${args.row_id} from ${args.table}.`);
    }),
  );
}
