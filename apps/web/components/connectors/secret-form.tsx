"use client";

import { useActionState } from "react";
import { saveSecret, type SecretState } from "./actions";

/** One secret as a compact row: status dot, name, write-only input. Stored values are never shown. */
export function SecretForm({ connector, name, isSet }: { connector: string; name: string; isSet: boolean }) {
  const [state, action, pending] = useActionState<SecretState, FormData>(saveSecret, {});
  const set = isSet || state.ok;

  return (
    <li className="bg-panel/60 px-4 py-2.5">
      <form action={action} className="flex items-center gap-2">
        <input type="hidden" name="connector" value={connector} />
        <input type="hidden" name="name" value={name} />
        <span
          className={`size-1.5 shrink-0 rounded-full ${set ? "bg-emerald-500" : "bg-red-500"}`}
          title={set ? "Set" : "Not set"}
        />
        <code className="shrink-0 font-mono text-[13px] text-ink">{name}</code>
        <input
          name="value"
          type="password"
          autoComplete="off"
          required
          placeholder={set ? "••••••••" : "Not set"}
          aria-label={`${name} value`}
          className="h-8 min-w-0 flex-1 rounded-md bg-transparent px-2 font-mono text-[13px] text-ink outline-none placeholder:text-muted focus:bg-white focus:outline-1 focus:-outline-offset-1 focus:outline-edge"
        />
        <button disabled={pending} className="h-8 shrink-0 rounded-md bg-ink px-3 text-[13px] font-medium text-white disabled:opacity-50">
          {pending ? "Saving…" : "Save"}
        </button>
      </form>
      {state.error && <p className="mt-1 text-[13px] text-red-700">{state.error}</p>}
    </li>
  );
}
