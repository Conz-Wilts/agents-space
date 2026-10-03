"use client";

import { useActionState } from "react";
import { addMcpConnector, type AddState } from "./actions";

const field =
  "h-10 w-full min-w-0 rounded-lg bg-white px-3 text-[14px] text-ink outline outline-1 -outline-offset-1 outline-edge placeholder:text-muted focus:outline-ink";
const button = "h-10 shrink-0 rounded-lg bg-ink px-4 text-[14px] font-medium text-white transition-transform active:scale-[0.98] disabled:opacity-50";

function Field({ label, wide, children }: { label: string; wide?: boolean; children: React.ReactNode }) {
  return (
    <label className={`flex flex-col gap-1.5 ${wide ? "sm:col-span-2" : ""}`}>
      <span className="font-mono text-[11px] uppercase tracking-[1px] text-muted">{label}</span>
      {children}
    </label>
  );
}

function Result({ state, pending, label }: { state: AddState; pending: boolean; label: string }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <button disabled={pending} className={button}>
        {pending ? "Saving…" : label}
      </button>
      {state.ok && <span className="text-[13px] text-emerald-700">{state.message}</span>}
      {state.error && <span className="text-[13px] text-red-700">{state.error}</span>}
    </div>
  );
}

function McpForm() {
  const [state, action, pending] = useActionState<AddState, FormData>(addMcpConnector, {});
  return (
    <form action={action} className="flex flex-col gap-4">
      <p className="text-[14px] leading-[21px] text-muted">
        <span className="font-medium text-ink">Custom connector.</span> Wrap any remote MCP server. For a REST API, describe it to your agent and it builds the connector with <code className="font-mono text-[13px] text-ink">create_connector</code>.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Name">
          <input name="name" required placeholder="reviews" className={field} />
        </Field>
        <Field label="Title">
          <input name="title" placeholder="Reviews" className={field} />
        </Field>
        <Field label="MCP server URL" wide>
          <input name="url" type="url" required placeholder="https://example.com/mcp" className={`${field} font-mono`} />
        </Field>
        <Field label="Bearer token (optional)" wide>
          <input name="token" type="password" autoComplete="off" placeholder="Stored encrypted as TOKEN" className={`${field} font-mono`} />
        </Field>
        <Field label="Description" wide>
          <input name="description" placeholder="What agents can do with it" className={field} />
        </Field>
      </div>
      <Result state={state} pending={pending} label="Add connector" />
    </form>
  );
}

/** Add a custom connector from the web: a remote MCP server. */
export function AddConnector() {
  return (
    <div className="rounded-[14px] bg-white p-5 outline outline-1 -outline-offset-1 outline-edge sm:p-6">
      <McpForm />
    </div>
  );
}
