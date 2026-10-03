"use client";

import { useActionState, useState } from "react";
import { generateApiKey, type KeyState } from "./actions";

export function ApiKeyForm({ hasKey, mcpUrl }: { hasKey: boolean; mcpUrl: string }) {
  const [state, action, pending] = useActionState<KeyState, FormData>(generateApiKey, {});
  const [copied, setCopied] = useState(false);

  return (
    <div className="flex flex-col gap-4">
      {state.apiKey ? (
        <div className="flex flex-col gap-3 rounded-lg bg-panel p-4 outline outline-1 -outline-offset-1 outline-edge">
          <p className="font-mono text-[12px] uppercase tracking-[1px] text-ink">Copy it now — it won&apos;t be shown again.</p>
          <div className="flex items-center gap-2">
            <code className="min-w-0 flex-1 truncate rounded-md bg-white px-3 py-2 font-mono text-[13px] text-ink outline outline-1 -outline-offset-1 outline-edge">{state.apiKey}</code>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(state.apiKey!);
                setCopied(true);
              }}
              className="h-9 shrink-0 rounded-lg bg-ink px-4 text-[14px] font-medium text-white transition-transform duration-200 hover:-translate-y-px active:scale-[0.98]"
            >
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
          <p className="text-[13px] leading-5 text-muted">
            Add it to your MCP client as <code className="font-mono text-ink">Authorization: Bearer &lt;key&gt;</code> for{" "}
            <code className="font-mono text-ink">{mcpUrl}</code>.
          </p>
        </div>
      ) : (
        <p className="text-[15px] leading-[23px] text-muted">
          {hasKey ? "You have an API key. Generating a new one revokes it." : "No API key yet. Generate one to use the MCP as yourself."}
        </p>
      )}
      {state.error && <p className="text-[14px] text-red-700">{state.error}</p>}
      <form action={action}>
        <button
          disabled={pending}
          className="h-11 rounded-lg bg-ink px-5 text-[15px] font-medium text-white transition-transform duration-200 hover:-translate-y-px active:scale-[0.98] disabled:opacity-50"
        >
          {pending ? "Generating…" : hasKey || state.apiKey ? "Regenerate API key" : "Generate API key"}
        </button>
      </form>
    </div>
  );
}
