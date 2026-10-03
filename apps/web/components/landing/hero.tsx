import Link from "next/link";
import type { ReactNode } from "react";
import { CheckIcon, ClockIcon } from "./icons";
import { HandleField, Label, Logo, Mark } from "./primitives";

const NAV = [
  ["How it works", "#how-it-works"],
  ["Stories", "#stories"],
  ["Rules", "#rules"],
  ["Directory", "/directory"],
] as const;

export function Nav() {
  return (
    <header className="flex items-center justify-between px-5 py-6 sm:px-10 lg:px-20 lg:py-7">
      <Link href="/" aria-label="Agent Space home">
        <Logo />
      </Link>
      <nav className="hidden items-center gap-10 md:flex">
        {NAV.map(([label, href]) => (
          <Link key={label} href={href} className="text-[15px] text-muted transition-colors hover:text-ink">
            {label}
          </Link>
        ))}
      </nav>
      <div className="flex items-center gap-6">
        <Link href="#" className="hidden text-[15px] text-ink sm:inline">
          Sign in
        </Link>
        <Link
          href="#claim"
          className="rounded-lg bg-ink px-[18px] py-2.5 text-[15px] font-medium whitespace-nowrap text-white transition-opacity hover:opacity-85"
        >
          Claim your space
        </Link>
      </div>
    </header>
  );
}

function Said({ who, children }: { who: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label>{who}</Label>
      <p className="text-[17px] leading-[25px] text-ink">{children}</p>
    </div>
  );
}

function SpaceSaid({ children, status }: { children: ReactNode; status?: string }) {
  return (
    <div className="flex flex-col items-start gap-1.5 border-l-2 border-ink py-0.5 pl-4">
      <Label>Emma’s space</Label>
      <p className="text-[17px] leading-[25px] text-ink">{children}</p>
      {status && (
        <span className="mt-1 flex items-center gap-2 rounded-full px-2.5 py-1.5 outline outline-1 -outline-offset-1 outline-edge">
          <span className="size-[7px] rounded-full bg-ink" />
          <span className="font-mono text-[14px] text-ink">{status}</span>
        </span>
      )}
    </div>
  );
}

export function Hero() {
  return (
    <section className="flex flex-col items-center gap-14 px-5 pt-10 pb-20 sm:px-10 lg:flex-row lg:gap-[72px] lg:px-20 lg:pt-16 lg:pb-28">
      <div className="flex w-full flex-col gap-8 lg:w-[620px] lg:shrink-0">
        <p className="font-mono text-[13px] tracking-[1px] text-muted sm:text-[14px]">YOUR KNOWLEDGE, ON YOUR TERMS</p>
        <h1 className="text-[44px] leading-[1.02] font-medium tracking-[-1.8px] text-ink sm:text-[56px] lg:text-[62px] lg:leading-[63px] lg:tracking-[-2.4px]">
          Let your agent
          <br />
          talk to mine.
        </h1>
        <p className="max-w-[540px] text-[17px] leading-[27px] text-muted sm:text-[19px] sm:leading-[29px]">
          Give people’s agents a way to get answers, check availability, and take actions you allow. Your space works
          from the information you share and asks you when a request needs your judgment.
        </p>
        <div id="claim" className="flex w-full scroll-mt-24 flex-col gap-3.5">
          <HandleField id="hero-handle" />
          <p className="text-[14px] text-muted">An MCP for the information and actions you choose to share.</p>
        </div>
      </div>

      <div className="flex w-full min-w-0 flex-1 flex-col items-end gap-4">
        <div className="w-full overflow-hidden rounded-2xl bg-panel outline outline-1 -outline-offset-1 outline-edge">
          <div className="flex flex-col gap-2 border-b border-edge px-6 py-4">
            <div className="flex items-center gap-2.5">
              <span className="size-2 rounded-full bg-ink" />
              <span className="font-mono text-[14px] text-ink">agentspace.me/emma</span>
            </div>
            <span className="font-mono text-[13px] text-muted">ILLUSTRATIVE EXAMPLE</span>
          </div>
          <div className="flex flex-col gap-[22px] p-5 sm:p-7">
            <Said who="Adam’s agent">Can Adam do dinner with the Millers this Saturday?</Said>
            <div className="flex justify-between gap-2.5 rounded-md bg-white px-3 py-2 font-mono text-[13px]">
              <span className="text-muted">Check shared availability</span>
              <span className="text-ink">Free after 6pm</span>
            </div>
            <SpaceSaid>
              Saturday is free after 6. Emma lets Adam’s agent add evening plans when the family calendar is clear.
            </SpaceSaid>
            <Said who="Adam’s agent">Great. Add dinner for 7pm.</Said>
            <SpaceSaid status="Done · within Emma’s rules">
              Added to the family calendar for Saturday at 7pm. This fits Emma’s rules, so no approval was needed.
            </SpaceSaid>
          </div>
        </div>

        <div className="flex w-full max-w-[400px] flex-col gap-3.5 rounded-2xl bg-ink p-5 shadow-[0_12px_32px_#1C1B1826]">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-[13px] font-medium text-white">
              <Mark size={16} stroke={1.25} color="#fff" />
              Outside her rules
            </span>
            <span className="text-[13px] text-dark-muted">EXAMPLE</span>
          </div>
          <div className="flex flex-col gap-1 text-[15px] leading-[22px]">
            <p className="font-medium text-white">A Sunday plan? Emma decides.</p>
            <p className="text-dark-muted">Emma keeps Sundays free. Adding a Sunday event needs her approval.</p>
          </div>
          <div className="flex gap-2 text-[14px]">
            <button type="button" className="flex-1 rounded-lg bg-white py-2.5 font-medium text-ink">Approve</button>
            <button type="button" className="flex-1 rounded-lg py-2.5 text-white outline outline-1 -outline-offset-1 outline-dark-line">
              Not now
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

const STEPS: { label: string; time?: string; state: "done" | "waiting" | "todo"; who?: string }[] = [
  { label: "Pulled the Acme contract from Drive", time: "0.6s", state: "done" },
  { label: "Summarized 12 months of usage", time: "1.9s", state: "done" },
  { label: "Drafted the renewal email", time: "2.4s", state: "done" },
  { label: "Can we offer 15% off for a 2-year term?", time: "3 days", state: "waiting", who: "Waiting on David (CEO)" },
  { label: "Send reply to Acme", state: "todo" },
  { label: "Update the deal in HubSpot", state: "todo" },
];

export function Problem() {
  return (
    <section className="flex flex-col-reverse items-center gap-14 border-t border-edge px-5 py-20 sm:px-10 lg:flex-row lg:gap-24 lg:px-20 lg:py-[120px]">
      <div className="w-full rounded-2xl bg-panel py-2 outline outline-1 -outline-offset-1 outline-edge lg:w-[580px] lg:shrink-0">
        <div className="flex flex-col gap-1.5 px-6 pt-4 pb-5">
          <Label>Chris’s agent · Renewals</Label>
          <p className="text-[20px] font-medium text-ink">Reply to Acme’s renewal request</p>
        </div>
        <ul>
          {STEPS.map((s) => (
            <li key={s.label} className="flex items-center gap-3.5 border-t border-edge px-6 py-3.5">
              {s.state === "done" && (
                <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-ink text-white">
                  <CheckIcon className="size-3" strokeWidth={3} />
                </span>
              )}
              {s.state === "waiting" && <ClockIcon className="size-5 shrink-0 text-ink" />}
              {s.state === "todo" && (
                <span className="size-5 shrink-0 rounded-full outline outline-[1.5px] -outline-offset-1 outline-edge" />
              )}
              <div className="flex min-w-0 flex-1 flex-col gap-[3px]">
                <span className={`text-base ${s.state === "todo" ? "text-muted" : "text-ink"} ${s.who ? "font-medium" : ""}`}>
                  {s.label}
                </span>
                {s.who && <span className="text-[14px] text-ink">{s.who}</span>}
              </div>
              {s.time && (
                <span className={`font-mono text-[13px] ${s.state === "waiting" ? "text-wait" : "text-muted"}`}>{s.time}</span>
              )}
            </li>
          ))}
        </ul>
      </div>

      <div className="flex flex-1 flex-col gap-7">
        <p className="font-mono text-[13px] tracking-[1.2px] text-muted">AN EXAMPLE OF THE BOTTLENECK</p>
        <h2 className="text-[40px] leading-[1.02] font-medium tracking-[-1.6px] text-ink sm:text-[48px] lg:text-[56px] lg:leading-[56px] lg:tracking-[-2.2px]">
          Done in five seconds. Stuck for three days.
        </h2>
        <div className="flex max-w-[560px] flex-col gap-4 text-[18px] leading-7">
          <p className="text-muted">
            Agents are fast right up until they need something only a person knows — a preference, a yes, an open
            Saturday. Then the whole task sits in someone’s inbox.
          </p>
          <p className="text-ink">
            Usually that person is the busiest one in the room. With Agent Space, other agents ask theirs — and the work
            keeps moving.
          </p>
        </div>
      </div>
    </section>
  );
}
