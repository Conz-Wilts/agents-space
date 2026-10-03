import { withMcpAuth } from "mcp-handler";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { store, type User } from "@agents-space/core";

/**
 * MCP sign-in. Two kinds of bearer token:
 * - OAuth: MCP clients (Claude, ChatGPT, Cursor, ...) discover Supabase Auth's OAuth 2.1 server from
 *   our protected-resource metadata, send the human through Google sign-in + the consent page on
 *   the web app, and come back with a Supabase access token. First sign-in creates the User row.
 * - API key (`as_...`) from the web account page or create_account, for clients without OAuth.
 *   `?key=...` on the URL works for clients that cannot set headers.
 */

let supabase: SupabaseClient | undefined;
function supabaseAuth() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return undefined;
  return (supabase ??= createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } }));
}

/** Supabase Auth's issuer — the OAuth authorization server MCP clients sign in with. */
export const authServerUrl = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  return url ? `${url.replace(/\/$/, "")}/auth/v1` : undefined;
};

/** OAuth is on when Supabase is configured; then the main MCP requires sign-in. */
export const oauthEnabled = () => !!supabaseAuth();

type Verified = { user: User; expiresAt?: number };

/** Resolves a bearer token to a user, or throws if it is present but invalid/expired. */
async function verify(token: string): Promise<Verified> {
  if (token.startsWith("as_")) {
    const user = await store.userByApiKey(token);
    if (!user) throw new Error("Unknown API key");
    return { user };
  }
  const sb = supabaseAuth();
  if (!sb) throw new Error("OAuth is not configured");
  const { data, error } = await sb.auth.getClaims(token);
  const c = data?.claims;
  if (error || !c?.sub || c.role !== "authenticated") throw new Error("Invalid access token");
  const meta = (c.user_metadata ?? {}) as { full_name?: string; name?: string };
  const user = await store.userForAuth({ authId: c.sub, email: c.email, name: meta.full_name ?? meta.name });
  return { user, expiresAt: c.exp };
}

/**
 * Wrap an MCP route with auth. `required` answers token-less requests with a 401 whose
 * WWW-Authenticate header points at `metadataPath`, which starts the client's OAuth flow.
 * A token that is present but invalid or expired is always a 401, so clients refresh it.
 */
export function withAuth(handler: (req: Request) => Promise<Response>, opts: { required: boolean; metadataPath: string }) {
  const authed = withMcpAuth(
    handler,
    async (_req, token) => {
      if (!token) return undefined;
      const { user, expiresAt } = await verify(token);
      return { token, clientId: user.id, scopes: [], expiresAt, extra: { handle: user.handle } };
    },
    { required: opts.required, resourceMetadataPath: opts.metadataPath, resourceUrl: process.env.PUBLIC_MCP_ORIGIN },
  );
  return (req: Request) => {
    const key = new URL(req.url).searchParams.get("key");
    if (key && !req.headers.has("authorization")) {
      const headers = new Headers(req.headers);
      headers.set("authorization", `Bearer ${key}`);
      // Rebuild from parts: Next's request object can't be passed to `new Request(req, ...)`.
      const hasBody = req.method !== "GET" && req.method !== "HEAD";
      req = new Request(req.url, { method: req.method, headers, body: hasBody ? req.body : undefined, signal: req.signal, duplex: "half" } as RequestInit);
    }
    return authed(req);
  };
}

/** Protected-resource metadata path for an MCP endpoint path (RFC 9728 path-suffixed form). */
export const metadataPathFor = (mcpPath: string) => `/.well-known/oauth-protected-resource${mcpPath}`;

type Ctx = { http?: { authInfo?: { clientId?: string } } };

export async function currentUser(ctx: Ctx): Promise<User | undefined> {
  const id = ctx.http?.authInfo?.clientId;
  return id ? store.getUser(id) : undefined;
}

export class AuthRequired extends Error {
  constructor() {
    const web = process.env.NEXT_PUBLIC_WEB_URL ?? "http://localhost:3000";
    super(
      `Sign in first: reconnect this MCP server and sign in with Google when your client asks, or get an API key at ${web}/account and send \`Authorization: Bearer <key>\` (or \`?key=<key>\` on the MCP URL).`,
    );
  }
}

export async function requireUser(ctx: Ctx): Promise<User> {
  const u = await currentUser(ctx);
  if (!u) throw new AuthRequired();
  return u;
}
