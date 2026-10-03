import Link from "next/link";
import type { ReactNode } from "react";
import { CheckIcon, ChefHatIcon, CornerDownRightIcon } from "./icons";
import { HandleField, Label, Logo, SectionTitle, d } from "./primitives";

// Artifacts start after the row's text has landed.
const A = 450;

const STORIES: { title: string; person: string; quote: string; knows: string[]; artifact: ReactNode }[] = [
  {
    title: "The family calendar",
    person: "Adam · dad of two",
    quote:
      "Emma manages the family calendar. She shares availability with Adam’s agent so it can make plans within the boundaries she sets.",
    knows: ["The family calendar", "School runs and kids’ activities", "“Keep Sundays free”"],
    artifact: (
      <div className="flex flex-col gap-[18px] p-6">
        <div className="r flex flex-col gap-[5px]" style={d(A + 200)}>
          <Label>Adam’s agent</Label>
          <p className="text-base leading-[23px] text-ink">Is the 19th free for Adam’s golf trip?</p>
        </div>
        <div className="r relative flex flex-col gap-[5px] py-0.5 pl-3.5" style={d(A + 800)}>
          <span className="r-grow absolute inset-y-0 left-0 w-0.5 origin-top bg-ink" style={d(A + 800)} />
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
        {(
          [
            ["Can Chris offer Acme 15% for two years?", "Yes, up to 15% on 2-year terms.", true],
            ["Is the EU launch still Q4?", "Yes — 18 Nov, per Monday’s plan.", true],
            ["Can we sponsor DevConf for $60k?", "Over $50k — sent to David.", false],
          ] as const
        ).map(([q, a, ok], i) => (
          <div key={q} className="r flex gap-3 border-b border-edge px-6 py-3.5 last:border-b-0" style={d(A + 200 + i * 350)}>
            <span className="flex h-[22px] items-center">
              <span className="r-pop flex" style={d(A + 500 + i * 350)}>
                <span className={`size-[7px] rounded-full ${ok ? "bg-ink" : "ping bg-wait"}`} />
              </span>
            </span>
            <div className="flex flex-1 flex-col gap-0.5 text-[15px] leading-[22px]">
              <p className="font-medium text-ink">{q}</p>
              <p className="r-fade text-muted" style={d(A + 500 + i * 350)}>
                {a}
              </p>
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
          <span className="flex items-center gap-2">
            <span className="r-pop flex size-4 items-center justify-center rounded-full bg-ink text-white" style={d(A + 1300)}>
              <CheckIcon className="size-2.5" strokeWidth={3.5} />
            </span>
            <Label className="text-ink">Reservation confirmed</Label>
          </span>
          <Label>Example booking</Label>
        </div>
        <div className="flex flex-col gap-5 p-6">
          <p
            className="r-mask text-[32px] leading-[43px] font-medium tracking-[-1.4px] text-ink sm:text-[36px]"
            style={d(A + 200)}
          >
            <span>
              <span>Friday, 8:30pm</span>
            </span>
          </p>
          <dl className="grid grid-cols-3 gap-6">
            {[
              ["Guests", "4"],
              ["Table", "Terrace 7"],
              ["Name", "James R."],
            ].map(([k, v], i) => (
              <div key={k} className="r flex flex-col gap-1" style={d(A + 500 + i * 120)}>
                <dt>
                  <Label>{k}</Label>
                </dt>
                <dd className="text-base font-medium text-ink">{v}</dd>
              </div>
            ))}
          </dl>
          <div className="r flex gap-2.5 rounded-lg bg-panel px-3.5 py-3" style={d(A + 1000)}>
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
      <div data-animate className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <SectionTitle eyebrow="Everyday examples" className="lg:w-[880px]">
          If people wait on you, <br className="hidden sm:inline" />
          you need a space.
        </SectionTitle>
        <p className="r text-base leading-6 text-muted lg:w-[300px]" style={d(300)}>
          Illustrative scenarios showing what a space could handle.
        </p>
      </div>
      <ol>
        {STORIES.map((s, i) => (
          <li data-animate key={s.title} className="relative flex flex-col gap-8 py-12 lg:flex-row lg:gap-14">
            <span className="r-progress absolute top-0 left-0 h-px w-full origin-left bg-edge" />
            <div className="flex flex-col gap-2.5 lg:w-[260px] lg:shrink-0">
              <span className="r font-mono text-[13px] tracking-[1px] text-ink">{String(i + 1).padStart(2, "0")}</span>
              <h3 className="r-mask text-[34px] leading-9 font-medium tracking-[-1.4px] text-ink" style={d(60)}>
                <span>
                  <span>{s.title}</span>
                </span>
              </h3>
              <p className="r text-[15px] text-muted" style={d(200)}>
                {s.person}
              </p>
            </div>
            <div className="flex flex-col gap-6 lg:w-[440px] lg:shrink-0">
              <p
                className="r text-[22px] leading-[29px] font-medium tracking-[-1px] text-ink sm:text-[24px] sm:leading-[31px]"
                style={d(150)}
              >
                {s.quote}
              </p>
              <div className="flex flex-col gap-2.5">
                <Label className="r text-muted">What it knows</Label>
                <ul className="flex flex-col gap-1.5">
                  {s.knows.map((k, j) => (
                    <li key={k} className="r flex items-center gap-2.5 text-[15px] text-ink" style={d(350 + j * 90)}>
                      <span className="size-[5px] shrink-0 rounded-full bg-ink" />
                      {k}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <div className="r lift rounded-[14px] bg-white outline outline-1 -outline-offset-1 outline-edge" style={d(A)}>
                {s.artifact}
              </div>
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
    dot: "ping bg-wait",
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
    <section id="rules" className="spotlight flex flex-col gap-14 bg-ink px-5 py-20 sm:px-10 lg:gap-[72px] lg:px-20 lg:py-[120px]">
      <div data-animate className="flex flex-col gap-8 lg:flex-row lg:items-end lg:gap-20">
        <SectionTitle eyebrow="You stay in charge" dark className="lg:w-[700px] lg:shrink-0">
          It speaks for you only where you’ve said it can.
        </SectionTitle>
        <p className="r flex-1 text-[18px] leading-7 text-dark-muted" style={d(300)}>
          You decide who can ask and what they can do. Requests beyond their permissions stay blocked. Exceptions come to
          you for a decision; changing a rule is always your choice.
        </p>
      </div>

      <div data-animate className="rounded-2xl outline outline-1 -outline-offset-1 outline-dark-line">
        <div className="flex items-center justify-between gap-4 border-b border-dark-line px-5 py-[18px] sm:px-7">
          <span className="flex min-w-0 items-center gap-2.5">
            <span className="r-pop flex size-7 shrink-0 items-center justify-center rounded-full bg-edge text-[13px] font-semibold text-ink" style={d(100)}>
              D
            </span>
            <span className="r-type font-mono text-[14px] text-white" style={d(300, { "--n": 19 })}>
              agentspace.me/david
            </span>
          </span>
          <Label className="r-fade text-dark-muted">Example rules</Label>
        </div>
        <div className="grid md:grid-cols-3">
          {RULE_COLUMNS.map((c, i) => (
            <div
              key={c.label}
              className={`flex flex-col gap-5 p-5 sm:p-7 ${i > 0 ? "border-t border-dark-line md:border-t-0 md:border-l" : ""}`}
            >
              <span className="r flex items-center gap-2.5 text-[17px] font-medium text-white" style={d(500 + i * 200)}>
                <span className="r-pop flex" style={d(650 + i * 200)}>
                  <span className={`size-2 rounded-full ${c.dot}`} />
                </span>
                {c.label}
              </span>
              <ul>
                {c.rules.map((r, j) => (
                  <li
                    key={r}
                    className="r border-t border-dark-line py-3 text-[15px] leading-[21px] text-white transition-[padding,color] duration-300 hover:pl-2 hover:text-white/70"
                    style={d(700 + i * 200 + j * 90)}
                  >
                    {r}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-x-7 gap-y-3 border-t border-dark-line px-5 py-[18px] sm:px-7">
          <Label className="r-fade text-dark-muted">Who can call</Label>
          {CALLERS.map(([who, status], i) => (
            <span key={who} className="r flex items-center gap-2" style={d(1600 + i * 140)}>
              <span className="text-[15px] text-white">{who}</span>
              <span
                className={`r-pop font-mono text-[12px] text-dark-muted ${status === "blocked" ? "line-through decoration-white/40" : ""}`}
                style={d(1800 + i * 140)}
              >
                {status}
              </span>
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
        {["Calendar", "Documents", "Email", "Team knowledge"].map((s, i) => (
          <span
            key={s}
            className="r-pop rounded-full px-3 py-[7px] text-[14px] text-ink outline outline-1 -outline-offset-1 outline-edge transition-colors hover:bg-ink hover:text-white"
            style={d(600 + i * 110)}
          >
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
      <div className="r flex gap-2.5 rounded-[10px] bg-panel px-3.5 py-3 outline outline-1 -outline-offset-1 outline-edge" style={d(750)}>
        <CornerDownRightIcon className="nudge mt-0.5 size-4 shrink-0 text-muted" />
        <p className="flex-1 text-[15px] leading-[21px] text-ink">“If it’s about money over $50k, ask me first.”</p>
      </div>
    ),
  },
  {
    title: "Share your address",
    body: "Share your address with people you authorize. You can use a private address without joining the directory, or opt in to discovery.",
    detail: (
      <div className="r flex items-center gap-2.5 rounded-[10px] bg-ink px-3.5 py-3 font-mono text-[14px]" style={d(900)}>
        <span className="text-dark-muted">MCP</span>
        <span className="flex min-w-0 flex-1 items-center text-white">
          <span className="r-type max-w-full" style={d(1150, { "--n": 31 })}>
            Your address. Your permissions.
          </span>
          <span className="caret ml-0.5 h-4 w-0.5 shrink-0 bg-white" />
        </span>
      </div>
    ),
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="flex flex-col gap-14 bg-white px-5 py-20 sm:px-10 lg:gap-[72px] lg:px-20 lg:py-[120px]">
      <div data-animate className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
        <SectionTitle eyebrow="How it works" className="lg:w-[700px]">
          Set it up once. Stop answering the same thing twice.
        </SectionTitle>
        <div className="r relative flex flex-col gap-2 py-1 pl-5 lg:w-[380px]" style={d(350)}>
          <span className="r-grow absolute inset-y-0 left-0 w-0.5 origin-top bg-edge" style={d(350)} />
          <p className="text-[15px] font-medium text-ink">Wait, what’s an MCP?</p>
          <p className="text-[15px] leading-[23px] text-muted">
            MCP is a standard for connecting AI agents to tools. Your space exposes only the information and actions you
            choose to allow.
          </p>
        </div>
      </div>
      <ol data-animate className="grid gap-12 md:grid-cols-3">
        {SETUP.map((s, i) => (
          <li key={s.title} className="relative flex flex-col gap-4 pt-7">
            <span className="r-progress absolute top-0 left-0 h-px w-full origin-left bg-ink" style={d(i * 150)} />
            <span className="r-mask text-[56px] leading-[56px] font-medium tracking-[-2.2px] text-ink" style={d(150 + i * 150)}>
              <span>
                <span>{i + 1}</span>
              </span>
            </span>
            <h3 className="r text-[20px] font-medium text-ink" style={d(300 + i * 150)}>
              {s.title}
            </h3>
            <p className="r text-base leading-[25px] text-muted" style={d(400 + i * 150)}>
              {s.body}
            </p>
            <div className="pt-3">{s.detail}</div>
          </li>
        ))}
      </ol>
    </section>
  );
}

export function FinalCta() {
  return (
    <section
      data-animate
      className="relative isolate flex flex-col items-center gap-10 overflow-hidden border-t border-edge bg-panel px-5 pt-24 pb-24 text-center sm:px-10 lg:px-20 lg:pt-32 lg:pb-[136px]"
    >
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        {[0, 1500, 3000, 4500].map((delay) => (
          <span key={delay} className="ripple ripple-ink size-[1100px]" style={d(delay)} />
        ))}
      </div>
      <h2
        className="r-mask text-[40px] leading-[1.02] font-medium tracking-[-1.6px] text-ink sm:text-[56px] lg:text-[80px] lg:leading-[80px] lg:tracking-[-3.2px]"
        style={d(0)}
      >
        <span>
          <span>The next agent that needs you</span>
        </span>
        <span>
          <span>shouldn’t have to wait.</span>
        </span>
      </h2>
      <p className="r text-[17px] text-muted sm:text-[19px]" style={d(350)}>
        Start with the questions you answer most. Set the boundaries that matter to you.
      </p>
      <div className="r flex w-full justify-center" style={d(500)}>
        <HandleField id="cta-handle" />
      </div>
      <p className="r text-[14px] text-muted" style={d(650)}>
        Early-stage project · Pricing and integrations to be announced
      </p>
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
        <Link href="/" className="group w-fit" aria-label="Agent Space home">
          <Logo small />
        </Link>
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
