"use client";

import { useActionState } from "react";
import { saveSecret, type SecretState } from "./actions";

/** One secret as a compact row: status, name, write-only input. Stored values are never shown. */
export function SecretForm({ connector, name, isSet }: { connector: string; name: string; isSet: boolean }) {
  const [state, action, pending] = useActionState<SecretState, FormData>(saveSecret, {});
  const set = isSet || state.ok;

  return (
    <li className="bg-panel/60 px-4 py-2.5">
      <form action={action} className="flex items-center gap-2">
        <input type="hidden" name="connector" value={connector} />
        <input type="hidden" name="name" value={name} />
        <code className="shrink-0 font-mono text-[13px] text-ink">{name}</code>
        <span
          className={`inline-flex h-5 shrink-0 items-center gap-1 rounded-full px-2 text-[11px] font-medium ${
            set ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
          }`}
        >
          <span className={`size-1.5 rounded-full ${set ? "bg-emerald-500" : "bg-red-500"}`} />
          {state.ok ? "Saved" : set ? "Set" : "Not set"}
        </span>
        <input
          name="value"
          type="password"
          autoComplete="off"
          required
          placeholder={set ? "Stored. Enter a new value to replace it" : "Enter value"}
          aria-label={`${name} value`}
          className="h-8 min-w-0 flex-1 rounded-md bg-transparent px-2 font-mono text-[13px] text-ink outline-none placeholder:font-sans placeholder:text-muted focus:bg-white focus:outline-1 focus:-outline-offset-1 focus:outline-edge"
        />
        <button disabled={pending} className="h-8 shrink-0 rounded-md bg-ink px-3 text-[13px] font-medium text-white disabled:opacity-50">
          {pending ? "Saving…" : set ? "Overwrite" : "Save"}
        </button>
      </form>
      {state.error && <p className="mt-1 text-[13px] text-red-700">{state.error}</p>}
    </li>
  );
}
