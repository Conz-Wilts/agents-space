import { actorFor, MAX_QUERY, queryRows, store, visibleData, type Agent, type DataTable, type TableRow } from "@agents-space/core";

/**
 * The rows in one agent table, newest first, under the table's schema in the skill tree. Uses the
 * same access rules as the MCP table tools: the owner sees everything, callers see what the
 * table's `callerAccess` lets them (only their own rows on `own` tables, nothing on `insert`/`none`),
 * and private columns only on the owner's view and the viewer's own rows (`visibleData`).
 */
export async function TableRows({ agent, table, userId }: { agent: Agent; table: DataTable; userId?: string }) {
  const actor = actorFor(agent, userId);
  let rows: TableRow[];
  try {
    rows = await queryRows(agent, table.name, actor, { limit: MAX_QUERY });
  } catch (e) {
    return (
      <Section title="Rows">
        <p className="text-[15px] text-muted">{e instanceof Error ? e.message : "You can't see rows in this table."}</p>
      </Section>
    );
  }
  const total = actor.owner ? await store.countRows(agent.id, table.name) : rows.length;
  const handles = actor.owner ? await creators(rows) : new Map<string, string>();

  // Declared columns first, then any extra keys (free-form tables, or columns since removed).
  const shown = rows.map((r) => ({ ...r, data: visibleData(table, r, actor) }));
  // Private columns stay as headers ("—" on other people's rows) so the viewer knows they exist.
  const keys = [...new Set([...table.columns.map((c) => c.name), ...shown.flatMap((r) => Object.keys(r.data))])];
  const title = actor.owner || table.callerAccess !== "own" ? `Rows · ${total}` : `Your rows · ${total}`;

  if (!rows.length)
    return (
      <Section title={title}>
        <p className="text-[15px] text-muted">No rows yet.</p>
      </Section>
    );

  return (
    <Section title={title} note={total > rows.length ? `Latest ${rows.length} of ${total}` : undefined}>
      <div className="max-h-[560px] overflow-auto rounded-lg outline outline-1 -outline-offset-1 outline-edge">
        <table className="w-full border-collapse text-[14px] text-ink">
          <thead className="sticky top-0 bg-panel">
            <tr>
              {[...keys, "added", ...(actor.owner ? ["by"] : [])].map((k) => (
                <th key={k} className="border-b border-edge px-3 py-2 text-left font-mono text-[12px] font-normal whitespace-nowrap uppercase tracking-[1px] text-muted">
                  {k}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {shown.map((r) => (
              <tr key={r.id} className="border-b border-edge last:border-0 hover:bg-panel/60">
                {keys.map((k) => (
                  <td key={k} className="max-w-[320px] px-3 py-2 align-top">
                    <Cell value={r.data[k]} />
                  </td>
                ))}
                <td className="px-3 py-2 align-top font-mono text-[12px] whitespace-nowrap text-muted" title={r.createdAt}>
                  {when(r.createdAt)}
                </td>
                {actor.owner && <td className="px-3 py-2 align-top font-mono text-[12px] whitespace-nowrap text-muted">{r.createdBy ? handles.get(r.createdBy) : "anonymous"}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Section>
  );
}

export function Section({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <div className="mt-8 border-t border-edge pt-6">
      <div className="mb-3 flex items-baseline justify-between gap-4">
        <h3 className="font-mono text-[12px] uppercase tracking-[1px] text-muted">{title}</h3>
        {note && <p className="font-mono text-[12px] text-muted">{note}</p>}
      </div>
      {children}
    </div>
  );
}

function Cell({ value }: { value: unknown }) {
  if (value === undefined || value === null) return <span className="text-muted">—</span>;
  if (typeof value === "boolean") return <>{value ? "yes" : "no"}</>;
  if (typeof value === "object")
    return <code className="block font-mono text-[12px] break-words whitespace-pre-wrap text-muted">{JSON.stringify(value)}</code>;
  return <span className="break-words">{String(value)}</span>;
}

export const when = (iso: string) => new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: "UTC" }) + " UTC";

async function creators(rows: TableRow[]) {
  const ids = [...new Set(rows.map((r) => r.createdBy).filter((x): x is string => !!x))];
  const users = await Promise.all(ids.map((id) => store.getUser(id)));
  return new Map(ids.map((id, i) => [id, `@${users[i]?.handle ?? "?"}`]));
}
