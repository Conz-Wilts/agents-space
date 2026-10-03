import { withMcpAuth } from "mcp-handler";
import { store, type User } from "@agents-space/core";

/**
 * API-key auth. Send `Authorization: Bearer as_...`, or `?key=as_...` on the URL for MCP clients
 * that cannot set headers. Anonymous requests are allowed: they can search and use public agents.
 */
export function withApiKey(handler: (req: Request) => Promise<Response>) {
  const authed = withMcpAuth(
    handler,
    async (_req, token) => {
      if (!token) return undefined;
      const user = await store.userByApiKey(token);
      return user ? { token, clientId: user.id, scopes: [], extra: { handle: user.handle } } : undefined;
    },
    { required: false },
  );
  return (req: Request) => {
    const key = new URL(req.url).searchParams.get("key");
    if (key && !req.headers.has("authorization")) {
      const headers = new Headers(req.headers);
      headers.set("authorization", `Bearer ${key}`);
      req = new Request(req, { headers });
    }
    return authed(req);
  };
}

type Ctx = { http?: { authInfo?: { clientId?: string } } };

export async function currentUser(ctx: Ctx): Promise<User | undefined> {
  const id = ctx.http?.authInfo?.clientId;
  return id ? store.getUser(id) : undefined;
}

export class AuthRequired extends Error {
  constructor() {
    super("Sign in first: call create_account to get an API key, then reconnect with `Authorization: Bearer <key>` (or `?key=<key>` on the MCP URL).");
  }
}

export async function requireUser(ctx: Ctx): Promise<User> {
  const u = await currentUser(ctx);
  if (!u) throw new AuthRequired();
  return u;
}
