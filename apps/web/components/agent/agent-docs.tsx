"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Markdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

export type NodeIcon = "file" | "folder" | "instructions" | "note" | "table" | "plug" | "model" | "clock";

/**
 * One entry in the skill tree. A leaf shows a markdown `body` or a server-rendered `panel`;
 * a folder has `children`. `alert` puts a red dot on the row (and on every folder above it).
 */
export type TreeNode = {
  id: string;
  label: string;
  icon?: NodeIcon;
  body?: string;
  panel?: ReactNode;
  children?: TreeNode[];
  alert?: boolean;
  /** Folder starts open. */
  open?: boolean;
};

type Flat = { node: TreeNode; path: TreeNode[] };

function flatten(nodes: TreeNode[], path: TreeNode[] = []): Flat[] {
  return nodes.flatMap((n) => [{ node: n, path }, ...(n.children ? flatten(n.children, [...path, n]) : [])]);
}

const hasAlert = (n: TreeNode): boolean => !!n.alert || !!n.children?.some(hasAlert);
const leaves = (n: TreeNode): number => (n.children ? n.children.reduce((s, c) => s + leaves(c), 0) : 1);

/** Keep nodes whose label or body matches, plus the folders that lead to them. */
function filterTree(nodes: TreeNode[], q: string): TreeNode[] {
  return nodes.flatMap((n) => {
    const self = n.label.toLowerCase().includes(q) || !!n.body?.toLowerCase().includes(q);
    if (!n.children) return self ? [n] : [];
    if (self) return [n];
    const kids = filterTree(n.children, q);
    return kids.length ? [{ ...n, children: kids }] : [];
  });
}

/**
 * Visvine-style explorer: the agent's skill as a file tree (instructions, context notes, tables,
 * tools, models, schedules bundled into folders), searchable, with the selected file rendered on
 * the right (markdown with a Raw toggle, or a panel).
 */
export function AgentDocs({ tree }: { tree: TreeNode[] }) {
  const flat = useMemo(() => flatten(tree), [tree]);
  const firstLeaf = flat.find((f) => !f.node.children)?.node.id;
  const [selected, setSelected] = useState(firstLeaf);
  const [open, setOpen] = useState<Set<string>>(() => new Set(flat.filter((f) => f.node.open).map((f) => f.node.id)));
  const [raw, setRaw] = useState(false);
  const [searching, setSearching] = useState(false);
  const [query, setQuery] = useState("");
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (searching) input.current?.focus();
  }, [searching]);

  const q = query.trim().toLowerCase();
  const shown = q ? filterTree(tree, q) : tree;
  const current = flat.find((f) => f.node.id === selected);

  const select = (f: Flat | undefined) => {
    if (!f) return;
    setSelected(f.node.id);
    // Reveal it: open every folder above.
    setOpen((s) => new Set([...s, ...f.path.map((p) => p.id)]));
  };
  const toggle = (id: string) =>
    setOpen((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const closeSearch = () => {
    setSearching(false);
    setQuery("");
  };

  return (
    <div className="grid gap-8 md:grid-cols-[260px_1fr] md:gap-10">
      <nav aria-label="Skill files" className="min-w-0 md:border-r md:border-edge md:pr-5">
        <div className="mb-2 flex h-9 items-center gap-2">
          {searching ? (
            <label className="flex h-9 min-w-0 flex-1 items-center gap-2 rounded-lg bg-panel px-2.5 outline outline-1 -outline-offset-1 outline-edge focus-within:outline-ink">
              <SearchIcon />
              <input
                ref={input}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") closeSearch();
                  if (e.key === "Enter") select(flatten(shown).find((f) => !f.node.children));
                }}
                placeholder="Search files and text"
                aria-label="Search the skill"
                className="h-full min-w-0 flex-1 bg-transparent text-[14px] text-ink outline-none placeholder:text-muted"
              />
              <button type="button" onClick={closeSearch} aria-label="Close search" className="text-muted transition-colors hover:text-ink">
                <CloseIcon />
              </button>
            </label>
          ) : (
            <>
              <p className="flex-1 font-mono text-[12px] uppercase tracking-[1px] text-muted">Skill</p>
              <button
                type="button"
                onClick={() => setSearching(true)}
                aria-label="Search the skill"
                title="Search"
                className="flex size-8 items-center justify-center rounded-lg text-muted transition-colors hover:bg-panel hover:text-ink"
              >
                <SearchIcon />
              </button>
            </>
          )}
        </div>

        <ul role="tree" className="max-h-[320px] overflow-y-auto md:max-h-none md:overflow-visible">
          {shown.map((n) => (
            <Row key={n.id} node={n} depth={0} selected={selected} open={open} forceOpen={!!q} onSelect={select} onToggle={toggle} flat={flat} query={q} />
          ))}
          {q && !shown.length && <li className="px-3 py-2 text-[14px] text-muted">Nothing matches “{query.trim()}”.</li>}
        </ul>
      </nav>

      <article className="min-w-0">
        {current && (
          <>
            <div className="mb-6 flex items-start justify-between gap-4 border-b border-edge pb-5">
              <div className="min-w-0">
                {current.path.length > 0 && (
                  <p className="mb-2 truncate font-mono text-[12px] uppercase tracking-[1px] text-muted">
                    {current.path.map((p) => p.label).join(" / ")}
                  </p>
                )}
                <h2 className="text-[28px] leading-8 font-medium tracking-[-1px] break-words text-ink">{current.node.label}</h2>
              </div>
              {current.node.body !== undefined && (
                <button
                  type="button"
                  onClick={() => setRaw((r) => !r)}
                  aria-pressed={raw}
                  className={`flex h-8 shrink-0 items-center gap-1.5 rounded-lg px-3 font-mono text-[12px] uppercase tracking-[1px] transition-colors ${raw ? "bg-ink text-white" : "text-muted outline outline-1 -outline-offset-1 outline-edge hover:text-ink"}`}
                >
                  <span>&lt;/&gt;</span> Raw
                </button>
              )}
            </div>
            {current.node.panel ??
              (raw ? (
                <pre className="overflow-x-auto rounded-lg bg-panel p-4 font-mono text-[13px] leading-relaxed whitespace-pre-wrap break-words text-ink">
                  {current.node.body}
                </pre>
              ) : current.node.body?.trim() ? (
                <Markdown remarkPlugins={[remarkGfm]} components={md}>
                  {current.node.body}
                </Markdown>
              ) : (
                <p className="text-[15px] text-muted">Empty.</p>
              ))}
          </>
        )}
      </article>
    </div>
  );
}

function Row({
  node,
  depth,
  selected,
  open,
  forceOpen,
  onSelect,
  onToggle,
  flat,
  query,
}: {
  node: TreeNode;
  depth: number;
  selected?: string;
  open: Set<string>;
  forceOpen: boolean;
  onSelect: (f: Flat | undefined) => void;
  onToggle: (id: string) => void;
  flat: Flat[];
  query: string;
}) {
  const folder = !!node.children;
  const expanded = folder && (forceOpen || open.has(node.id));
  const active = selected === node.id;
  const alert = hasAlert(node);

  return (
    <li role="treeitem" aria-expanded={folder ? expanded : undefined} aria-selected={active}>
      <button
        type="button"
        onClick={() => (folder ? onToggle(node.id) : onSelect(flat.find((f) => f.node.id === node.id)))}
        style={{ paddingLeft: 8 + depth * 14 }}
        className={`group flex w-full items-center gap-2 rounded-lg py-1.5 pr-2 text-left text-[14px] transition-colors ${
          active ? "bg-ink text-white" : folder ? "text-ink hover:bg-panel" : "text-muted hover:bg-panel hover:text-ink"
        }`}
      >
        <span className={`flex size-3 shrink-0 items-center justify-center transition-transform duration-200 ${expanded ? "rotate-90" : ""} ${folder ? "" : "invisible"}`}>
          <Chevron />
        </span>
        <span className={active ? "opacity-90" : "opacity-60 group-hover:opacity-90"}>
          <Icon kind={folder ? (expanded ? "folder-open" : "folder") : (node.icon ?? "file")} />
        </span>
        <span className={`truncate ${folder ? "font-medium" : ""}`}>
          <Highlight text={node.label} query={query} />
        </span>
        <span className="ml-auto flex shrink-0 items-center gap-1.5">
          {alert && <span className="size-1.5 rounded-full bg-red-500 ping" aria-label="needs setup" />}
          {folder && (
            <span className={`rounded-full px-1.5 py-px font-mono text-[11px] ${active ? "bg-white/15 text-white" : "bg-panel text-muted"}`}>{leaves(node)}</span>
          )}
        </span>
      </button>
      {expanded && node.children && (
        <ul role="group" className="relative">
          {/* Indent guide under the folder's chevron. */}
          <span aria-hidden className="absolute top-0 bottom-1 w-px bg-edge" style={{ left: 13 + depth * 14 }} />
          {node.children.map((c) => (
            <Row key={c.id} node={c} depth={depth + 1} selected={selected} open={open} forceOpen={forceOpen} onSelect={onSelect} onToggle={onToggle} flat={flat} query={query} />
          ))}
        </ul>
      )}
    </li>
  );
}

function Highlight({ text, query }: { text: string; query: string }) {
  const i = query ? text.toLowerCase().indexOf(query) : -1;
  if (i < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, i)}
      <mark className="rounded-sm bg-amber-200/70 text-inherit">{text.slice(i, i + query.length)}</mark>
      {text.slice(i + query.length)}
    </>
  );
}

/* ───────────── icons (16px grid, stroke) ───────────── */

const svg = (children: ReactNode) => (
  <svg viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    {children}
  </svg>
);

function Icon({ kind }: { kind: NodeIcon | "folder-open" }) {
  switch (kind) {
    case "folder":
      return svg(<path d="M1.75 3.75h4.5l1.5 1.5h6.5v7.5H1.75z" />);
    case "folder-open":
      return svg(<path d="M1.75 12.75v-9h4.5l1.5 1.5h5.5v2M1.75 12.75l2-5.5h10.5l-2 5.5z" />);
    case "instructions":
      return svg(<path d="M3.5 2.5h9v11h-9zM6 5.5h4M6 8h4M6 10.5h2.5" />);
    case "table":
      return svg(<path d="M2 3h12v10H2zM2 6.5h12M6.5 6.5V13" />);
    case "plug":
      return svg(<path d="M6 1.5v3M10 1.5v3M4 4.5h8v3a4 4 0 0 1-8 0zM8 11.5v3" />);
    case "model":
      return svg(<path d="M8 1.75 13.5 5v6L8 14.25 2.5 11V5zM8 8l5.5-3M8 8 2.5 5M8 8v6.25" />);
    case "clock":
      return svg(<path d="M8 14.25A6.25 6.25 0 1 0 8 1.75a6.25 6.25 0 0 0 0 12.5zM8 4.5V8l2.5 1.5" />);
    case "note":
    case "file":
    default:
      return svg(<path d="M4 1.75h5L12.25 5v9.25H4zM9 1.75V5h3.25" />);
  }
}

const Chevron = () => svg(<path d="m6 4 4 4-4 4" />);
const SearchIcon = () => svg(<path d="M7 12.25a5.25 5.25 0 1 0 0-10.5 5.25 5.25 0 0 0 0 10.5zM14.25 14.25 10.75 10.75" />);
const CloseIcon = () => svg(<path d="m4 4 8 8M12 4l-8 8" />);

/** Markdown element styles (no typography plugin). Drops react-markdown's `node` prop before it reaches the DOM. */
type El = keyof React.JSX.IntrinsicElements;
const el =
  (Tag: El, className: string) =>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ({ node: _n, ...p }: { node?: unknown; [k: string]: any }) => <Tag className={className} {...p} />;

const md: Components = {
  h1: el("h3", "mb-3 mt-8 text-[22px] font-medium tracking-[-0.6px] text-ink first:mt-0"),
  h2: el("h3", "mb-2 mt-7 text-[19px] font-medium tracking-[-0.4px] text-ink first:mt-0"),
  h3: el("h4", "mb-2 mt-6 font-mono text-[12px] uppercase tracking-[1px] text-muted first:mt-0"),
  p: el("p", "mb-4 text-[16px] leading-[26px] text-ink"),
  ul: el("ul", "mb-4 list-disc space-y-1.5 pl-5 text-[16px] leading-[26px] text-ink marker:text-muted"),
  ol: el("ol", "mb-4 list-decimal space-y-1.5 pl-5 text-[16px] leading-[26px] text-ink marker:font-mono marker:text-muted"),
  a: el("a", "text-ink underline decoration-edge underline-offset-4 transition-colors hover:decoration-ink"),
  code: el("code", "rounded bg-panel px-1.5 py-0.5 font-mono text-[13px]"),
  pre: el("pre", "mb-4 overflow-x-auto rounded-lg bg-panel p-4 text-[13px]"),
  table: el("table", "mb-4 block w-full overflow-x-auto border-collapse text-[14px] text-ink"),
  th: el("th", "border border-edge bg-panel px-3 py-2 text-left font-mono text-[12px] font-normal uppercase tracking-[1px] text-muted"),
  td: el("td", "border border-edge px-3 py-2"),
};
