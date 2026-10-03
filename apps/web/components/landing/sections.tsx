import Link from "next/link";
import type { ReactNode } from "react";
import { ChefHatIcon, CornerDownRightIcon } from "./icons";
import { HandleField, Label, Logo, SectionTitle } from "./primitives";

const STORIES: { title: string; person: string; quote: string; knows: string[]; artifact: ReactNode }[] = [
  {
    title: "The family calendar",
    person: "Adam · dad of two",
    quote:
      "Emma manages the family calendar. She shares availability with Adam’s agent so it can make plans within the boundaries she sets.",
    knows: ["The family calendar", "School runs and kids’ activities", "“Keep Sundays free”"],
    artifact: (
      <div className="flex flex-col gap-[18px] p-6">
        <div className="flex flex-col gap-[5px]">
          <Label>Adam’s agent</Label>
          <p className="text-base leading-[23px] text-ink">Is the 19th free for Adam’s golf trip?</p>
        </div>
        <div className="flex flex-col gap-[5px] border-l-2 border-ink py-0.5 pl-3.5">
          <Label>Emma’s space</Label>
          <p className="text-base leading-[23px] text-ink">
            The 19th is busy from 5pm. The 26th is free. Emma shares availability with Adam’s agent, not private event
            details.
          </p>
        </div>
      </div>
    ),
  },
  {
    title: "The CEO everyone pings",
    person: "David · CEO, 40-person team",
    quote:
      "David shares company priorities and discount rules with his team’s agents. Routine questions get answers; exceptions come to him.",
    knows: ["Pricing and discount policy", "This quarter’s priorities", "“Anything over $50k comes to me”"],
    artifact: (
      <>
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-edge px-6 py-[18px]">
          <Label>Example requests</Label>
          <span className="font-mono text-[13px] text-ink">Within the rules, or sent to David</span>
        </div>
        {[
          ["Can Chris offer Acme 15% for two years?", "Yes, up to 15% on 2-year terms.", true],
          ["Is the EU launch still Q4?", "Yes — 18 Nov, per Monday’s plan.", true],
          ["Can we sponsor DevConf for $60k?", "Over $50k — sent to David.", false],
        ].map(([q, a, ok]) => (
          <div key={q as string} className="flex gap-3 border-b border-edge px-6 py-3.5 last:border-b-0">
            <span className="flex h-[22px] items-center">
              <span className={`size-[7px] rounded-full ${ok ? "bg-ink" : "bg-wait"}`} />
            </span>
            <div className="flex flex-1 flex-col gap-0.5 text-[15px] leading-[22px]">
              <p className="font-medium text-ink">{q}</p>
              <p className="text-muted">{a}</p>
            </div>
          </div>
        ))}
      </>
    ),
  },
  {
    title: "The restaurant",
    person: "Marco · owner, Marco’s Trattoria",
    quote:
      "Marco makes table availability and booking rules accessible to customers’ agents, so reservations can come in during service.",
    knows: ["Live tables and opening hours", "Menu, allergens, corkage", "“Groups of 6+ leave a deposit”"],
    artifact: (
      <>
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-edge px-6 py-[18px]">
          <Label className="text-ink">Reservation confirmed</Label>
          <Label>Example booking</Label>
        </div>
        <div className="flex flex-col gap-5 p-6">
          <p className="text-[32px] leading-[43px] font-medium tracking-[-1.4px] text-ink sm:text-[36px]">Friday, 8:30pm</p>
          <dl className="grid grid-cols-3 gap-6">
            {[
              ["Guests", "4"],
              ["Table", "Terrace 7"],
              ["Name", "James R."],
            ].map(([k, v]) => (
              <div key={k} className="flex flex-col gap-1">
                <dt>
                  <Label>{k}</Label>
                </dt>
                <dd className="text-base font-medium text-ink">{v}</dd>
              </div>
            ))}
          </dl>
          <div className="flex gap-2.5 rounded-lg bg-panel px-3.5 py-3">
            <ChefHatIcon className="mt-0.5 size-[18px] shrink-0 text-muted" strokeWidth={1.75} />
            <p className="flex-1 text-[15px] leading-[22px] text-muted">Window table requested. Added to the booking.</p>
          </div>
        </div>
      </>
    ),
  },
];

export function Stories() {
  return (
    <section id="stories" className="flex flex-col gap-16 border-t border-edge bg-panel px-5 pt-20 pb-16 sm:px-10 lg:px-20 lg:pt-[120px] lg:pb-20">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <SectionTitle eyebrow="Everyday examples" className="lg:w-[880px]">
          If people wait on you, <br className="hidden sm:inline" />
          you need a space.
        </SectionTitle>
        <p className="text-base leading-6 text-muted lg:w-[300px]">Illustrative scenarios showing what a space could handle.</p>
      </div>
      <ol>
        {STORIES.map((s, i) => (
          <li key={s.title} className="flex flex-col gap-8 border-t border-edge py-12 lg:flex-row lg:gap-14">
            <div className="flex flex-col gap-2.5 lg:w-[260px] lg:shrink-0">
              <span className="font-mono text-[13px] tracking-[1px] text-ink">{String(i + 1).padStart(2, "0")}</span>
              <h3 className="text-[34px] leading-9 font-medium tracking-[-1.4px] text-ink">{s.title}</h3>
              <p className="text-[15px] text-muted">{s.person}</p>
            </div>
            <div className="flex flex-col gap-6 lg:w-[440px] lg:shrink-0">
              <p className="text-[22px] leading-[29px] font-medium tracking-[-1px] text-ink sm:text-[24px] sm:leading-[31px]">
                {s.quote}
              </p>
              <div className="flex flex-col gap-2.5">
                <Label>What it knows</Label>
                <ul className="flex flex-col gap-1.5">
                  {s.knows.map((k) => (
                    <li key={k} className="flex items-center gap-2.5 text-[15px] text-ink">
                      <span className="size-[5px] shrink-0 rounded-full bg-ink" />
                      {k}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <div className="rounded-[14px] bg-white outline outline-1 -outline-offset-1 outline-edge">{s.artifact}</div>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

const RULE_COLUMNS = [
  {
    label: "Answers on its own",
    dot: "bg-white",
    rules: ["Discounts up to 15% on two-year terms", "What the team is working on this quarter", "My calendar, as free / busy only", "Who owns which customer"],
  },
  {
    label: "Asks me first",
    dot: "bg-wait",
    rules: ["Any spend over $50,000", "Anything with a customer’s legal team", "New meetings longer than 30 minutes", "Questions it hasn’t seen before"],
  },
  {
    label: "Never shares",
    dot: "outline outline-[1.5px] -outline-offset-1 outline-white",
    rules: ["Salaries and compensation", "Board materials", "Anything from my personal email", "Where I am right now"],
  },
];
const CALLERS = [
  ["Anyone at Northwind", "allowed"],
  ["Emma’s space", "allowed"],
  ["Investors’ agents", "ask first"],
  ["Unknown agents", "blocked"],
];

export function Rules() {
  return (
    <section id="rules" className="flex flex-col gap-14 bg-ink px-5 py-20 sm:px-10 lg:gap-[72px] lg:px-20 lg:py-[120px]">
      <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:gap-20">
        <SectionTitle eyebrow="You stay in charge" dark className="lg:w-[700px] lg:shrink-0">
          It speaks for you only where you’ve said it can.
        </SectionTitle>
        <p className="flex-1 text-[18px] leading-7 text-dark-muted">
          You decide who can ask and what they can do. Requests beyond their permissions stay blocked. Exceptions come to
          you for a decision; changing a rule is always your choice.
        </p>
      </div>

      <div className="rounded-2xl outline outline-1 -outline-offset-1 outline-dark-line">
        <div className="flex items-center justify-between gap-4 border-b border-dark-line px-5 py-[18px] sm:px-7">
          <span className="flex min-w-0 items-center gap-2.5">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-edge text-[13px] font-semibold text-ink">D</span>
            <span className="truncate font-mono text-[14px] text-white">agentspace.me/david</span>
          </span>
          <Label className="text-dark-muted">Example rules</Label>
        </div>
        <div className="grid md:grid-cols-3">
          {RULE_COLUMNS.map((c, i) => (
            <div
              key={c.label}
              className={`flex flex-col gap-5 p-5 sm:p-7 ${i > 0 ? "border-t border-dark-line md:border-t-0 md:border-l" : ""}`}
            >
              <span className="flex items-center gap-2.5 text-[17px] font-medium text-white">
                <span className={`size-2 rounded-full ${c.dot}`} />
                {c.label}
              </span>
              <ul>
                {c.rules.map((r) => (
                  <li key={r} className="border-t border-dark-line py-3 text-[15px] leading-[21px] text-white">
                    {r}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-x-7 gap-y-3 border-t border-dark-line px-5 py-[18px] sm:px-7">
          <Label className="text-dark-muted">Who can call</Label>
          {CALLERS.map(([who, status]) => (
            <span key={who} className="flex items-center gap-2">
              <span className="text-[15px] text-white">{who}</span>
              <span className="font-mono text-[12px] text-dark-muted">{status}</span>
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

const SETUP: { title: string; body: string; detail: ReactNode }[] = [
  {
    title: "Show it what you know",
    body: "Choose the calendar, documents, or business information your space can use. Add the context it needs to answer on your behalf.",
    detail: (
      <div className="grid w-fit grid-cols-[auto_auto] justify-items-start gap-2">
        {["Calendar", "Documents", "Email", "Team knowledge"].map((s) => (
          <span key={s} className="rounded-full px-3 py-[7px] text-[14px] text-ink outline outline-1 -outline-offset-1 outline-edge">
            {s}
          </span>
        ))}
      </div>
    ),
  },
  {
    title: "Draw the lines",
    body: "Say what it can answer alone, what it should ask you about, and what it never touches. In plain words, not settings.",
    detail: (
      <div className="flex gap-2.5 rounded-[10px] bg-panel px-3.5 py-3 outline outline-1 -outline-offset-1 outline-edge">
        <CornerDownRightIcon className="mt-0.5 size-4 shrink-0 text-muted" />
        <p className="flex-1 text-[15px] leading-[21px] text-ink">“If it’s about money over $50k, ask me first.”</p>
      </div>
    ),
  },
  {
    title: "Share your address",
    body: "Share your address with people you authorize. You can use a private address without joining the directory, or opt in to discovery.",
    detail: (
      <div className="flex items-center gap-2.5 rounded-[10px] bg-ink px-3.5 py-3 font-mono text-[14px]">
        <span className="text-dark-muted">MCP</span>
        <span className="flex-1 text-white">Your address. Your permissions.</span>
      </div>
    ),
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="flex flex-col gap-14 bg-white px-5 py-20 sm:px-10 lg:gap-[72px] lg:px-20 lg:py-[120px]">
      <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
        <SectionTitle eyebrow="How it works" className="lg:w-[700px]">
          Set it up once. Stop answering the same thing twice.
        </SectionTitle>
        <div className="flex flex-col gap-2 border-l-2 border-edge py-1 pl-5 lg:w-[380px]">
          <p className="text-[15px] font-medium text-ink">Wait, what’s an MCP?</p>
          <p className="text-[15px] leading-[23px] text-muted">
            MCP is a standard for connecting AI agents to tools. Your space exposes only the information and actions you
            choose to allow.
          </p>
        </div>
      </div>
      <ol className="grid gap-12 md:grid-cols-3">
        {SETUP.map((s, i) => (
          <li key={s.title} className="flex flex-col gap-4 border-t border-ink pt-7">
            <span className="text-[56px] leading-[56px] font-medium tracking-[-2.2px] text-ink">{i + 1}</span>
            <h3 className="text-[20px] font-medium text-ink">{s.title}</h3>
            <p className="text-base leading-[25px] text-muted">{s.body}</p>
            <div className="pt-3">{s.detail}</div>
          </li>
        ))}
      </ol>
    </section>
  );
}

export function FinalCta() {
  return (
    <section className="flex flex-col items-center gap-10 border-t border-edge bg-panel px-5 pt-24 pb-24 text-center sm:px-10 lg:px-20 lg:pt-32 lg:pb-[136px]">
      <h2 className="text-[40px] leading-[1.02] font-medium tracking-[-1.6px] text-ink sm:text-[56px] lg:text-[80px] lg:leading-[80px] lg:tracking-[-3.2px]">
        The next agent that needs you <br className="hidden md:inline" />
        shouldn’t have to wait.
      </h2>
      <p className="text-[17px] text-muted sm:text-[19px]">
        Start with the questions you answer most. Set the boundaries that matter to you.
      </p>
      <HandleField id="cta-handle" />
      <p className="text-[14px] text-muted">Early-stage project · Pricing and integrations to be announced</p>
    </section>
  );
}

const FOOTER_LINKS = [
  ["Directory", "/directory"],
  ["Privacy", "#"],
  ["Security", "#"],
  ["X / Twitter", "#"],
];

export function Footer() {
  return (
    <footer className="flex flex-col gap-6 border-t border-edge px-5 py-8 sm:px-10 lg:flex-row lg:items-center lg:justify-between lg:px-20">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-6">
        <Logo small />
        <p className="text-[14px] text-muted">© 2026 Agent Space. Made for the people everything waits on.</p>
      </div>
      <nav className="flex flex-wrap gap-7">
        {FOOTER_LINKS.map(([label, href]) => (
          <Link key={label} href={href} className="text-[14px] text-muted transition-colors hover:text-ink">
            {label}
          </Link>
        ))}
      </nav>
    </footer>
  );
}
