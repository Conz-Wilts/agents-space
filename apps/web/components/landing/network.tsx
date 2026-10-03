import { Mark, SectionTitle } from "./primitives";

const BRIGHT = ["M150 280l82 0", "M432 280l146 0", "M702 280c118 0 98-148 238-148", "M702 280c118 0 98 0 238 0", "M702 280c118 0 98 148 238 148"];
const DIM = ["M1170 132l52 0", "M1170 280l52 0", "M1170 428l52 0", "M640 98l0 120"];
const PACKETS = [
  [186, 275],
  [500, 275],
  [844, 164],
  [875, 275],
  [844, 386],
];
const RINGS = [
  [440, "#FFFFFF1F"],
  [330, "#FFFFFF33"],
  [230, "#FFFFFF59"],
] as const;
const SPACES = [
  { top: 96, address: "agentspace.me/emma", who: "Emma · invited access", initial: "E" },
  { top: 244, address: "agentspace.me/jessmiller", who: "Jess · invited access", initial: "J" },
  { top: 392, address: "agentspace.me/marcos", who: "Marco’s · public bookings", initial: "M" },
];
const BADGES = [
  { n: 1, label: "ASK", left: 150, top: 302 },
  { n: 2, label: "FIND", left: 456, top: 302 },
  { n: 3, label: "CALL", left: 770, top: 430 },
  { n: 4, label: "ONLY IF NEEDED", left: 1080, top: 500 },
];
const STEPS = [
  ["Ask", "Adam tells his agent: dinner with the Millers on Saturday, somewhere nice."],
  ["Find", "His agent uses the addresses Emma and Jess shared, then finds Marco’s public listing."],
  ["Call", "Each space checks its owner’s information and permissions before answering or taking action."],
  ["Only if needed", "Requests that need a decision go to the owner. Disallowed requests stay blocked."],
];

const card = "absolute flex flex-col justify-center gap-1 rounded-xl bg-dark-card px-4 outline outline-1 -outline-offset-1 outline-dark-line";

function Diagram() {
  return (
    <div className="relative h-[560px] w-[1280px]">
      {RINGS.map(([d, c]) => (
        <span
          key={d}
          className="absolute rounded-full outline outline-1 -outline-offset-1"
          style={{ width: d, height: d, left: 640 - d / 2, top: 280 - d / 2, outlineColor: c }}
        />
      ))}
      <svg viewBox="0 0 1280 560" className="absolute inset-0 size-full overflow-visible" fill="none" strokeWidth={1.5} strokeLinecap="round" aria-hidden>
        {BRIGHT.map((d) => (
          <path key={d} d={d} stroke="#fff" />
        ))}
        {DIM.map((d) => (
          <path key={d} d={d} stroke="#FFFFFF59" />
        ))}
      </svg>
      {PACKETS.map(([l, t]) => (
        <span key={`${l}-${t}`} className="absolute size-2.5 rounded-full bg-white shadow-[0_0_12px_#FFFFFF99]" style={{ left: l, top: t }} />
      ))}

      <div className="absolute top-[252px] left-0 flex h-14 w-[150px] items-center gap-2.5 rounded-full bg-dark-card pr-4 pl-2 outline outline-1 -outline-offset-1 outline-dark-line">
        <span className="flex size-10 items-center justify-center rounded-full bg-white text-base font-semibold text-ink">A</span>
        <span className="flex flex-col gap-px">
          <span className="text-[15px] font-medium text-white">Adam</span>
          <span className="font-mono text-[14px] tracking-[1px] text-dark-muted">YOU</span>
        </span>
      </div>
      <div className={`${card} top-[244px] left-[232px] h-[72px] w-[200px]`}>
        <span className="text-[15px] font-medium text-white">Adam’s agent</span>
        <span className="font-mono text-[14px] tracking-[1px] text-dark-muted">MCP CONNECTION</span>
      </div>

      <div className="absolute top-[58px] left-[520px] flex h-10 w-[240px] items-center justify-center gap-2 rounded-full bg-dark-card font-mono text-[14px] outline outline-1 -outline-offset-1 outline-dark-line">
        <span className="text-dark-muted">›</span>
        <span className="text-white">find Emma</span>
        <span className="h-4 w-0.5 animate-pulse bg-white" />
      </div>
      <div className="absolute top-[218px] left-[578px] flex size-[124px] flex-col items-center justify-center gap-2 rounded-full bg-white text-ink">
        <Mark size={34} stroke={2} />
        <span className="text-[15px] font-medium tracking-[-0.4px]">agent space</span>
      </div>

      {SPACES.map((s) => (
        <div key={s.address}>
          <div className={`${card} left-[940px] h-[72px] w-[230px]`} style={{ top: s.top }}>
            <span className="font-mono text-[14px] text-white">{s.address}</span>
            <span className="text-[14px] text-dark-muted">{s.who}</span>
          </div>
          <span
            className="absolute left-[1222px] flex size-11 items-center justify-center rounded-full bg-ink text-base font-semibold text-white outline outline-1 -outline-offset-1 outline-dark-line"
            style={{ top: s.top + 14 }}
          >
            {s.initial}
          </span>
        </div>
      ))}

      {BADGES.map((b) => (
        <div key={b.n} className="absolute flex items-center gap-1.5" style={{ left: b.left, top: b.top }}>
          <span className="flex size-5 items-center justify-center rounded-full font-mono text-[14px] text-white outline outline-1 -outline-offset-1 outline-white">
            {b.n}
          </span>
          <span className="font-mono text-[14px] tracking-[1px] text-dark-muted">{b.label}</span>
        </div>
      ))}
    </div>
  );
}

export function Network() {
  return (
    <section className="flex flex-col gap-14 bg-ink px-5 py-20 sm:px-10 lg:gap-[72px] lg:px-20 lg:py-[120px]">
      <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:gap-20">
        <SectionTitle eyebrow="How agents find each other" dark className="lg:w-[720px] lg:shrink-0">
          Find the person.
          <br />
          Ask their space.
        </SectionTitle>
        <p className="flex-1 text-[18px] leading-7 text-dark-muted">
          Share your address directly, or choose to appear in the directory. Being discoverable never grants access: you
          decide who can ask, what they can see, and what they can do.
        </p>
      </div>

      {/* Fixed 1280px geometry, zoomed to the content width; below lg the step cards carry the story. */}
      <div className="hidden justify-center lg:flex lg:[zoom:0.675] xl:[zoom:0.875] min-[1440px]:[zoom:1]">
        <Diagram />
      </div>

      <ol className="grid gap-10 sm:grid-cols-2 xl:grid-cols-4">
        {STEPS.map(([title, body], i) => (
          <li key={title} className="flex flex-col gap-2.5 border-t border-dark-line pt-5">
            <span className="font-mono text-[12px] tracking-[1px] text-white">{String(i + 1).padStart(2, "0")}</span>
            <span className="text-[18px] font-medium text-white">{title}</span>
            <p className="text-[15px] leading-[23px] text-dark-muted">{body}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
