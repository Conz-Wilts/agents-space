import type { CSSProperties, ReactNode } from "react";

export { HandleField } from "./handle-field";

/** Stagger delay for a reveal class (see globals.css): `style={d(200)}`. */
export const d = (ms: number, extra?: Record<string, string | number>) =>
  ({ "--d": `${ms}ms`, ...extra }) as CSSProperties;

/** The three-circle Agent Space mark. */
export function Mark({ size = 26, stroke = 1.75, color = "currentColor" }: { size?: number; stroke?: number; color?: string }) {
  const dia = size * (16 / 26);
  const off = size * (10 / 26);
  const circle = (left: number, top: number) => (
    <span
      className="absolute rounded-full"
      style={{ left, top, width: dia, height: dia, border: `${stroke}px solid ${color}` }}
    />
  );
  return (
    <span aria-hidden className="relative inline-block shrink-0" style={{ width: size, height: size }}>
      {circle((size - dia) / 2, 0)}
      {circle(0, off)}
      {circle(off, off)}
    </span>
  );
}

export function Logo({ small = false }: { small?: boolean }) {
  return (
    <span className="flex items-center gap-2.5 text-ink">
      <Mark size={small ? 22 : 26} stroke={small ? 1.5 : 1.75} />
      <span
        className={
          small
            ? "text-[20px] leading-6 font-medium tracking-[-0.5px]"
            : "text-[22px] leading-[26px] font-medium tracking-[-0.6px]"
        }
      >
        agent space
      </span>
    </span>
  );
}

export function Eyebrow({ children, dark = false, className = "" }: { children: ReactNode; dark?: boolean; className?: string }) {
  return (
    <p className={`font-mono text-[13px] uppercase tracking-[1px] ${dark ? "text-dark-muted" : "text-muted"} ${className}`}>
      {children}
    </p>
  );
}

/** Section title block: eyebrow + large heading. */
export function SectionTitle({
  eyebrow,
  children,
  dark = false,
  className = "",
}: {
  eyebrow: string;
  children: ReactNode;
  dark?: boolean;
  className?: string;
}) {
  return (
    <div className={`flex flex-col gap-6 ${className}`}>
      <Eyebrow dark={dark} className="r">
        {eyebrow}
      </Eyebrow>
      <h2
        className={`r-mask text-[40px] leading-[1.02] font-medium tracking-[-1.6px] sm:text-[52px] lg:text-[64px] lg:leading-[64px] lg:tracking-[-2.6px] ${
          dark ? "text-white" : "text-ink"
        }`}
      >
        <span>
          <span style={d(120)}>{children}</span>
        </span>
      </h2>
    </div>
  );
}

/** Mono label used inside cards (speaker names, column headers). */
export function Label({ children, className = "text-muted" }: { children: ReactNode; className?: string }) {
  return <p className={`font-mono text-[12px] uppercase tracking-[1px] ${className}`}>{children}</p>;
}
