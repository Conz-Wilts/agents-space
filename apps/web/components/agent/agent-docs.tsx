"use client";

import { useState, type ReactNode } from "react";
import Markdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

export type Doc = { id: string; title: string; body: string };

/** Visvine-style viewer: a plain list of the agent's docs on the left, the selected one rendered (or raw) on the right. */
export function AgentDocs({ docs, tools, toolsAlert }: { docs: Doc[]; tools?: ReactNode; toolsAlert?: boolean }) {
  const [selected, setSelected] = useState(docs[0]?.id ?? "tools");
  const [raw, setRaw] = useState(false);
  const doc = docs.find((d) => d.id === selected);

  return (
    <div className="grid gap-6 md:grid-cols-[200px_1fr]">
      <nav className="flex gap-1 overflow-x-auto md:flex-col md:overflow-visible">
        {docs.map((d) => (
          <Item key={d.id} active={selected === d.id} onClick={() => setSelected(d.id)} icon={<FileIcon />}>
            {d.title}
          </Item>
        ))}
        {tools && (
          <Item active={selected === "tools"} onClick={() => setSelected("tools")} icon={<PlugIcon />} alert={toolsAlert}>
            Tools
          </Item>
        )}
      </nav>

      <article className="min-w-0">
        {doc ? (
          <>
            <div className="mb-6 flex items-start justify-between gap-4">
              <h2 className="text-2xl font-semibold">{doc.title}</h2>
              <button
                type="button"
                onClick={() => setRaw((r) => !r)}
                aria-pressed={raw}
                className={`flex shrink-0 items-center gap-1.5 border-b-2 pb-1 text-sm ${raw ? "border-brand text-fg" : "border-transparent text-fg-muted hover:text-fg"}`}
              >
                <span className="font-mono text-xs">&lt;/&gt;</span> Raw
              </button>
            </div>
            {raw ? (
              <pre className="overflow-x-auto whitespace-pre-wrap break-words font-mono text-xs leading-relaxed text-fg-secondary">
                {doc.body}
              </pre>
            ) : doc.body.trim() ? (
              <Markdown remarkPlugins={[remarkGfm]} components={md}>
                {doc.body}
              </Markdown>
            ) : (
              <p className="text-sm text-fg-muted">Empty.</p>
            )}
          </>
        ) : (
          tools
        )}
      </article>
    </div>
  );
}

function Item({
  active,
  onClick,
  icon,
  alert,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: ReactNode;
  alert?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex max-w-44 shrink-0 items-center gap-2 rounded-lg px-2.5 py-1.5 md:max-w-none text-left text-sm ${active ? "bg-surface-subtle font-medium text-fg" : "text-fg-secondary hover:bg-surface-subtle"}`}
    >
      <span className="text-fg-muted">{icon}</span>
      <span className="truncate">{children}</span>
      {alert && <span className="ml-auto size-1.5 shrink-0 rounded-full bg-red-500" aria-label="needs setup" />}
    </button>
  );
}

const FileIcon = () => (
  <svg viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
    <path d="M4 1.75h5L12.25 5v9.25H4z" />
    <path d="M9 1.75V5h3.25" />
  </svg>
);

const PlugIcon = () => (
  <svg viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden>
    <path d="M6 1.5v3M10 1.5v3M4 4.5h8v3a4 4 0 0 1-8 0zM8 11.5v3" />
  </svg>
);

/** Markdown element styles (no typography plugin). Drops react-markdown's `node` prop before it reaches the DOM. */
type El = keyof React.JSX.IntrinsicElements;
const el =
  (Tag: El, className: string) =>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ({ node: _n, ...p }: { node?: unknown; [k: string]: any }) => <Tag className={className} {...p} />;

const md: Components = {
  h1: el("h3", "mb-3 mt-6 text-lg font-semibold first:mt-0"),
  h2: el("h3", "mb-2 mt-6 text-base font-semibold first:mt-0"),
  h3: el("h4", "mb-2 mt-5 text-sm font-semibold first:mt-0"),
  p: el("p", "mb-3 text-sm leading-relaxed"),
  ul: el("ul", "mb-3 list-disc space-y-1 pl-5 text-sm"),
  ol: el("ol", "mb-3 list-decimal space-y-1 pl-5 text-sm"),
  a: el("a", "text-brand hover:underline"),
  code: el("code", "rounded bg-surface-subtle px-1 py-0.5 font-mono text-xs"),
  pre: el("pre", "mb-3 overflow-x-auto rounded-lg bg-surface-subtle p-3 text-xs"),
  table: el("table", "mb-3 block w-full overflow-x-auto border-collapse text-sm"),
  th: el("th", "border border-line bg-surface-subtle px-3 py-1.5 text-left font-medium"),
  td: el("td", "border border-line px-3 py-1.5"),
};
