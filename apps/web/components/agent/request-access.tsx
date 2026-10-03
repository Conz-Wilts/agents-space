"use client";

import { useActionState } from "react";
import { requestAccess, type RequestState } from "./actions";

/** Non-owners on an agent that needs approval: ask for access, or see that a request is waiting. */
export function RequestAccess({ agentId, status }: { agentId: string; status?: "pending" | "denied" }) {
  const [state, action, pending] = useActionState<RequestState, FormData>(requestAccess.bind(null, agentId), {});

  if (state.ok || status === "pending") return (
      <p className="flex items-center gap-2.5 text-[15px] text-ink">
        <span className="ping size-2 rounded-full bg-wait" />
        Access requested. The owner will review it.
      </p>
    );

  return (
    <form action={action} className="flex max-w-xl flex-col gap-3">
      {status === "denied" && <p className="text-[15px] text-muted">Your last request was declined. You can ask again.</p>}
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          name="message"
          placeholder="What will you use it for? (optional)"
          className="h-11 min-w-0 flex-1 rounded-lg bg-white px-4 text-[15px] text-ink outline outline-1 -outline-offset-1 outline-edge transition-[outline-color] placeholder:text-muted focus:outline-ink"
        />
        <button
          disabled={pending}
          className="h-11 shrink-0 rounded-lg bg-ink px-5 text-[15px] font-medium text-white transition-transform duration-200 hover:-translate-y-px active:scale-[0.98] disabled:opacity-50"
        >
          {pending ? "Sending…" : "Request access"}
        </button>
      </div>
      {state.error && <p className="text-[13px] text-red-700">{state.error}</p>}
    </form>
  );
}
