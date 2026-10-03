"use client";

import { useEffect, useState } from "react";

const MCP_URL = process.env.NEXT_PUBLIC_MCP_URL ?? "http://localhost:3001/mcp";

const HANDLES = ["yourname", "emma", "david", "marcos", "jessmiller"];

/** Cycles typed example handles as the placeholder until the visitor focuses the field. */
function useTypedPlaceholder(active: boolean) {
  const [text, setText] = useState(HANDLES[0]);
  useEffect(() => {
    if (!active || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let word = 0;
    let len = HANDLES[0].length;
    let deleting = true;
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      let delay: number;
      if (deleting) {
        len--;
        delay = 45;
        if (len === 0) {
          deleting = false;
          word = (word + 1) % HANDLES.length;
          delay = 350;
        }
      } else {
        len++;
        delay = 95;
        if (len === HANDLES[word].length) {
          deleting = true;
          delay = 1900;
        }
      }
      setText(HANDLES[word].slice(0, len));
      timer = setTimeout(tick, delay);
    };
    timer = setTimeout(tick, 2200);
    return () => clearTimeout(timer);
  }, [active]);
  return text;
}

type Check = { state: "idle" } | { state: "checking" } | { state: "taken"; reason: string } | { state: "ready"; handle: string };

export function HandleField({ id }: { id: string }) {
  const [focused, setFocused] = useState(false);
  const [value, setValue] = useState("");
  const [check, setCheck] = useState<Check>({ state: "idle" });
  // Set when typed characters were dropped (e.g. a Korean keyboard), so the field never looks dead.
  const [dropped, setDropped] = useState(false);
  const placeholder = useTypedPlaceholder(!focused && !value);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const handle = value.replace(/^-+|-+$/g, "");
    if (!handle) return document.getElementById(id)?.focus();
    setCheck({ state: "checking" });
    try {
      const res = await fetch(`/api/handles/${encodeURIComponent(handle)}`);
      const { available, reason } = (await res.json()) as { available: boolean; reason?: string };
      setCheck(available ? { state: "ready", handle } : { state: "taken", reason: reason ?? `"${handle}" is taken.` });
    } catch {
      setCheck({ state: "taken", reason: "Couldn't check that handle. Try again." });
    }
  }

  return (
    <div className="flex w-full max-w-[520px] flex-col gap-3 text-left">
      <form
        onSubmit={submit}
        // The whole box reads as one field: a click on its padding focuses the input.
        onMouseDown={(e) => {
          if (e.target === e.currentTarget) {
            e.preventDefault();
            document.getElementById(id)?.focus();
          }
        }}
        className="group flex w-full cursor-text items-center justify-between gap-2 rounded-xl bg-panel p-1.5 outline outline-1 -outline-offset-1 outline-edge transition-[outline-color,box-shadow] duration-300 focus-within:shadow-[0_0_0_4px_#0a0a0a14] focus-within:outline-ink"
      >
        <label htmlFor={id} className="relative flex min-w-0 flex-1 cursor-text items-center self-stretch pl-3.5 pr-1.5 font-mono text-base">
          <span className="shrink-0 text-muted">agentspace.me/</span>
          <span className="relative min-w-0 flex-1 self-stretch">
            <input
              id={id}
              name="handle"
              value={value}
              onChange={(e) => {
                const clean = e.target.value.replace(/[^a-z0-9-]/gi, "");
                setDropped(clean.length < e.target.value.length);
                setValue(clean.toLowerCase().slice(0, 32));
                setCheck({ state: "idle" });
              }}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              placeholder={focused ? HANDLES[0] : ""}
              autoComplete="off"
              spellCheck={false}
              aria-label="Choose your handle"
              aria-describedby={`${id}-status`}
              className="h-full w-full min-w-0 bg-transparent text-ink caret-ink outline-none placeholder:text-muted"
            />
            {!value && !focused && (
              <span aria-hidden className="pointer-events-none absolute inset-y-0 left-0 flex items-center text-ink">
                {placeholder}
                <span className="caret ml-px inline-block h-5 w-0.5 bg-ink" />
              </span>
            )}
          </span>
        </label>
        <button
          type="submit"
          disabled={check.state === "checking"}
          className="shrink-0 rounded-lg bg-ink px-4 py-3.5 text-base font-medium whitespace-nowrap text-white transition-transform duration-200 hover:-translate-y-px active:translate-y-0 active:scale-[0.98] disabled:opacity-70 sm:px-[22px]"
        >
          <span className="sm:hidden">{check.state === "checking" ? "Checking…" : "Claim"}</span>
          <span className="hidden sm:inline">{check.state === "checking" ? "Checking…" : "Claim your space"}</span>
        </button>
      </form>
      <div id={`${id}-status`} aria-live="polite">
        {dropped && check.state === "idle" && (
          <p className="text-[14px] font-medium text-ink">Handles use English letters (a–z), numbers and dashes. Switch your keyboard to English.</p>
        )}
        {check.state === "taken" && <p className="text-[14px] font-medium text-ink">{check.reason}</p>}
        {check.state === "ready" && <InstallSteps handle={check.handle} />}
      </div>
    </div>
  );
}

const CLIENTS = ["Claude Code", "Claude", "Cursor", "VS Code"] as const;
type Client = (typeof CLIENTS)[number];

/** How to add the MCP, with the handle to claim in the URL. Claimed on first sign-in, not before. */
function InstallSteps({ handle }: { handle: string }) {
  const [client, setClient] = useState<Client>("Claude Code");
  const url = `${MCP_URL}?claim=${handle}`;
  const install: Record<Client, { how: string; copy: string; link?: string }> = {
    // Claude Code's own MCP OAuth redirects to localhost, so it signs in through our CLI's device login.
    "Claude Code": { how: "Run in your terminal, then approve the code in your browser:", copy: `npx agents-space@latest login --claim ${handle}` },
    Claude: { how: "In Claude, open Settings → Connectors → Add custom connector, and paste:", copy: url },
    Cursor: {
      how: "Install in one click, or add this URL as an MCP server:",
      copy: url,
      link: `cursor://anysphere.cursor-deeplink/mcp/install?name=agents-space&config=${btoa(JSON.stringify({ url }))}`,
    },
    "VS Code": { how: "Run in your terminal:", copy: `code --add-mcp '${JSON.stringify({ name: "agents-space", type: "http", url })}'` },
  };
  const step = install[client];

  return (
    <div className="flex flex-col gap-3 rounded-xl bg-white p-4 outline outline-1 -outline-offset-1 outline-edge">
      <p className="text-[15px] text-ink">
        <span className="font-mono">agentspace.me/{handle}</span> is available. Add Agent Space to your AI app, then sign in
        with Google to claim it.
      </p>
      <div role="tablist" aria-label="Your AI app" className="flex flex-wrap gap-1.5">
        {CLIENTS.map((c) => (
          <button
            key={c}
            type="button"
            role="tab"
            aria-selected={client === c}
            onClick={() => setClient(c)}
            className={`rounded-md px-2.5 py-1 text-[13px] transition-colors ${client === c ? "bg-ink text-white" : "text-muted hover:text-ink"}`}
          >
            {c}
          </button>
        ))}
      </div>
      <p className="text-[14px] text-muted">{step.how}</p>
      <CopyLine value={step.copy} />
      {step.link && (
        <a href={step.link} className="self-start rounded-lg bg-ink px-3 py-2 text-[14px] font-medium text-white">
          Add to Cursor
        </a>
      )}
      <p className="text-[13px] text-muted">
        Then ask it to “set up my Agent Space”. Your handle is claimed when you sign in. Until then anyone can take it.
      </p>
    </div>
  );
}

function CopyLine({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex items-center gap-2 rounded-lg bg-panel p-1.5 pl-3 outline outline-1 -outline-offset-1 outline-edge">
      <code className="min-w-0 flex-1 overflow-x-auto font-mono text-[13px] whitespace-nowrap text-ink">{value}</code>
      <button
        type="button"
        onClick={async () => {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        }}
        className="shrink-0 rounded-md bg-ink px-3 py-1.5 text-[13px] font-medium text-white"
      >
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}
