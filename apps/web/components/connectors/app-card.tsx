"use client";

import { useActionState } from "react";
import { connectAppAction, disconnectAppAction, type AddState } from "./actions";

export type AppCardProps = {
  slug: string;
  name: string;
  description: string;
  logo?: string;
  toolsCount?: number;
  status?: string;
  connector?: string;
};

/** One Composio app: connect (sign in on the app's page) or disconnect. */
export function AppCard({ slug, name, description, logo, toolsCount, status, connector }: AppCardProps) {
  const [connectState, connect, connecting] = useActionState<AddState, FormData>(connectAppAction, {});
  const [disconnectState, disconnect, disconnecting] = useActionState<AddState, FormData>(disconnectAppAction, {});
  const active = status === "ACTIVE";
  const error = connectState.error ?? disconnectState.error;

  return (
    <li className="flex min-w-0 flex-col gap-3 rounded-[14px] bg-white p-4 outline outline-1 -outline-offset-1 outline-edge">
      <div className="flex min-w-0 items-center gap-3">
        {logo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logo} alt="" className="size-9 shrink-0 rounded-lg bg-panel object-contain p-1" />
        ) : (
          <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-panel text-[13px] font-medium text-ink">{name.slice(0, 1)}</span>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-medium text-ink">{name}</p>
          <p className="truncate font-mono text-[11px] uppercase tracking-[1px] text-muted">
            {slug}
            {toolsCount ? ` · ${toolsCount} tools` : ""}
          </p>
        </div>
        {status && (
          <span
            className={`inline-flex h-5 shrink-0 items-center gap-1 rounded-full px-2 text-[11px] font-medium ${active ? "bg-emerald-50 text-emerald-700" : "bg-wait/10 text-ink"}`}
          >
            <span className={`size-1.5 rounded-full ${active ? "bg-emerald-500" : "bg-wait"}`} />
            {active ? "Connected" : status.toLowerCase()}
          </span>
        )}
      </div>
      {description && <p className="line-clamp-2 text-[13px] leading-[19px] text-muted">{description}</p>}
      {active && connector && (
        <p className="truncate text-[12px] text-muted">
          Connector <code className="font-mono text-ink">{connector}</code>
        </p>
      )}
      <div className="mt-auto flex flex-wrap items-center gap-2">
        <form action={connect}>
          <input type="hidden" name="app" value={slug} />
          {status && <input type="hidden" name="reconnect" value="1" />}
          <button
            disabled={connecting}
            className={`h-8 rounded-md px-3 text-[13px] font-medium disabled:opacity-50 ${status ? "text-ink outline outline-1 -outline-offset-1 outline-edge hover:bg-panel" : "bg-ink text-white"}`}
          >
            {connecting ? "Opening…" : status ? "Reconnect" : "Connect"}
          </button>
        </form>
        {status && (
          <form action={disconnect}>
            <input type="hidden" name="app" value={slug} />
            <button disabled={disconnecting} className="h-8 rounded-md px-3 text-[13px] text-red-700 hover:bg-red-50 disabled:opacity-50">
              {disconnecting ? "Removing…" : "Disconnect"}
            </button>
          </form>
        )}
      </div>
      {error && <p className="text-[12px] text-red-700">{error}</p>}
      {connectState.ok && <p className="text-[12px] text-emerald-700">{connectState.message}</p>}
    </li>
  );
}
