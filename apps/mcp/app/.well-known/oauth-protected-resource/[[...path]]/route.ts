import { metadataCorsOptionsRequestHandler, protectedResourceHandler } from "mcp-handler";
import { authServerUrl } from "@/lib/auth";

/**
 * RFC 9728 protected-resource metadata, e.g. /.well-known/oauth-protected-resource/mcp describes
 * <origin>/mcp. It tells MCP clients to sign in with Supabase Auth's OAuth 2.1 server.
 */
export async function GET(req: Request, ctx: { params: Promise<{ path?: string[] }> }) {
  const issuer = authServerUrl();
  if (!issuer) return Response.json({ error: "OAuth is not configured on this server" }, { status: 404 });
  const { path = [] } = await ctx.params;
  const explicit = process.env.PUBLIC_MCP_ORIGIN;
  return protectedResourceHandler({
    authServerUrls: [issuer],
    resourceUrl: explicit ? `${explicit.replace(/\/$/, "")}/${path.join("/")}` : undefined,
  })(req);
}

export const OPTIONS = metadataCorsOptionsRequestHandler();
