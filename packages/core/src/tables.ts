import { store, type RowQuery } from "./store";
import { DataTableSchema, TableColumnSchema, type Agent, type CallerAccess, type DataTable, type TableColumn, type TableRow } from "./schema";

/**
 * Agent tables: structured data an agent keeps on Agents Space, no connector needed. Owners
 * define tables (columns + context saying what they're for) and choose what callers may do;
 * callers' LLMs read the context in the skill and add or look up rows (bookings, leads, orders).
 * Every hosted agent has a built-in `outputs` table for what it produced.
 */

export const OUTPUTS_TABLE = "outputs";
const MAX_TABLES = 20;
const MAX_COLUMNS = 40;
const MAX_ROWS = 10_000;
const MAX_ROW_BYTES = 16_000;
export const MAX_INSERT = 50;
export const MAX_QUERY = 200;

const outputsTable = (agentId: string): DataTable => ({
  agentId,
  name: OUTPUTS_TABLE,
  title: "Outputs",
  context:
    "One row per meaningful result this agent produced for a caller: an answer given, something booked or changed, a decision, or a follow-up the owner should see. Write it before you finish the request.",
  columns: [
    { name: "kind", type: "text", description: "What it is, e.g. answer, booking, request, follow_up", required: true },
    { name: "summary", type: "text", description: "One or two sentences the owner can scan", required: true },
    { name: "data", type: "json", description: "Structured details (ids, amounts, dates)", required: false },
  ],
  callerAccess: "own",
  builtIn: true,
  updatedAt: new Date(0).toISOString(),
});

/** Every table an agent has, the built-in `outputs` first (unless the owner replaced it). */
export async function agentTables(agent: Agent): Promise<DataTable[]> {
  const stored = await store.listTables(agent.id);
  if (agent.kind !== "hosted" || stored.some((t) => t.name === OUTPUTS_TABLE)) return stored;
  return [outputsTable(agent.id), ...stored];
}

export async function getTable(agent: Agent, name: string): Promise<DataTable> {
  const tables = await agentTables(agent);
  const t = tables.find((x) => x.name === name);
  if (!t) throw new Error(`${agent.name} has no table "${name}". Tables: ${tables.map((x) => x.name).join(", ") || "none"}.`);
  return t;
}

/** Create or replace a table definition. Rows already in it are kept. */
export async function defineTable(
  agent: Agent,
  spec: { name: string; title?: string; context?: string; columns: unknown[]; callerAccess?: CallerAccess },
): Promise<DataTable> {
  if (agent.kind !== "hosted") throw new Error("Only hosted agents have tables.");
  const columns = spec.columns.map((c) => TableColumnSchema.parse(c));
  if (columns.length > MAX_COLUMNS) throw new Error(`At most ${MAX_COLUMNS} columns.`);
  const seen = new Set<string>();
  for (const c of columns) {
    if (seen.has(c.name)) throw new Error(`Two columns are named "${c.name}".`);
    if (c.name === "id") throw new Error(`"id" is reserved: every row gets one.`);
    seen.add(c.name);
  }
  const existing = await store.listTables(agent.id);
  if (!existing.some((t) => t.name === spec.name) && existing.length >= MAX_TABLES) throw new Error(`An agent can have at most ${MAX_TABLES} tables.`);
  const prev = existing.find((t) => t.name === spec.name) ?? (spec.name === OUTPUTS_TABLE ? outputsTable(agent.id) : undefined);
  const t = DataTableSchema.parse({
    agentId: agent.id,
    name: spec.name,
    title: spec.title ?? prev?.title ?? spec.name.replace(/_/g, " "),
    context: spec.context ?? prev?.context ?? "",
    columns,
    callerAccess: spec.callerAccess ?? prev?.callerAccess ?? "own",
    updatedAt: new Date().toISOString(),
  });
  return store.saveTable(t);
}

export async function setTableContext(agent: Agent, name: string, context: string) {
  const t = await getTable(agent, name);
  return store.saveTable({ ...t, context });
}

/** Deletes the table and its rows. The built-in `outputs` table comes back empty with its defaults. */
export async function dropTable(agent: Agent, name: string) {
  await getTable(agent, name);
  await store.deleteTable(agent.id, name);
}

/* ───────────── rows ───────────── */

function coerce(col: TableColumn, v: unknown): unknown {
  const bad = () => new Error(`Column "${col.name}" is ${col.type}; got ${JSON.stringify(v)}.`);
  switch (col.type) {
    case "text":
      if (typeof v === "string") return v;
      if (typeof v === "number" || typeof v === "boolean") return String(v);
      throw bad();
    case "number": {
      const n = typeof v === "string" && v.trim() !== "" ? Number(v) : v;
      if (typeof n === "number" && Number.isFinite(n)) return n;
      throw bad();
    }
    case "boolean":
      if (typeof v === "boolean") return v;
      if (v === "true" || v === "false") return v === "true";
      throw bad();
    case "date":
      if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v))) return v;
      throw new Error(`Column "${col.name}" is a date (YYYY-MM-DD); got ${JSON.stringify(v)}.`);
    case "datetime":
      if (typeof v === "string" && !Number.isNaN(Date.parse(v))) return new Date(v).toISOString();
      throw new Error(`Column "${col.name}" is a datetime (ISO 8601); got ${JSON.stringify(v)}.`);
    case "json":
      return v;
  }
}

/** Check and coerce a row against the table's columns. A table without columns takes any object. */
function validRow(t: DataTable, data: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (!t.columns.length) Object.assign(out, data);
  else {
    const unknown = Object.keys(data).filter((k) => !t.columns.some((c) => c.name === k));
    if (unknown.length) throw new Error(`${t.name} has no column(s) ${unknown.join(", ")}. Columns: ${t.columns.map((c) => c.name).join(", ")}.`);
    for (const c of t.columns) {
      const v = data[c.name];
      if (v === undefined || v === null || v === "") {
        if (c.required) throw new Error(`${t.name}.${c.name} is required.`);
        continue;
      }
      out[c.name] = coerce(c, v);
    }
  }
  if (JSON.stringify(out).length > MAX_ROW_BYTES) throw new Error(`A row can be at most ${MAX_ROW_BYTES / 1000}KB.`);
  return out;
}

/** Who is acting on a table: the agent's owner, or a caller with access (anonymous on public agents). */
export type Actor = { userId?: string; owner: boolean };
export const actorFor = (agent: Agent, userId?: string): Actor => ({ userId, owner: !!userId && agent.ownerId === userId });

type Op = "insert" | "read" | "change";

const ALLOWED: Record<CallerAccess, Op[]> = {
  none: [],
  insert: ["insert"],
  own: ["insert", "read", "change"],
  read: ["read"],
  write: ["insert", "read", "change"],
};

/** Plain-language summary of what callers may do. */
export const accessLabel: Record<CallerAccess, string> = {
  none: "owner only",
  insert: "callers can add rows",
  own: "callers can add rows and see/change their own",
  read: "callers can read every row",
  write: "callers can read and change every row",
};

function check(t: DataTable, actor: Actor, op: Op) {
  if (actor.owner) return;
  if (!ALLOWED[t.callerAccess].includes(op)) throw new Error(`You can't ${op} rows in "${t.name}" (${accessLabel[t.callerAccess]}).`);
  if (t.callerAccess === "own" && op !== "insert" && !actor.userId) throw new Error(`Sign in to see or change your rows in "${t.name}".`);
}

/** Callers with `own` access only ever see or touch rows they added. */
const ownOnly = (t: DataTable, actor: Actor) => !actor.owner && t.callerAccess === "own";

async function rowFor(agent: Agent, t: DataTable, actor: Actor, id: string) {
  const r = await store.getRow(agent.id, t.name, id);
  if (!r || (ownOnly(t, actor) && r.createdBy !== actor.userId)) throw new Error(`No row "${id}" in ${t.name}.`);
  return r;
}

export async function insertRows(agent: Agent, table: string, actor: Actor, rows: Record<string, unknown>[]) {
  const t = await getTable(agent, table);
  check(t, actor, "insert");
  if (!rows.length) throw new Error("Give at least one row.");
  if (rows.length > MAX_INSERT) throw new Error(`At most ${MAX_INSERT} rows per call.`);
  if ((await store.countRows(agent.id, t.name)) + rows.length > MAX_ROWS) throw new Error(`${t.name} is full (${MAX_ROWS} rows).`);
  const data = rows.map((r, i) => {
    try {
      return validRow(t, r);
    } catch (e) {
      throw new Error(`Row ${i + 1}: ${e instanceof Error ? e.message : e}`);
    }
  });
  return store.insertRows(agent.id, t.name, data.map((d) => ({ data: d, createdBy: actor.userId })));
}

export async function queryRows(agent: Agent, table: string, actor: Actor, q: Omit<RowQuery, "createdBy"> = {}) {
  const t = await getTable(agent, table);
  check(t, actor, "read");
  const limit = Math.min(Math.max(q.limit ?? 50, 1), MAX_QUERY);
  return store.queryRows(agent.id, t.name, { ...q, limit, createdBy: ownOnly(t, actor) ? actor.userId : undefined });
}

/** Merge `values` into a row; `null` clears a field. */
export async function updateRow(agent: Agent, table: string, actor: Actor, id: string, values: Record<string, unknown>) {
  const t = await getTable(agent, table);
  check(t, actor, "change");
  const r = await rowFor(agent, t, actor, id);
  const merged = Object.fromEntries(Object.entries({ ...r.data, ...values }).filter(([, v]) => v !== null));
  return store.updateRow(agent.id, t.name, r.id, validRow(t, merged));
}

export async function deleteRow(agent: Agent, table: string, actor: Actor, id: string) {
  const t = await getTable(agent, table);
  check(t, actor, "change");
  const r = await rowFor(agent, t, actor, id);
  return store.deleteRow(agent.id, t.name, r.id);
}

/* ───────────── describing tables to an LLM ───────────── */

const columnLine = (c: TableColumn) => `${c.name}${c.required ? "*" : ""}: ${c.type}${c.description ? ` (${c.description})` : ""}`;

export function describeTable(t: DataTable, opts: { owner?: boolean; rows?: number } = {}) {
  return [
    `### ${t.name}: ${t.title}${t.builtIn ? " (built in)" : ""}`,
    `Access: ${accessLabel[t.callerAccess]}${opts.rows !== undefined ? ` · ${opts.rows} row(s)` : ""}`,
    t.columns.length ? `Columns (* required): ${t.columns.map(columnLine).join("; ")}` : "Columns: any (free-form JSON object)",
    t.context,
  ]
    .filter(Boolean)
    .join("\n");
}

/** The tables section of a skill: what callers can use, and how. Owner-only tables are left out. */
export async function tablesSkill(agent: Agent): Promise<string> {
  const usable = (await agentTables(agent)).filter((t) => t.callerAccess !== "none");
  if (!usable.length) return "";
  return [
    "## Data tables",
    "This agent keeps its own data. Use the table tools (insert_rows, query_rows, update_row, delete_row) with the table name. Follow each table's context; dates are YYYY-MM-DD, datetimes ISO 8601.",
    ...usable.map((t) => describeTable(t)),
  ].join("\n\n");
}

/** Rows as an LLM sees them: id, data fields, timestamps; the owner also sees who added each. */
export async function viewRows(rows: TableRow[], actor: Actor) {
  const handles = new Map<string, string>();
  if (actor.owner)
    for (const id of new Set(rows.map((r) => r.createdBy).filter((x): x is string => !!x)))
      handles.set(id, `@${(await store.getUser(id))?.handle ?? "?"}`);
  return rows.map((r) => ({
    id: r.id,
    ...r.data,
    _created_at: r.createdAt,
    ...(r.updatedAt !== r.createdAt ? { _updated_at: r.updatedAt } : {}),
    ...(actor.owner ? { _created_by: r.createdBy ? handles.get(r.createdBy) : "anonymous" } : {}),
  }));
}
