import type { Agent } from "@agents-space/core";

export const text = (t: string) => ({ content: [{ type: "text" as const, text: t }] });
export const fail = (e: unknown) => ({ ...text(e instanceof Error ? e.message : String(e)), isError: true });

/** Wrap a tool handler so thrown errors come back as tool errors the LLM can read. */
export const safe =
  <A extends unknown[]>(fn: (...args: A) => Promise<ReturnType<typeof text>>) =>
  async (...args: A) => {
    try {
      return await fn(...args);
    } catch (e) {
      return fail(e);
    }
  };

export const fmt = (a: Agent, access?: boolean) => {
  const flags = [a.kind, a.visibility, a.status === "draft" ? "DRAFT" : null, access === false ? "request access" : null]
    .filter(Boolean)
    .join(" · ");
  return `• ${a.name} (${a.id}) — ${a.tagline}\n  ${flags} | by ${a.owner} | tools: ${a.tools.join(", ") || "—"} | pricing: ${a.pricing}${a.endpoint ? `\n  endpoint: ${a.endpoint}` : ""}`;
};

/** Public origin of this deployment, for agent endpoints. */
export const origin = (req?: Request) =>
  process.env.PUBLIC_MCP_ORIGIN ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : undefined) ??
  (req ? new URL(req.url).origin : "http://localhost:3001");

export const agentEndpoint = (base: string, id: string) => `${base}/a/${id}/mcp`;
