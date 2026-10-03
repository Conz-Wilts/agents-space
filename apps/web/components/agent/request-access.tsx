"use client";

import { useActionState } from "react";
import { requestAccess, type RequestState } from "./actions";

/** Non-owners on a private agent: ask for access, or see that a request is waiting. */
export function RequestAccess({ agentId, status }: { agentId: string; status?: "pending" | "denied" }) {
  const [state, action, pending] = useActionState<RequestState, FormData>(requestAccess.bind(null, agentId), {});

  if (state.ok || status === "pending") return <p className="text-sm text-fg-muted">Access requested. The owner will review it.</p>;

  return (
    <form action={action} className="flex max-w-xl flex-col gap-2">
      {status === "denied" && <p className="text-sm text-fg-muted">Your last request was declined. You can ask again.</p>}
      <div className="flex gap-2">
        <input
          name="message"
          placeholder="What will you use it for? (optional)"
          className="h-9 min-w-0 flex-1 rounded-full border border-line bg-surface-subtle px-4 text-sm outline-none focus:border-brand focus:bg-surface"
        />
        <button
          disabled={pending}
          className="h-9 shrink-0 rounded-full bg-brand px-4 text-sm font-medium text-white hover:bg-brand-fg disabled:opacity-50"
        >
          {pending ? "Sending…" : "Request access"}
        </button>
      </div>
      {state.error && <p className="text-xs text-red-700">{state.error}</p>}
    </form>
  );
}
