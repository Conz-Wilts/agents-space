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
    <div className="flex flex-wrap items-center gap-2">
      <div role="radiogroup" aria-label="Visibility" className={`flex rounded-lg bg-panel p-1 outline outline-1 -outline-offset-1 outline-edge ${pending ? "opacity-60" : ""}`}>
        {(["public", "private"] as const).map((v) => (
          <button
            key={v}
            type="button"
            role="radio"
            aria-checked={vis === v}
            onClick={() => choose(v)}
            className={`h-8 rounded-md px-3.5 text-[14px] capitalize transition-colors ${vis === v ? "bg-ink font-medium text-white" : "text-muted hover:text-ink"}`}
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
        className="flex h-10 items-center gap-2 rounded-lg px-4 text-[14px] text-ink outline outline-1 -outline-offset-1 outline-edge transition-colors hover:bg-panel"
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
        <div className="absolute right-0 z-20 mt-2 w-[min(20rem,calc(100vw-2.5rem))] rounded-[14px] bg-white p-2 shadow-[0_24px_64px_-16px_#0a0a0a40] outline outline-1 -outline-offset-1 outline-edge">
          {draft && <p className="px-2 pt-1 pb-2 text-[13px] text-muted">Draft: only you can open it until it&apos;s published.</p>}
          {links.map((l) => (
            <button
              key={l.label}
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(l.url);
                setCopied(l.label);
              }}
              className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left transition-colors hover:bg-panel"
            >
              <span className="w-10 shrink-0 font-mono text-[11px] uppercase tracking-[1px] text-muted">{l.label}</span>
              <code className="min-w-0 flex-1 truncate font-mono text-[12px] text-ink">{l.url}</code>
              <span className="shrink-0 text-[13px] font-medium text-ink">{copied === l.label ? "Copied" : "Copy"}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
