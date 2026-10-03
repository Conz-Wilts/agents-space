"use client";

import { useActionState, useState } from "react";
import { generateApiKey, type KeyState } from "./actions";

export function ApiKeyForm({ hasKey, mcpUrl }: { hasKey: boolean; mcpUrl: string }) {
  const [state, action, pending] = useActionState<KeyState, FormData>(generateApiKey, {});
  const [copied, setCopied] = useState(false);

  return (
    <div className="flex flex-col gap-3">
      {state.apiKey ? (
        <div className="flex flex-col gap-2 rounded-xl border border-brand/30 bg-surface-subtle p-3">
          <p className="text-xs font-medium text-fg-secondary">Copy it now — it won&apos;t be shown again.</p>
          <div className="flex items-center gap-2">
            <code className="min-w-0 flex-1 truncate rounded-lg bg-surface px-2 py-1.5 font-mono text-xs">{state.apiKey}</code>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(state.apiKey!);
                setCopied(true);
              }}
              className="h-8 shrink-0 rounded-full bg-brand px-3 text-xs font-medium text-white hover:bg-brand-fg"
            >
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
          <p className="text-xs text-fg-muted">
            Add it to your MCP client as <code className="font-mono">Authorization: Bearer &lt;key&gt;</code> for{" "}
            <code className="font-mono">{mcpUrl}</code>.
          </p>
        </div>
      ) : (
        <p className="text-sm text-fg-muted">
          {hasKey ? "You have an API key. Generating a new one revokes it." : "No API key yet. Generate one to use the MCP as yourself."}
        </p>
      )}
      {state.error && <p className="text-sm text-red-700">{state.error}</p>}
      <form action={action}>
        <button
          disabled={pending}
          className="h-9 rounded-full border border-line-strong px-4 text-sm font-medium hover:bg-surface-subtle disabled:opacity-50"
        >
          {pending ? "Generating…" : hasKey || state.apiKey ? "Regenerate API key" : "Generate API key"}
        </button>
      </form>
    </div>
  );
}
