"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { setVisibility } from "./actions";

/** Owner-only: Public / Private switch and a Share menu that copies the page or MCP link. */
export function OwnerControls({
  agentId,
  visibility,
  endpoint,
  draft,
}: {
  agentId: string;
  visibility: "public" | "private";
  endpoint?: string;
  draft: boolean;
}) {
  const [pending, start] = useTransition();
  const [vis, setVis] = useState(visibility);

  const choose = (v: "public" | "private") => {
    if (v === vis) return;
    setVis(v);
    start(() => setVisibility(agentId, v).catch(() => setVis(vis)));
  };

  return (
    <div className="flex items-center gap-2">
      <div role="radiogroup" aria-label="Visibility" className={`flex rounded-full bg-surface-subtle p-0.5 text-xs ${pending ? "opacity-60" : ""}`}>
        {(["public", "private"] as const).map((v) => (
          <button
            key={v}
            type="button"
            role="radio"
            aria-checked={vis === v}
            onClick={() => choose(v)}
            className={`rounded-full px-3 py-1 capitalize ${vis === v ? "bg-surface font-medium text-fg shadow-strip" : "text-fg-muted hover:text-fg"}`}
          >
            {v}
          </button>
        ))}
      </div>
      <Share agentId={agentId} endpoint={endpoint} draft={draft} />
    </div>
  );
}

function Share({ agentId, endpoint, draft }: { agentId: string; endpoint?: string; draft: boolean }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState<string>();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const links = [
    { label: "Page", url: typeof window === "undefined" ? "" : `${window.location.origin}/agents/${agentId}` },
    ...(endpoint ? [{ label: "MCP", url: endpoint }] : []),
  ];

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex items-center gap-1.5 rounded-full px-3 py-1 text-xs text-fg-secondary hover:bg-surface-subtle"
      >
        <svg viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
          <circle cx="4" cy="8" r="1.75" />
          <circle cx="12" cy="3.5" r="1.75" />
          <circle cx="12" cy="12.5" r="1.75" />
          <path d="m5.5 7.2 5-2.9M5.5 8.8l5 2.9" />
        </svg>
        Share
      </button>
      {open && (
        <div className="absolute right-0 z-20 mt-2 w-72 rounded-xl border border-line bg-surface p-2 shadow-strip">
          {draft && <p className="px-2 pb-2 text-xs text-fg-muted">Draft: only you can open it until it&apos;s published.</p>}
          {links.map((l) => (
            <button
              key={l.label}
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(l.url);
                setCopied(l.label);
              }}
              className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-surface-subtle"
            >
              <span className="w-10 shrink-0 text-xs font-medium">{l.label}</span>
              <code className="min-w-0 flex-1 truncate font-mono text-[11px] text-fg-muted">{l.url}</code>
              <span className="shrink-0 text-xs text-brand">{copied === l.label ? "Copied" : "Copy"}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
