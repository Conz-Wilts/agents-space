import { metadataCorsOptionsRequestHandler } from "mcp-handler";
import { authServerUrl } from "@/lib/auth";

/**
 * Older MCP clients look for authorization-server metadata on the MCP origin itself instead of
 * following the protected-resource metadata. Serve Supabase Auth's document here for them.
 */
export async function GET() {
  const issuer = authServerUrl();
  if (!issuer) return Response.json({ error: "OAuth is not configured on this server" }, { status: 404 });
  const { origin, pathname } = new URL(issuer);
  const res = await fetch(`${origin}/.well-known/oauth-authorization-server${pathname}`, { next: { revalidate: 3600 } }).catch(() => undefined);
  if (!res) return Response.json({ error: "Authorization server unreachable" }, { status: 502 });
  return new Response(await res.text(), {
    status: res.status,
    headers: { "content-type": "application/json", "access-control-allow-origin": "*", "cache-control": "max-age=3600" },
  });
}

export const OPTIONS = metadataCorsOptionsRequestHandler();
