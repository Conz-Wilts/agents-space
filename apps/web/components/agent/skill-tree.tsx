import type { ReactNode } from "react";
import type { ContextNote, DataTable } from "@agents-space/core";
import type { TreeNode } from "./agent-docs";

type Leaf = { id: string; label: string; body?: string; panel?: ReactNode; alert?: boolean };

/**
 * Bundle an agent's skill into a file tree: Instructions on top, then folders for context notes,
 * tables, tools, models and schedules. Notes whose titles contain "/" ("Menu/Drinks") nest into
 * sub-folders; a lone note or tool still gets its folder so the shape stays predictable.
 */
export function skillTree(s: {
  instructions: string;
  notes: ContextNote[];
  tables: DataTable[];
  tools: Leaf[];
  schedules: Leaf[];
  models: { current: { label: string; panel: ReactNode; alert?: boolean }; add?: ReactNode };
}): TreeNode[] {
  const tree: TreeNode[] = [{ id: "instructions", label: "Instructions", icon: "instructions", body: s.instructions }];

  if (s.notes.length) tree.push({ id: "dir:context", label: "Context", open: true, children: nestNotes(s.notes) });

  if (s.tables.length)
    tree.push({
      id: "dir:tables",
      label: "Tables",
      children: s.tables.map((t) => ({ id: `table:${t.name}`, label: t.name, icon: "table", body: tableDoc(t) })),
    });

  tree.push({
    id: "dir:tools",
    label: "Tools",
    open: s.tools.some((t) => t.alert),
    children: s.tools.length
      ? s.tools.map((t) => ({ ...t, id: `tool:${t.id}`, icon: "plug" as const }))
      : [{ id: "tool:none", label: "No tools", icon: "plug", body: "None. This agent is instructions only." }],
  });

  tree.push({
    id: "dir:models",
    label: "Models",
    open: s.models.current.alert,
    children: [
      { id: "model:current", icon: "model", ...s.models.current },
      ...(s.models.add ? [{ id: "model:add", label: "Add a model", icon: "model" as const, panel: s.models.add }] : []),
    ],
  });

  if (s.schedules.length)
    tree.push({ id: "dir:schedules", label: "Schedules", children: s.schedules.map((x) => ({ ...x, id: `schedule:${x.id}`, icon: "clock" as const })) });

  return tree;
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
  read: "Callers can read every row",
  write: "Callers can read and change every row",
};

function tableDoc(t: DataTable) {
  const cols = t.columns.length
    ? ["| Column | Type | Required | What goes here |", "|---|---|---|---|", ...t.columns.map((c) => `| \`${c.name}\` | ${c.type} | ${c.required ? "yes" : ""} | ${c.description.replace(/\|/g, "\\|")} |`)].join("\n")
    : "Free-form: any JSON object per row.";
  return [`**${t.title}**${t.builtIn ? " (built in)" : ""} · ${access[t.callerAccess]}`, t.context, cols].filter(Boolean).join("\n\n");
}
