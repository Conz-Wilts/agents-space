import Link from "next/link";
import type { Agent } from "@agents-space/core";

/** Soft wash + accent pairs, blue family. Agents and people get one by hashing their name. */
const HUES = [
  { wash: "#eff6ff", blob: "#93c5fd", ink: "#1d4ed8" },
  { wash: "#f0f9ff", blob: "#7dd3fc", ink: "#0369a1" },
  { wash: "#eef2ff", blob: "#a5b4fc", ink: "#4338ca" },
  { wash: "#ecfeff", blob: "#67e8f9", ink: "#0e7490" },
  { wash: "#f8fafc", blob: "#bfdbfe", ink: "#1e40af" },
];

const hash = (s: string) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
export const hueFor = (s: string) => HUES[hash(s) % HUES.length];
const initials = (s: string) =>
  s
    .split(/[\s-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");

export function Avatar({ name, size = 24 }: { name: string; size?: number }) {
  const h = hueFor(name);
  return (
    <span
      aria-hidden
      className="inline-grid shrink-0 place-items-center rounded-full font-medium"
      style={{ width: size, height: size, background: h.blob, color: h.ink, fontSize: size * 0.4 }}
    >
      {initials(name)}
    </span>
  );
}

/** Generated poster: hue wash with two blurred blobs and the agent's monogram tile. */
function Poster({ name }: { name: string }) {
  const h = hueFor(name);
  const n = hash(name);
  return (
    <div className="absolute inset-0 overflow-hidden" style={{ background: h.wash }}>
      <div
        className="absolute size-40 rounded-full opacity-70 blur-2xl"
        style={{ background: h.blob, left: `${n % 50}%`, top: "-20%" }}
      />
      <div
        className="absolute size-36 rounded-full opacity-50 blur-2xl"
        style={{ background: h.blob, right: `${(n >> 3) % 40}%`, bottom: "10%" }}
      />
      <div
        className="absolute inset-x-0 top-[30%] mx-auto grid size-16 place-items-center rounded-2xl bg-white/80 text-xl font-semibold shadow-strip backdrop-blur"
        style={{ color: h.ink }}
      >
        {initials(name)}
      </div>
    </div>
  );
}

/** Netflix-style poster tile, linking to the agent page: portrait cover, title + tagline over a bottom fade. */
export function AgentCard({ agent }: { agent: Agent }) {
  return (
    <Link
      href={`/agents/${agent.id}`}
      title={agent.tagline}
      className="group relative block aspect-[2/3] overflow-hidden rounded-xl border border-line bg-surface transition duration-200 hover:z-10 hover:scale-[1.04] hover:shadow-float"
    >
      <Poster name={agent.name} />
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-white via-white/90 to-transparent p-3 pt-10">
        <h3 className="truncate text-sm font-semibold">{agent.name}</h3>
        <p className="mt-0.5 line-clamp-2 text-xs text-fg-muted">{agent.tagline}</p>
        <div className="mt-2 flex min-w-0 items-center gap-1.5 text-[11px] text-fg-muted">
          <Avatar name={agent.owner} size={16} />
          <span className="truncate">{agent.owner}</span>
        </div>
      </div>
    </Link>
  );
}

export function PersonIcon({ name, count }: { name: string; count: number }) {
  return (
    <li className="flex w-20 flex-col items-center gap-1.5 text-center" title={`${name} · ${count} agent${count === 1 ? "" : "s"}`}>
      <Avatar name={name} size={56} />
      <span className="w-full truncate text-xs">{name}</span>
    </li>
  );
}
