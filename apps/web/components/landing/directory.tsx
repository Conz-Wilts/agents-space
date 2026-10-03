import Link from "next/link";
import type { ReactNode } from "react";
import type { Agent } from "@agents-space/core";
import { Eyebrow, Label, d } from "./primitives";

const initials = (s: string) =>
  s
    .replace(/^@/, "")
    .split(/[\s-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");

/** Monochrome initials disc, as on the landing's rules card. */
export function Monogram({ name, size = 28, dark = false }: { name: string; size?: number; dark?: boolean }) {
  return (
    <span
      aria-hidden
      className={`inline-grid shrink-0 place-items-center rounded-full font-semibold ${dark ? "bg-ink text-white" : "bg-edge text-ink"}`}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.42) }}
    >
      {initials(name)}
    </span>
  );
}

/** Who made something: Google picture when we have it, else initials. */
export type Creator = { name: string; avatarUrl?: string };

export function Avatar({ creator, size = 28 }: { creator: Creator; size?: number }) {
  if (!creator.avatarUrl) return <Monogram name={creator.name} size={size} />;
  return (
    // Google profile picture; no-referrer avoids googleusercontent 403s.
    <img
      src={creator.avatarUrl}
      alt=""
      referrerPolicy="no-referrer"
      draggable={false}
      className="shrink-0 rounded-full object-cover"
      style={{ width: size, height: size }}
    />
  );
}

/** Page opener for app pages: eyebrow, masked headline, optional aside. Wrap in `data-animate`. */
export function PageTitle({ eyebrow, title, aside }: { eyebrow: string; title: ReactNode; aside?: ReactNode }) {
  return (
    <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
      <div className="flex flex-col gap-6 lg:max-w-[760px]">
        <Eyebrow className="r">{eyebrow}</Eyebrow>
        <h1
          className="r-mask text-[40px] leading-[1.02] font-medium tracking-[-1.6px] text-ink sm:text-[52px] lg:text-[64px] lg:leading-[64px] lg:tracking-[-2.6px]"
          style={d(100)}
        >
          <span>
            <span>{title}</span>
          </span>
        </h1>
      </div>
      {aside && (
        <div className="r lg:w-[380px] lg:shrink-0" style={d(300)}>
          {aside}
        </div>
      )}
    </div>
  );
}

/** Section heading row: mono label with a count, ruled underneath. */
export function SectionHead({ label, count, delay = 0 }: { label: string; count?: number; delay?: number }) {
  return (
    <div className="relative flex items-baseline gap-3 pb-4">
      <Label className="r text-ink">{label}</Label>
      {count !== undefined && (
        <span className="r font-mono text-[12px] text-muted" style={d(delay + 80)}>
          {String(count).padStart(2, "0")}
        </span>
      )}
      <span className="r-progress absolute bottom-0 left-0 h-px w-full origin-left bg-edge" style={d(delay)} />
    </div>
  );
}

/** Agent card in the landing's card language: white, hairline outline, lifts on hover. */
export function AgentTile({
  agent,
  badge,
  creator,
  delay = 0,
}: {
  agent: Agent;
  badge?: string;
  /** Overrides `agent.owner` (e.g. the signed-in owner's Google name and picture). */
  creator?: Creator;
  delay?: number;
}) {
  const by = creator ?? { name: agent.owner };
  return (
    <Link
      href={`/agents/${agent.id}`}
      className="r lift flex h-full flex-col gap-5 rounded-[14px] bg-white p-6 outline outline-1 -outline-offset-1 outline-edge"
      style={d(delay)}
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="pt-0.5 text-[20px] leading-6 font-medium tracking-[-0.6px] text-ink">{agent.name}</h3>
        {badge && (
          <span className="shrink-0 rounded-full px-2.5 py-1 font-mono text-[11px] uppercase tracking-[1px] text-ink outline outline-1 -outline-offset-1 outline-edge">
            {badge}
          </span>
        )}
      </div>
      <p className="-mt-2 line-clamp-2 text-[15px] leading-[22px] text-muted">{agent.tagline}</p>
      {agent.tools.length > 0 && (
        <ul className="flex flex-wrap gap-1.5">
          {agent.tools.slice(0, 4).map((t) => (
            <li key={t} className="rounded-md bg-panel px-2 py-1 text-[12px] text-ink">
              {t}
            </li>
          ))}
          {agent.tools.length > 4 && (
            <li className="px-1 py-1 font-mono text-[12px] text-muted">+{agent.tools.length - 4}</li>
          )}
        </ul>
      )}
      <div className="mt-auto flex min-w-0 items-center gap-2 border-t border-edge pt-4">
        <Avatar creator={by} size={22} />
        <span className="truncate text-[14px] text-ink">{by.name}</span>
      </div>
    </Link>
  );
}

export function TileGrid({ children }: { children: ReactNode }) {
  return <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{children}</ul>;
}

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="r rounded-[14px] border border-dashed border-edge bg-white px-6 py-14 text-center text-[15px] text-muted">
      {children}
    </div>
  );
}
