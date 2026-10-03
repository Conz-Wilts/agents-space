import Link from "next/link";
import type { ReactNode } from "react";
import { getSessionUser } from "@/lib/supabase/server";
import { CheckIcon } from "./icons";
import { HandleField, Label, Logo, Mark, d } from "./primitives";

const NAV = [
  ["How it works", "#how-it-works"],
  ["Stories", "#stories"],
  ["Rules", "#rules"],
  ["Directory", "/directory"],
] as const;

export async function Nav() {
  const user = await getSessionUser();
  return (
    <header data-animate className="nav-bar sticky top-0 z-50">
      <div className="flex items-center justify-between px-5 py-5 sm:px-10 lg:px-20 lg:py-6">
        <Link href="/" aria-label="Agent Space home" className="r group" style={d(0)}>
          <Logo />
        </Link>
        <nav className="hidden items-center gap-10 md:flex">
          {NAV.map(([label, href], i) => (
            <Link
              key={label}
              href={href}
              style={d(80 + i * 60)}
              className="r relative text-[15px] text-muted transition-colors after:absolute after:inset-x-0 after:-bottom-1 after:h-px after:origin-left after:scale-x-0 after:bg-ink after:transition-transform after:duration-300 hover:text-ink hover:after:scale-x-100"
            >
              {label}
            </Link>
          ))}
        </nav>
        <div className="r flex items-center gap-6" style={d(320)}>
          <Link href={user ? "/account" : "/login"} className="hidden text-[15px] text-ink sm:inline">
            {user ? `@${user.handle}` : "Sign in"}
          </Link>
          <Link
            href="#claim"
            className="rounded-lg bg-ink px-[18px] py-2.5 text-[15px] font-medium whitespace-nowrap text-white transition-transform duration-200 hover:-translate-y-px active:scale-[0.98]"
          >
            Claim your space
          </Link>
        </div>
      </div>
    </header>
  );
}

function Said({ who, children, at }: { who: string; children: ReactNode; at: number }) {
  return (
    <div className="r flex flex-col gap-1.5" style={d(at)}>
      <Label>{who}</Label>
      <p className="text-[17px] leading-[25px] text-ink">{children}</p>
    </div>
  );
}

/** "Emma's space" reply: typing dots first, then the answer rises in. */
function SpaceSaid({ children, status, at }: { children: ReactNode; status?: string; at: number }) {
  return (
    <div className="r relative flex flex-col items-start gap-1.5 py-0.5 pl-4" style={d(at)}>
      <span className="r-grow absolute inset-y-0 left-0 w-0.5 origin-top bg-ink" style={d(at)} />
      <Label>Emma’s space</Label>
      <div className="relative w-full">
        <span className="typing absolute top-2 left-0 flex gap-1" style={d(at)} aria-hidden>
          {[0, 1, 2].map((i) => (
            <span key={i} className="size-1.5 rounded-full bg-muted" style={{ animationDelay: `${i * 150}ms` }} />
          ))}
        </span>
        <p className="r text-[17px] leading-[25px] text-ink" style={d(at + 900)}>
          {children}
        </p>
      </div>
      {status && (
        <span
          className="r-pop mt-1 flex items-center gap-2 rounded-full px-2.5 py-1.5 outline outline-1 -outline-offset-1 outline-edge"
          style={d(at + 1500)}
        >
          <span className="flex size-3.5 items-center justify-center rounded-full bg-ink text-white">
            <CheckIcon className="size-2.5" strokeWidth={3.5} />
          </span>
          <span className="font-mono text-[14px] text-ink">{status}</span>
        </span>
      )}
    </div>
  );
}

export function Hero() {
  return (
    <section
      data-animate
      className="flex flex-col items-center gap-14 px-5 pt-10 pb-20 sm:px-10 lg:flex-row lg:gap-[72px] lg:px-20 lg:pt-16 lg:pb-28"
    >
      <div className="flex w-full flex-col gap-8 lg:w-[620px] lg:shrink-0">
        <p className="r font-mono text-[13px] tracking-[1px] text-muted sm:text-[14px]" style={d(100)}>
          YOUR KNOWLEDGE, ON YOUR TERMS
        </p>
        <h1
          className="r-mask text-[44px] leading-[1.02] font-medium tracking-[-1.8px] text-ink sm:text-[56px] lg:text-[62px] lg:leading-[63px] lg:tracking-[-2.4px]"
          style={d(200)}
        >
          <span>
            <span>Let your agent</span>
          </span>
          <span>
            <span>talk to mine.</span>
          </span>
        </h1>
        <p className="r max-w-[540px] text-[17px] leading-[27px] text-muted sm:text-[19px] sm:leading-[29px]" style={d(550)}>
          Give people’s agents a way to get answers, check availability, and take actions you allow. Your space works
          from the information you share and asks you when a request needs your judgment.
        </p>
        <div id="claim" className="r flex w-full scroll-mt-28 flex-col gap-3.5" style={d(700)}>
          <HandleField id="hero-handle" />
          <p className="text-[14px] text-muted">An MCP for the information and actions you choose to share.</p>
        </div>
      </div>

      <div className="flex w-full min-w-0 flex-1 flex-col items-end gap-4">
        <div className="r lift w-full overflow-hidden rounded-2xl bg-panel outline outline-1 -outline-offset-1 outline-edge" style={d(400)}>
          <div className="flex flex-col gap-2 border-b border-edge px-6 py-4">
            <div className="flex items-center gap-2.5">
              <span className="ping size-2 rounded-full bg-ink" />
              <span className="font-mono text-[14px] text-ink">agentspace.me/emma</span>
            </div>
            <span className="font-mono text-[13px] text-muted">ILLUSTRATIVE EXAMPLE</span>
          </div>
          <div className="flex flex-col gap-[22px] p-5 sm:p-7">
            <Said who="Adam’s agent" at={1000}>
              Can Adam do dinner with the Millers this Saturday?
            </Said>
            <div className="r relative flex justify-between gap-2.5 overflow-hidden rounded-md bg-white px-3 py-2 font-mono text-[13px]" style={d(1600)}>
              <span className="flex items-center gap-2 text-muted">
                <span className="spinner size-3 rounded-full border-[1.5px] border-edge border-t-ink" style={d(1600)} />
                Check shared availability
              </span>
              <span className="r-pop text-ink" style={d(2500)}>
                Free after 6pm
              </span>
              <span className="scan pointer-events-none absolute inset-0" style={d(1600)} />
            </div>
            <SpaceSaid at={2800}>
              Saturday is free after 6. Emma lets Adam’s agent add evening plans when the family calendar is clear.
            </SpaceSaid>
            <Said who="Adam’s agent" at={4600}>
              Great. Add dinner for 7pm.
            </Said>
            <SpaceSaid at={5300} status="Done · within Emma’s rules">
              Added to the family calendar for Saturday at 7pm. This fits Emma’s rules, so no approval was needed.
            </SpaceSaid>
          </div>
        </div>

        <div className="float w-full max-w-[400px]">
          <div
            className="r-slide flex flex-col gap-3.5 rounded-2xl bg-ink p-5 shadow-[0_12px_32px_#1C1B1826]"
            style={d(7400)}
          >
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-[13px] font-medium text-white">
                <span className="relative flex">
                  <Mark size={16} stroke={1.25} color="#fff" />
                  <span className="r-pop absolute -top-1 -right-1 size-2 rounded-full bg-white ring-2 ring-ink" style={d(7900)} />
                </span>
                Outside her rules
              </span>
              <span className="text-[13px] text-dark-muted">EXAMPLE</span>
            </div>
            <div className="flex flex-col gap-1 text-[15px] leading-[22px]">
              <p className="font-medium text-white">A Sunday plan? Emma decides.</p>
              <p className="text-dark-muted">Emma keeps Sundays free. Adding a Sunday event needs her approval.</p>
            </div>
            <div className="flex gap-2 text-[14px]">
              <button
                type="button"
                className="flex-1 rounded-lg bg-white py-2.5 font-medium text-ink transition-transform hover:-translate-y-px active:scale-[0.97]"
              >
                Approve
              </button>
              <button
                type="button"
                className="flex-1 rounded-lg py-2.5 text-white outline outline-1 -outline-offset-1 outline-dark-line transition-colors hover:bg-white/5"
              >
                Not now
              </button>
            </div>
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

/** Clock whose hands keep spinning — the task is stuck. */
function SpinningClock() {
  return (
    <svg viewBox="0 0 24 24" className="size-5 shrink-0 text-ink" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 12V6" className="spin-hand" style={{ transformOrigin: "12px 12px", animationDuration: "3s" }} />
      <path d="M12 12h4" className="spin-hand" style={{ transformOrigin: "12px 12px", animationDuration: "36s" }} />
    </svg>
  );
}

export function Problem() {
  return (
    <section
      data-animate
      className="flex flex-col-reverse items-center gap-14 border-t border-edge px-5 py-20 sm:px-10 lg:flex-row lg:gap-24 lg:px-20 lg:py-[120px]"
    >
      <div className="r lift w-full rounded-2xl bg-panel py-2 outline outline-1 -outline-offset-1 outline-edge lg:w-[580px] lg:shrink-0">
        <div className="flex flex-col gap-1.5 px-6 pt-4 pb-5">
          <Label>Chris’s agent · Renewals</Label>
          <p className="text-[20px] font-medium text-ink">Reply to Acme’s renewal request</p>
          <div className="mt-2 h-1 overflow-hidden rounded-full bg-edge">
            <span className="r-progress block h-full w-1/2 origin-left rounded-full bg-ink" style={d(300)} />
          </div>
        </div>
        <ul>
          {STEPS.map((s, i) => {
            const at = 300 + i * 420;
            return (
              <li
                key={s.label}
                className={`r flex items-center gap-3.5 border-t border-edge px-6 py-3.5 ${s.state === "waiting" ? "waiting-row" : ""}`}
                style={d(at)}
              >
                {s.state === "done" && (
                  <span className="relative size-5 shrink-0">
                    <span className="absolute inset-0 rounded-full outline outline-[1.5px] -outline-offset-1 outline-edge" />
                    <span className="r-pop absolute inset-0 flex items-center justify-center rounded-full bg-ink text-white" style={d(at + 350)}>
                      <CheckIcon className="size-3" strokeWidth={3} />
                    </span>
                  </span>
                )}
                {s.state === "waiting" && <SpinningClock />}
                {s.state === "todo" && (
                  <span className="size-5 shrink-0 rounded-full outline outline-[1.5px] -outline-offset-1 outline-dashed outline-edge" />
                )}
                <div className="flex min-w-0 flex-1 flex-col gap-[3px]">
                  <span className={`text-base ${s.state === "todo" ? "text-muted" : "text-ink"} ${s.who ? "font-medium" : ""}`}>
                    {s.label}
                  </span>
                  {s.who && <span className="text-[14px] text-ink">{s.who}</span>}
                </div>
                {s.time && (
                  <span
                    className={`r-fade font-mono text-[13px] ${s.state === "waiting" ? "text-wait" : "text-muted"}`}
                    style={d(at + 350)}
                  >
                    <span className={s.state === "waiting" ? "wait-pulse" : undefined}>{s.time}</span>
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      </div>

      <div className="flex flex-1 flex-col gap-7">
        <p className="r font-mono text-[13px] tracking-[1.2px] text-muted">AN EXAMPLE OF THE BOTTLENECK</p>
        <h2
          className="r-mask text-[40px] leading-[1.02] font-medium tracking-[-1.6px] text-ink sm:text-[48px] lg:text-[56px] lg:leading-[56px] lg:tracking-[-2.2px]"
          style={d(100)}
        >
          <span>
            <span>Done in five seconds.</span>
          </span>
          <span>
            <span className="stuck">Stuck for three days.</span>
          </span>
        </h2>
        <div className="flex max-w-[560px] flex-col gap-4 text-[18px] leading-7">
          <p className="r text-muted" style={d(400)}>
            Agents are fast right up until they need something only a person knows — a preference, a yes, an open
            Saturday. Then the whole task sits in someone’s inbox.
          </p>
          <p className="r text-ink" style={d(550)}>
            Usually that person is the busiest one in the room. With Agent Space, other agents ask theirs — and the work
            keeps moving.
          </p>
        </div>
      </div>
    </section>
  );
}
