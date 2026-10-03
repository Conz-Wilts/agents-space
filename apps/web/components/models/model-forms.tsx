"use client";

import { useActionState, useState, useTransition } from "react";
import { addModelAction, chooseModelAction, saveModelKeyAction, testModelAction, type ModelState } from "./actions";

export type ProviderOption = { id: string; label: string; example: string; needsKey: boolean };

const field =
  "h-10 w-full min-w-0 rounded-lg bg-white px-3 text-[14px] text-ink outline outline-1 -outline-offset-1 outline-edge placeholder:text-muted focus:outline-ink";
const button = "h-10 shrink-0 rounded-lg bg-ink px-4 text-[14px] font-medium text-white transition-transform active:scale-[0.98] disabled:opacity-50";

/** Add a model (provider chips → model id → optional key) and attach it to this agent. */
export function AddModelForm({ agentId, providers }: { agentId: string; providers: ProviderOption[] }) {
  const [state, action, pending] = useActionState<ModelState, FormData>(addModelAction.bind(null, agentId), {});
  const [provider, setProvider] = useState(providers.find((p) => p.id === "anthropic")?.id ?? providers[0].id);
  const p = providers.find((x) => x.id === provider)!;

  return (
    <form action={action} className="flex flex-col gap-4 rounded-[14px] bg-panel/60 p-4 outline outline-1 -outline-offset-1 outline-edge sm:p-5">
      <input type="hidden" name="provider" value={provider} />
      <div role="radiogroup" aria-label="Provider" className="flex flex-wrap gap-1.5">
        {providers.map((x) => (
          <button
            key={x.id}
            type="button"
            role="radio"
            aria-checked={provider === x.id}
            onClick={() => setProvider(x.id)}
            className={`h-8 rounded-full px-3 text-[13px] transition-colors ${provider === x.id ? "bg-ink font-medium text-white" : "bg-white text-muted outline outline-1 -outline-offset-1 outline-edge hover:text-ink"}`}
          >
            {x.label}
          </button>
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5">
          <span className="font-mono text-[11px] uppercase tracking-[1px] text-muted">Model id</span>
          <input name="model" required placeholder={p.example} className={`${field} font-mono`} />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="font-mono text-[11px] uppercase tracking-[1px] text-muted">Name (optional)</span>
          <input name="name" placeholder="e.g. claude" className={field} />
        </label>
        {provider === "custom" && (
          <label className="flex flex-col gap-1.5 sm:col-span-2">
            <span className="font-mono text-[11px] uppercase tracking-[1px] text-muted">Base URL</span>
            <input name="baseUrl" type="url" required placeholder="https://api.together.xyz/v1" className={`${field} font-mono`} />
          </label>
        )}
        {p.needsKey && (
          <label className="flex flex-col gap-1.5 sm:col-span-2">
            <span className="font-mono text-[11px] uppercase tracking-[1px] text-muted">API key</span>
            <input name="apiKey" type="password" autoComplete="off" placeholder="Stored encrypted, never shown again" className={`${field} font-mono`} />
          </label>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button disabled={pending} className={button}>
          {pending ? "Adding…" : "Add and use"}
        </button>
        {!p.needsKey && <span className="text-[13px] text-muted">Runs through the Vercel AI Gateway. No key needed.</span>}
        {state.ok && <span className="text-[13px] text-emerald-700">Added.</span>}
        {state.error && <span className="text-[13px] text-red-700">{state.error}</span>}
      </div>
    </form>
  );
}

/** Switch between the owner's models (or the default). */
export function ModelPicker({ agentId, current, models, defaultLabel }: { agentId: string; current?: string; models: { name: string; label: string }[]; defaultLabel: string }) {
  const [pending, start] = useTransition();
  return (
    <label className="flex flex-col gap-1.5">
      <span className="font-mono text-[11px] uppercase tracking-[1px] text-muted">Runs on</span>
      <select
        defaultValue={current ?? ""}
        disabled={pending}
        onChange={(e) => start(() => chooseModelAction(agentId, e.target.value))}
        className={`${field} max-w-md disabled:opacity-60`}
      >
        <option value="">Default · {defaultLabel}</option>
        {models.map((m) => (
          <option key={m.name} value={m.name}>
            {m.label}
          </option>
        ))}
      </select>
    </label>
  );
}

/** Write-only key row for one model, like a connector secret. */
export function ModelKeyForm({ model, isSet }: { model: string; isSet: boolean }) {
  const [state, action, pending] = useActionState<ModelState, FormData>(saveModelKeyAction, {});
  const set = isSet || state.ok;
  return (
    <form action={action} className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <input type="hidden" name="model" value={model} />
        <span className={`inline-flex h-5 shrink-0 items-center gap-1 rounded-full px-2 text-[11px] font-medium ${set ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
          <span className={`size-1.5 rounded-full ${set ? "bg-emerald-500" : "bg-red-500"}`} />
          {state.ok ? "Saved" : set ? "Key set" : "No key"}
        </span>
        <input
          name="value"
          type="password"
          autoComplete="off"
          required
          aria-label={`${model} API key`}
          placeholder={set ? "Stored. Enter a new key to replace it" : "API key"}
          className="h-8 min-w-0 flex-1 rounded-md bg-transparent px-2 font-mono text-[13px] text-ink outline-none placeholder:font-sans placeholder:text-muted focus:bg-white focus:outline-1 focus:-outline-offset-1 focus:outline-edge"
        />
        <button disabled={pending} className="h-8 shrink-0 rounded-md bg-ink px-3 text-[13px] font-medium text-white disabled:opacity-50">
          {pending ? "Saving…" : set ? "Overwrite" : "Save"}
        </button>
      </div>
      {state.error && <p className="text-[13px] text-red-700">{state.error}</p>}
    </form>
  );
}

export function TestModelButton({ model }: { model: string }) {
  const [state, setState] = useState<ModelState>({});
  const [pending, start] = useTransition();
  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        disabled={pending}
        onClick={() => start(async () => setState(await testModelAction(model)))}
        className="h-8 rounded-md px-3 text-[13px] text-ink outline outline-1 -outline-offset-1 outline-edge transition-colors hover:bg-panel disabled:opacity-50"
      >
        {pending ? "Testing…" : "Test"}
      </button>
      {state.message && <span className="text-[13px] text-emerald-700">{state.message}</span>}
      {state.error && <span className="text-[13px] text-red-700">{state.error}</span>}
    </div>
  );
}
