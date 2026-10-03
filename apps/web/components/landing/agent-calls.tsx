"use client";

import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { AGENTS, AgentLogo, type AgentId } from "./agents";
import { CheckIcon } from "./icons";

type Scene = {
  agent: AgentId;
  onBehalf: string;
  space: string;
  owner: string;
  ask: string;
  tool: [string, string];
  reply: string;
  outcome: "done" | "ask";
  chip: string;
};

// Illustrative calls from real personal agents into Agent Space addresses.
const SCENES: Scene[] = [
  {
    agent: "muse",
    onBehalf: "Adam",
    space: "emma",
    owner: "Emma’s space",
    ask: "Can Emma do lunch with Adam on Thursday?",
    tool: ["Check shared availability", "Free 12–2pm"],
    reply: "Thursday at 12:30 works. Emma likes somewhere near Union Square — she’ll see it on her calendar.",
    outcome: "done",
    chip: "Lunch held · Thu 12:30",
  },
  {
    agent: "instinct",
    onBehalf: "Priya",
    space: "tonys-pizza",
    owner: "Tony’s Pizza · SF",
    ask: "One large Margherita, delivered to 2nd & Mission at 7:30pm?",
    tool: ["Check menu & delivery zone", "In zone · 35 min"],
    reply: "Confirmed: one large Margherita, $24, at the door by 7:30pm. Want garlic knots with that?",
    outcome: "done",
    chip: "Order placed · arrives 7:30pm",
  },
  {
    agent: "grok",
    onBehalf: "Chris",
    space: "david",
    owner: "David’s space",
    ask: "Can Chris offer Acme 15% off for a two-year renewal?",
    tool: ["Check discount policy", "Up to 15% on 2-yr"],
    reply: "Yes — 15% on a two-year term is within David’s rules. Anything above that comes to him.",
    outcome: "done",
    chip: "Answered within David’s rules",
  },
  {
    agent: "claude",
    onBehalf: "the Millers",
    space: "emma",
    owner: "Emma’s space",
    ask: "Could Emma join a Sunday brunch with the Millers?",
    tool: ["Check Emma’s rules", "Sundays: ask first"],
    reply: "Emma keeps Sundays free, so I can’t say yes for her. I’ve asked her — you’ll hear back here.",
    outcome: "ask",
    chip: "Sent to Emma for approval",
  },
  {
    agent: "chatgpt",
    onBehalf: "James",
    space: "marcos",
    owner: "Marco’s Trattoria",
    ask: "Table for six this Friday at 8pm, terrace if possible?",
    tool: ["Check live tables", "Terrace 7 open"],
    reply: "Terrace 7 is yours at 8pm. Groups of 6+ leave a $50 deposit — I’ve sent the link.",
    outcome: "done",
    chip: "Table held · deposit link sent",
  },
];

const SCENE_MS = 7000;
const at = (ms: number) => ({ "--d": `${ms}ms` }) as CSSProperties;

function Bubble({ label, children, delay }: { label: ReactNode; children: ReactNode; delay: number }) {
  return (
    <div className="r flex flex-col gap-1.5" style={at(delay)}>
      <p className="flex items-center gap-2 font-mono text-[12px] uppercase tracking-[1px] text-muted">{label}</p>
      <p className="text-[17px] leading-[25px] text-ink">{children}</p>
    </div>
  );
}

function SceneView({ s, base }: { s: Scene; base: number }) {
  const t = (ms: number) => at(base + ms);
  const agent = AGENTS[s.agent];
  return (
    <div className="flex flex-col gap-[22px] p-5 sm:p-7">
      {/* Connection: agent → address, with a packet riding the wire */}
      <div className="r flex items-center gap-3" style={t(0)}>
        <AgentLogo id={s.agent} size={38} />
        <div className="relative h-px flex-1 bg-edge">
          <span className="r-progress absolute inset-0 origin-left bg-ink" style={t(150)} />
          <span className="wire-packet absolute top-1/2 size-2 -translate-y-1/2 rounded-full bg-ink" style={t(150)} />
        </div>
        <span className="r-pop rounded-full bg-white px-2.5 py-1 font-mono text-[13px] text-ink outline outline-1 -outline-offset-1 outline-edge" style={t(500)}>
          agentspace.me/{s.space}
        </span>
      </div>

      <Bubble
        delay={base + 600}
        label={
          <>
            {agent.name} <span className="text-wait">· for {s.onBehalf}</span>
          </>
        }
      >
        {s.ask}
      </Bubble>

      <div className="r relative flex justify-between gap-2.5 overflow-hidden rounded-md bg-white px-3 py-2 font-mono text-[13px]" style={t(1300)}>
        <span className="flex items-center gap-2 text-muted">
          <span className="spinner size-3 rounded-full border-[1.5px] border-edge border-t-ink" style={t(1300)} />
          {s.tool[0]}
        </span>
        <span className="r-pop text-right text-ink" style={t(2200)}>
          {s.tool[1]}
        </span>
        <span className="scan pointer-events-none absolute inset-0" style={t(1300)} />
      </div>

      <div className="r relative flex flex-col items-start gap-1.5 py-0.5 pl-4" style={t(2500)}>
        <span className="r-grow absolute inset-y-0 left-0 w-0.5 origin-top bg-ink" style={t(2500)} />
        <p className="font-mono text-[12px] uppercase tracking-[1px] text-muted">{s.owner}</p>
        <div className="relative w-full">
          <span className="typing absolute top-2 left-0 flex gap-1" style={t(2500)} aria-hidden>
            {[0, 1, 2].map((i) => (
              <span key={i} className="size-1.5 rounded-full bg-muted" style={{ animationDelay: `${i * 150}ms` }} />
            ))}
          </span>
          <p className="r text-[17px] leading-[25px] text-ink" style={t(3350)}>
            {s.reply}
          </p>
        </div>
        <span
          className={`r-pop mt-1 flex items-center gap-2 rounded-full px-2.5 py-1.5 outline outline-1 -outline-offset-1 ${
            s.outcome === "done" ? "outline-edge" : "outline-wait"
          }`}
          style={t(4000)}
        >
          {s.outcome === "done" ? (
            <span className="flex size-3.5 items-center justify-center rounded-full bg-ink text-white">
              <CheckIcon className="size-2.5" strokeWidth={3.5} />
            </span>
          ) : (
            <span className="ping size-2 rounded-full bg-wait" />
          )}
          <span className="font-mono text-[14px] text-ink">{s.chip}</span>
        </span>
      </div>
    </div>
  );
}

/**
 * Hero card: real agents (Muse, Instinct, Grok Bot, Claude, ChatGPT) calling people's and
 * businesses' spaces. Auto-advances; hover/focus pauses; tabs jump. No auto-advance with reduced motion.
 */
export function AgentCalls() {
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const [first, setFirst] = useState(true);

  useEffect(() => {
    if (paused || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = setTimeout(() => {
      setFirst(false);
      setI((n) => (n + 1) % SCENES.length);
    }, SCENE_MS + (first ? 900 : 0));
    return () => clearTimeout(id);
  }, [i, paused, first]);

  const s = SCENES[i];
  // The first scene waits for the hero entrance; later scenes start right away.
  const base = first ? 1000 : 150;

  return (
    <div
      className="w-full overflow-hidden rounded-2xl bg-panel outline outline-1 -outline-offset-1 outline-edge"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <div className="relative flex items-center justify-between gap-3 border-b border-edge px-3 py-3 sm:px-5">
        <div role="tablist" aria-label="Agents calling a space" className="flex min-w-0 items-center gap-1">
          {SCENES.map((sc, n) => {
            const active = n === i;
            return (
              <button
                key={sc.agent}
                role="tab"
                aria-selected={active}
                aria-label={`${AGENTS[sc.agent].name} calls agentspace.me/${sc.space}`}
                onClick={() => {
                  setFirst(false);
                  setI(n);
                }}
                className={`flex shrink-0 items-center gap-2 rounded-full py-1 pr-1 pl-1 transition-all duration-500 ${
                  active
                    ? "bg-white pr-3 shadow-[0_1px_2px_#0a0a0a14] outline outline-1 -outline-offset-1 outline-edge"
                    : "opacity-55 hover:opacity-100"
                }`}
              >
                <AgentLogo id={sc.agent} size={30} />
                <span
                  className={`overflow-hidden text-[14px] font-medium whitespace-nowrap text-ink transition-[max-width,opacity] duration-500 ${
                    active ? "max-w-24 opacity-100" : "max-w-0 opacity-0"
                  }`}
                >
                  {AGENTS[sc.agent].name}
                </span>
              </button>
            );
          })}
        </div>
        <span className="hidden shrink-0 items-center gap-2 font-mono text-[12px] text-muted xl:flex">
          <span className="ping size-1.5 rounded-full bg-ink" />
          ILLUSTRATIVE
        </span>
        <span className="absolute inset-x-0 -bottom-px h-0.5 overflow-hidden" aria-hidden>
          <span
            key={`${i}-${paused}`}
            className={`block h-full origin-left bg-ink ${paused ? "scale-x-0" : "scene-progress"}`}
            style={{ animationDuration: `${SCENE_MS + (first ? 900 : 0)}ms` }}
          />
        </span>
      </div>
      {/* data-in on a fresh node restarts every reveal inside it when the scene changes */}
      <div key={i} data-animate data-in className="min-h-[408px] sm:min-h-[392px]">
        <SceneView s={s} base={base} />
      </div>
    </div>
  );
}
