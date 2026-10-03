import { Mark, SectionTitle, d } from "./primitives";

// Paths in the 1280×560 diagram space: [d, ms it draws in, length (rounded up; drives the dash draw)].
const BRIGHT: [string, number, number][] = [
  ["M150 280l82 0", 300, 82],
  ["M432 280l146 0", 700, 146],
  ["M702 280c118 0 98-148 238-148", 1500, 320],
  ["M702 280c118 0 98 0 238 0", 1600, 240],
  ["M702 280c118 0 98 148 238 148", 1700, 320],
];
const DIM: [string, number, number][] = [
  ["M640 98l0 120", 1100, 120],
  ["M1170 132l52 0", 2500, 52],
  ["M1170 280l52 0", 2600, 52],
  ["M1170 428l52 0", 2700, 52],
];
// Packets loop the whole journey: ask → find → call (fan-out) → owner.
const LOOP_START = 3000;
const PACKETS: [string, number, boolean?][] = [
  [BRIGHT[0][0], 0],
  [BRIGHT[1][0], 900],
  [BRIGHT[2][0], 1900],
  [BRIGHT[3][0], 1900],
  [BRIGHT[4][0], 1900],
  [DIM[1][0], 2950, true],
  [DIM[2][0], 2950, true],
  [DIM[3][0], 2950, true],
];
const RINGS = [
  [440, "#FFFFFF1F", 400],
  [330, "#FFFFFF33", 250],
  [230, "#FFFFFF59", 100],
] as const;
const SPACES = [
  { top: 96, address: "agentspace.me/emma", who: "Emma · invited access", initial: "E" },
  { top: 244, address: "agentspace.me/jessmiller", who: "Jess · invited access", initial: "J" },
  { top: 392, address: "agentspace.me/marcos", who: "Marco’s · public bookings", initial: "M" },
];
const BADGES = [
  { n: 1, label: "ASK", left: 150, top: 302, at: 500 },
  { n: 2, label: "FIND", left: 456, top: 302, at: 900 },
  { n: 3, label: "CALL", left: 770, top: 430, at: 1900 },
  { n: 4, label: "ONLY IF NEEDED", left: 1080, top: 500, at: 2900 },
];
const STEPS = [
  ["Ask", "Adam tells his agent: dinner with the Millers on Saturday, somewhere nice."],
  ["Find", "His agent uses the addresses Emma and Jess shared, then finds Marco’s public listing."],
  ["Call", "Each space checks its owner’s information and permissions before answering or taking action."],
  ["Only if needed", "Requests that need a decision go to the owner. Disallowed requests stay blocked."],
];

const card =
  "absolute flex flex-col justify-center gap-1 rounded-xl bg-dark-card px-4 outline outline-1 -outline-offset-1 outline-dark-line transition-[outline-color] duration-300 hover:outline-white/40";

function Diagram() {
  return (
    <div className="relative h-[560px] w-[1280px]">
      {RINGS.map(([size, color, at]) => (
        <span
          key={size}
          className="r-pop absolute rounded-full outline outline-1 -outline-offset-1"
          style={{ ...d(at), width: size, height: size, left: 640 - size / 2, top: 280 - size / 2, outlineColor: color }}
        />
      ))}
      {[0, 1200, 2400].map((delay) => (
        <span key={delay} className="ripple size-[440px]" style={d(LOOP_START + delay)} />
      ))}

      <svg viewBox="0 0 1280 560" className="absolute inset-0 size-full overflow-visible" fill="none" strokeWidth={1.5} strokeLinecap="round" aria-hidden>
        {[...BRIGHT, ...DIM].map(([path, at, len], i) => (
          <path key={path} d={path} stroke={i < BRIGHT.length ? "#fff" : "#FFFFFF59"} className="r-draw" style={d(at, { "--len": len })} />
        ))}
      </svg>

      {PACKETS.map(([path, delay, dim]) => (
        <span
          key={path}
          className={`packet absolute top-0 left-0 rounded-full bg-white ${dim ? "size-1.5 shadow-[0_0_8px_#FFFFFF80]" : "size-2.5 shadow-[0_0_14px_#FFFFFFb3]"}`}
          style={{ ...d(LOOP_START + delay), offsetPath: `path("${path}")` }}
        />
      ))}

      <div
        className="r-pop absolute top-[252px] left-0 flex h-14 w-[150px] items-center gap-2.5 rounded-full bg-dark-card pr-4 pl-2 outline outline-1 -outline-offset-1 outline-dark-line"
        style={d(0)}
      >
        <span className="flex size-10 items-center justify-center rounded-full bg-white text-base font-semibold text-ink">A</span>
        <span className="flex flex-col gap-px">
          <span className="text-[15px] font-medium text-white">Adam</span>
          <span className="font-mono text-[14px] tracking-[1px] text-dark-muted">YOU</span>
        </span>
      </div>
      <div className={`r ${card} top-[244px] left-[232px] h-[72px] w-[200px]`} style={d(450)}>
        <span className="text-[15px] font-medium text-white">Adam’s agent</span>
        <span className="font-mono text-[14px] tracking-[1px] text-dark-muted">MCP CONNECTION</span>
      </div>

      <div
        className="r absolute top-[58px] left-[520px] flex h-10 w-[240px] items-center justify-center gap-2 rounded-full bg-dark-card font-mono text-[14px] outline outline-1 -outline-offset-1 outline-dark-line"
        style={d(700)}
      >
        <span className="text-dark-muted">›</span>
        <span className="r-type text-white" style={d(950, { "--n": 9 })}>
          find Emma
        </span>
        <span className="caret h-4 w-0.5 bg-white" />
      </div>
      <div className="r-pop absolute top-[218px] left-[578px]" style={d(1000)}>
        <div className="breathe flex size-[124px] flex-col items-center justify-center gap-2 rounded-full bg-white text-ink">
          <span className="hub-mark">
            <Mark size={34} stroke={2} />
          </span>
          <span className="text-[15px] font-medium tracking-[-0.4px]">agent space</span>
        </div>
      </div>

      {SPACES.map((s, i) => (
        <div key={s.address}>
          <div className={`r ${card} left-[940px] h-[72px] w-[230px]`} style={{ ...d(1900 + i * 120), top: s.top }}>
            <span className="font-mono text-[14px] text-white">{s.address}</span>
            <span className="text-[14px] text-dark-muted">{s.who}</span>
          </div>
          <span
            className="r-pop absolute left-[1222px] flex size-11 items-center justify-center rounded-full bg-ink text-base font-semibold text-white outline outline-1 -outline-offset-1 outline-dark-line"
            style={{ ...d(2800 + i * 120), top: s.top + 14 }}
          >
            {s.initial}
          </span>
        </div>
      ))}

      {BADGES.map((b) => (
        <div key={b.n} className="r-fade absolute flex items-center gap-1.5" style={{ ...d(b.at), left: b.left, top: b.top }}>
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
    <section className="spotlight flex flex-col gap-14 bg-ink px-5 py-20 sm:px-10 lg:gap-[72px] lg:px-20 lg:py-[120px]">
      <div data-animate className="flex flex-col gap-8 lg:flex-row lg:items-end lg:gap-20">
        <SectionTitle eyebrow="How agents find each other" dark className="lg:w-[720px] lg:shrink-0">
          Find the person.
          <br />
          Ask their space.
        </SectionTitle>
        <p className="r flex-1 text-[18px] leading-7 text-dark-muted" style={d(300)}>
          Share your address directly, or choose to appear in the directory. Being discoverable never grants access: you
          decide who can ask, what they can see, and what they can do.
        </p>
      </div>

      {/* Fixed 1280px geometry, zoomed to the content width; below lg the step cards carry the story. */}
      <div data-animate className="hidden justify-center lg:flex lg:[zoom:0.675] xl:[zoom:0.875] min-[1440px]:[zoom:1]">
        <Diagram />
      </div>

      <ol data-animate className="grid gap-10 sm:grid-cols-2 xl:grid-cols-4">
        {STEPS.map(([title, body], i) => (
          <li key={title} className="r relative flex flex-col gap-2.5 border-t border-dark-line pt-5" style={d(i * 120)}>
            <span className="r-progress absolute -top-px left-0 h-px w-full origin-left bg-white/50" style={d(i * 120 + 200)} />
            <span className="font-mono text-[12px] tracking-[1px] text-white">{String(i + 1).padStart(2, "0")}</span>
            <span className="text-[18px] font-medium text-white">{title}</span>
            <p className="text-[15px] leading-[23px] text-dark-muted">{body}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
