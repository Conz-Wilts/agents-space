"use client";

import { useState, type ReactNode } from "react";

export type Tab = { key: string; label: string; count: number; panel: ReactNode };

/** Segmented toggle with counts. Panels stay mounted (just `hidden`) so the motion observer sees them. */
export function Tabs({ tabs, initial }: { tabs: Tab[]; initial?: string }) {
  const [active, setActive] = useState(initial ?? tabs[0]?.key);

  return (
    <div className="flex flex-col gap-8">
      <div
        role="tablist"
        className="inline-flex max-w-full self-start overflow-x-auto rounded-full bg-white p-1 outline outline-1 -outline-offset-1 outline-edge"
      >
        {tabs.map((t) => {
          const on = t.key === active;
          return (
            <button
              key={t.key}
              type="button"
              role="tab"
              id={`tab-${t.key}`}
              aria-selected={on}
              aria-controls={`panel-${t.key}`}
              onClick={() => setActive(t.key)}
              className={`flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-[14px] font-medium transition-colors duration-200 ${
                on ? "bg-ink text-white" : "text-muted hover:text-ink"
              }`}
            >
              {t.label}
              <span
                className={`rounded-full px-1.5 py-px font-mono text-[11px] ${on ? "bg-white/15 text-white" : "bg-panel text-muted"}`}
              >
                {t.count}
              </span>
            </button>
          );
        })}
      </div>
      {tabs.map((t) => (
        <div key={t.key} role="tabpanel" id={`panel-${t.key}`} aria-labelledby={`tab-${t.key}`} hidden={t.key !== active}>
          {t.panel}
        </div>
      ))}
    </div>
  );
}
