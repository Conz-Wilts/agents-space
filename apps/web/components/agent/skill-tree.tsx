import type { ReactNode } from "react";
import type { ContextNote, DataTable } from "@agents-space/core";
import type { TreeNode } from "./agent-docs";

type Leaf = { id: string; label: string; body?: string; panel?: ReactNode; alert?: boolean };

/**
 * Bundle an agent's skill into a file tree: Instructions on top, then folders for context notes,
 * tables, tools, schedules, (scheduled agents, owner only) models and logs. Notes whose titles contain "/" ("Menu/Drinks") nest into
 * sub-folders; a lone note or tool still gets its folder so the shape stays predictable.
 */
export function skillTree(s: {
  /** The viewer owns the agent (changes the empty-state wording). */
  owner?: boolean;
  instructions: string;
  notes: ContextNote[];
  tables: DataTable[];
  /** Rows panel shown under each table's schema. */
  tableRows?: (t: DataTable) => ReactNode;
  tools: Leaf[];
  schedules: Leaf[];
  /** The model a scheduled agent runs on. Pass it only to the owner of a scheduled agent. */
  models?: { current: { label: string; panel: ReactNode; alert?: boolean }; add?: ReactNode };
  /** Call logs: for the owner every call (and one leaf per caller), for anyone else only their own. Signed-in viewers only. */
  logs?: Leaf[];
}): TreeNode[] {
  const tree: TreeNode[] = [{ id: "instructions", label: "Instructions", icon: "instructions", body: s.instructions }];

  if (s.notes.length) tree.push({ id: "dir:context", label: "Context", open: true, children: nestNotes(s.notes) });

  if (s.tables.length)
    tree.push({
      id: "dir:tables",
      label: "Tables",
      children: s.tables.map((t) => ({ id: `table:${t.name}`, label: t.name, icon: "table", body: tableDoc(t), panel: s.tableRows?.(t) })),
    });

  tree.push(
    s.tools.length
      ? { id: "dir:tools", label: "Tools", open: s.tools.some((t) => t.alert), children: s.tools.map((t) => ({ ...t, id: `tool:${t.id}`, icon: "plug" as const })) }
      : {
          id: "dir:tools",
          label: "Tools",
          folder: true,
          body: s.owner
            ? "Nothing here yet. Attach a connector (`create_connector` or `connect_app`, then `attach_connector`) to give this agent actions."
            : "The owner hasn't shared any tools with you. This agent answers from its instructions and context only.",
        },
  );

  if (s.schedules.length)
    tree.push({ id: "dir:schedules", label: "Schedules", children: s.schedules.map((x) => ({ ...x, id: `schedule:${x.id}`, icon: "clock" as const })) });

  // Only scheduled runs use a model (skill agents reason on the caller's LLM), so the folder sits by Schedules.
  if (s.models)
    tree.push({
      id: "dir:models",
      label: "Models",
      open: s.models.current.alert,
      children: [
        { id: "model:current", icon: "model", ...s.models.current },
        ...(s.models.add ? [{ id: "model:add", label: "Add a model", icon: "model" as const, panel: s.models.add }] : []),
      ],
    });

  if (s.logs?.length) tree.push({ id: "dir:logs", label: "Logs", children: s.logs.map((x) => ({ ...x, id: `log:${x.id}`, icon: "log" as const })) });

  return tree;
}

/**
 * The same shape for someone without access: every folder locked, and selecting any of them shows
 * `panel` (the request-access form or a sign-in link).
 */
export function lockedTree(panel: ReactNode): TreeNode[] {
  const body = "You don't have access to this agent yet, so its files stay locked. Ask the owner below.";
  return [
    { id: "lock:instructions", label: "Instructions", icon: "instructions", locked: true, body, panel },
    ...["Context", "Tables", "Tools", "Logs"].map((label) => ({ id: `lock:${label.toLowerCase()}`, label, folder: true, locked: true, body, panel })),
  ];
}

/** "Menu/Drinks" → Menu ▸ Drinks. Folders first, then files, each alphabetical. */
function nestNotes(notes: ContextNote[]): TreeNode[] {
  const root: TreeNode[] = [];
  for (const n of notes) {
    const parts = n.title.split("/").map((p) => p.trim()).filter(Boolean);
    const file = parts.pop() ?? n.title;
    let level = root;
    let path = "dir:context";
    for (const dir of parts) {
      path += `/${dir.toLowerCase()}`;
      let folder = level.find((x) => x.id === path);
      if (!folder) level.push((folder = { id: path, label: dir, children: [] }));
      level = folder.children!;
    }
    level.push({ id: `note:${n.slug}`, label: file, icon: "note", body: n.body });
  }
  const sort = (xs: TreeNode[]): TreeNode[] =>
    xs
      .map((x) => (x.children ? { ...x, children: sort(x.children) } : x))
      .sort((a, b) => Number(!!b.children) - Number(!!a.children) || a.label.localeCompare(b.label));
  return sort(root);
}

const access: Record<DataTable["callerAccess"], string> = {
  none: "Owner only",
  insert: "Callers can add rows",
  own: "Callers add rows and see or change their own",
  book: "Callers add rows and see every row, but change only their own; private columns show only on their own rows",
  read: "Callers can read every row",
  write: "Callers can read and change every row",
};

function tableDoc(t: DataTable) {
  const cols = t.columns.length
    ? ["| Column | Type | Required | What goes here |", "|---|---|---|---|", ...t.columns.map((c) => `| \`${c.name}\` | ${c.type}${c.private ? " (private)" : ""} | ${c.required ? "yes" : ""} | ${c.description.replace(/\|/g, "\\|")} |`)].join("\n")
    : "Free-form: any JSON object per row.";
  return [`**${t.title}**${t.builtIn ? " (built in)" : ""} · ${access[t.callerAccess]}`, t.context, cols].filter(Boolean).join("\n\n");
}
