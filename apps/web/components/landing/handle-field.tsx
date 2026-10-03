"use client";

import { useEffect, useState } from "react";

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

export function HandleField({ id }: { id: string }) {
  const [focused, setFocused] = useState(false);
  const [value, setValue] = useState("");
  const placeholder = useTypedPlaceholder(!focused && !value);

  return (
    <form
      action="#"
      onSubmit={(e) => e.preventDefault()}
      className="group flex w-full max-w-[520px] items-center justify-between gap-2 rounded-xl bg-panel p-1.5 outline outline-1 -outline-offset-1 outline-edge transition-[outline-color,box-shadow] duration-300 focus-within:shadow-[0_0_0_4px_#0a0a0a14] focus-within:outline-ink"
    >
      <label htmlFor={id} className="relative flex min-w-0 flex-1 items-center pl-3.5 pr-1.5 font-mono text-base">
        <span className="shrink-0 text-muted">agentspace.me/</span>
        <span className="relative min-w-0 flex-1">
          <input
            id={id}
            name="handle"
            value={value}
            onChange={(e) => setValue(e.target.value.replace(/[^a-z0-9-]/gi, "").toLowerCase())}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            autoComplete="off"
            spellCheck={false}
            aria-label="Choose your handle"
            className="w-full min-w-0 bg-transparent text-ink caret-ink outline-none"
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
        className="shrink-0 rounded-lg bg-ink px-4 py-3.5 text-base font-medium whitespace-nowrap text-white transition-transform duration-200 hover:-translate-y-px active:translate-y-0 active:scale-[0.98] sm:px-[22px]"
      >
        <span className="sm:hidden">Claim</span>
        <span className="hidden sm:inline">Claim your space</span>
      </button>
    </form>
  );
}
