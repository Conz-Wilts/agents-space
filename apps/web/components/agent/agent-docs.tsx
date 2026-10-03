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
    <div className="grid gap-8 md:grid-cols-[220px_1fr] md:gap-10">
      <nav className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1 md:mx-0 md:flex-col md:overflow-visible md:border-r md:border-edge md:px-0 md:pr-6">
        <p className="mb-2 hidden font-mono text-[12px] uppercase tracking-[1px] text-muted md:block">Skill</p>
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
            <div className="mb-6 flex items-start justify-between gap-4 border-b border-edge pb-5">
              <h2 className="text-[28px] leading-8 font-medium tracking-[-1px] text-ink">{doc.title}</h2>
              <button
                type="button"
                onClick={() => setRaw((r) => !r)}
                aria-pressed={raw}
                className={`flex h-8 shrink-0 items-center gap-1.5 rounded-lg px-3 font-mono text-[12px] uppercase tracking-[1px] transition-colors ${raw ? "bg-ink text-white" : "text-muted outline outline-1 -outline-offset-1 outline-edge hover:text-ink"}`}
              >
                <span>&lt;/&gt;</span> Raw
              </button>
            </div>
            {raw ? (
              <pre className="overflow-x-auto rounded-lg bg-panel p-4 font-mono text-[13px] leading-relaxed whitespace-pre-wrap break-words text-ink">
                {doc.body}
              </pre>
            ) : doc.body.trim() ? (
              <Markdown remarkPlugins={[remarkGfm]} components={md}>
                {doc.body}
              </Markdown>
            ) : (
              <p className="text-[15px] text-muted">Empty.</p>
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
      className={`flex max-w-44 shrink-0 items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[15px] transition-colors md:max-w-none ${active ? "bg-ink text-white" : "text-muted hover:bg-panel hover:text-ink"}`}
    >
      <span className="opacity-70">{icon}</span>
      <span className="truncate">{children}</span>
      {alert && <span className="ml-auto size-1.5 shrink-0 rounded-full bg-red-500 ping" aria-label="needs setup" />}
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
