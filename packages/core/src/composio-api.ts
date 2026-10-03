/**
 * Composio's REST API (v3.1) with the platform key (`COMPOSIO_API_KEY`, server env only).
 * Each Agents Space user is one Composio user (`user_id` = our user id), so their connected
 * accounts are theirs alone. Users never see or need a Composio key.
 */

export const COMPOSIO_API = "https://backend.composio.dev/api/v3.1";

export const composioEnabled = () => !!process.env.COMPOSIO_API_KEY;

export async function composioFetch<T>(path: string, init: { method?: string; query?: Record<string, string | undefined>; body?: unknown } = {}): Promise<T> {
  const key = process.env.COMPOSIO_API_KEY;
  if (!key) throw new Error("Composio apps aren't enabled on this server (COMPOSIO_API_KEY is not set).");
  const url = new URL(COMPOSIO_API + path);
  for (const [k, v] of Object.entries(init.query ?? {})) if (v) url.searchParams.set(k, v);
  const res = await fetch(url, {
    method: init.method ?? "GET",
    headers: { "x-api-key": key, ...(init.body ? { "content-type": "application/json" } : {}) },
    body: init.body ? JSON.stringify(init.body) : undefined,
    signal: AbortSignal.timeout(30_000),
    cache: "no-store",
  });
  const text = (await res.text()).split(key).join("[composio-key]");
  let body: unknown = text;
  try {
    body = JSON.parse(text);
  } catch {}
  if (!res.ok) {
    const message = (body as { error?: { message?: string } })?.error?.message ?? res.statusText;
    throw new Error(`Composio answered ${res.status}: ${message}`);
  }
  return body as T;
}

/** Run a Composio tool as `userId` (the connector owner). */
export const executeComposioTool = (tool: string, userId: string, args: Record<string, unknown>) =>
  composioFetch<{ successful?: boolean; data?: unknown; error?: unknown }>(`/tools/execute/${encodeURIComponent(tool)}`, {
    method: "POST",
    body: { user_id: userId, arguments: args },
  });
