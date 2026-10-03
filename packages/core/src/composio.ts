import { createConnector } from "./agents";
import { composioFetch } from "./composio-api";
import { slug, store } from "./store";
import type { ActionParam, Connector, ConnectorActionInput, User } from "./schema";

export { composioEnabled } from "./composio-api";

/**
 * Composio apps (composio.dev): 1000+ toolkits (Gmail, Slack, GitHub, Notion, ...) that users
 * connect with OAuth or their own key on Composio's hosted page. Agents Space holds one platform
 * key; each user is their own Composio user, so an agent only ever acts on its owner's accounts.
 *
 * Connecting an app saves a connector `<handle>-composio-<toolkit>` with one `composio` action per
 * tool. Owners give agents scoped access to it with `attach_connector`, like any connector.
 */

/** Toolkits can hold hundreds of tools; connecting one keeps its main tools, at most this many. */
const TOOLKIT_LIMIT = 50;

export type ComposioApp = {
  slug: string;
  name: string;
  description: string;
  logo?: string;
  toolsCount?: number;
  noAuth: boolean;
  /** Composio runs the OAuth app (one click for users). */
  managed: boolean;
  authSchemes: string[];
};

type RawToolkit = {
  slug: string;
  name: string;
  no_auth?: boolean;
  auth_schemes?: string[];
  composio_managed_auth_schemes?: string[];
  /** Only on the single-app endpoint, which leaves out `no_auth` / `auth_schemes`. */
  auth_config_details?: { mode?: string }[];
  meta?: { description?: string; logo?: string; tools_count?: number };
};

type RawTool = {
  slug: string;
  name: string;
  description: string;
  toolkit: { slug: string; name: string };
  input_parameters?: { properties?: Record<string, { type?: unknown; description?: string }>; required?: string[] };
};

export type AppConnection = { id: string; toolkit: string; status: string; createdAt?: string };

function toApp(t: RawToolkit): ComposioApp {
  const authSchemes = t.auth_schemes ?? (t.auth_config_details ?? []).map((a) => a.mode ?? "").filter(Boolean);
  return {
    slug: t.slug,
    name: t.name,
    description: t.meta?.description ?? "",
    logo: t.meta?.logo,
    toolsCount: t.meta?.tools_count,
    noAuth: t.no_auth ?? authSchemes.every((s) => s === "NO_AUTH"),
    managed: !!t.composio_managed_auth_schemes?.length,
    authSchemes,
  };
}

/** Composio's own meta toolkit (sessions, connection management) isn't an app for agents. */
const HIDDEN_APPS = new Set(["composio"]);

/** The Composio user that holds this Agents Space user's connected accounts. */
export const composioUserId = (user: Pick<User, "id">) => user.id;

export const appConnectorName = (user: Pick<User, "handle">, toolkit: string) => `${user.handle}-composio-${slug(toolkit)}`;

/** Browse the catalog, most used first. */
export async function listApps(opts: { search?: string; limit?: number; category?: string } = {}): Promise<ComposioApp[]> {
  const { items } = await composioFetch<{ items: RawToolkit[] }>("/toolkits", {
    query: { search: opts.search?.trim() || undefined, category: opts.category, sort_by: "usage", limit: String(Math.min(opts.limit ?? 24, 100)) },
  });
  return items.filter((t) => !HIDDEN_APPS.has(t.slug)).map(toApp);
}

export async function getApp(toolkit: string): Promise<ComposioApp> {
  const key = toolkit.trim().toLowerCase();
  if (!/^[a-z0-9_-]+$/.test(key) || HIDDEN_APPS.has(key)) throw new Error(`"${toolkit}" is not a Composio app slug (e.g. gmail, slack, github).`);
  try {
    return toApp(await composioFetch<RawToolkit>(`/toolkits/${key}`));
  } catch (e) {
    if (e instanceof Error && / 404:/.test(e.message)) throw new Error(`Composio has no app "${toolkit}". Find slugs with list_apps.`);
    throw e;
  }
}

/** Tools of an app, by search or as its main ("important") tools. */
export async function appTools(toolkit: string, opts: { query?: string; tools?: string[]; limit?: number } = {}): Promise<RawTool[]> {
  const limit = String(Math.min(opts.limit ?? TOOLKIT_LIMIT, 200));
  if (opts.tools?.length) {
    const wanted = [...new Set(opts.tools.map((t) => t.trim().toUpperCase()))];
    const { items } = await composioFetch<{ items: RawTool[] }>("/tools", { query: { tool_slugs: wanted.join(","), limit: String(wanted.length) } });
    const missing = wanted.filter((s) => !items.some((t) => t.slug === s && t.toolkit.slug === toolkit));
    if (missing.length) throw new Error(`${toolkit} has no tool(s) ${missing.join(", ")}. See app_tools.`);
    return items;
  }
  if (opts.query) return (await composioFetch<{ items: RawTool[] }>("/tools", { query: { toolkit_slug: toolkit, query: opts.query, limit } })).items;
  const important = await composioFetch<{ items: RawTool[] }>("/tools", { query: { toolkit_slug: toolkit, important: "true", limit } });
  if (important.items.length) return important.items;
  return (await composioFetch<{ items: RawTool[] }>("/tools", { query: { toolkit_slug: toolkit, limit } })).items;
}

const paramType = (t: unknown): ActionParam["type"] => {
  const type = Array.isArray(t) ? t.find((x) => x !== "null") : t;
  if (type === "integer" || type === "number") return "number";
  return type === "boolean" || type === "object" || type === "array" ? type : "string";
};

function toolAction(t: RawTool, appName: string): ConnectorActionInput {
  const props = t.input_parameters?.properties ?? {};
  const required = new Set(t.input_parameters?.required ?? []);
  return {
    type: "composio",
    tool: t.slug,
    // GMAIL_SEND_EMAIL → send_email: the connector already names the app, and tool names cap at 64 chars.
    name: t.slug.toLowerCase().replace(new RegExp(`^${t.toolkit.slug.toLowerCase().replace(/[^a-z0-9]/g, "")}_`), "").replace(/^[^a-z]+/, "") || "tool",
    description: `${appName}: ${t.description}`.slice(0, 1000),
    params: Object.fromEntries(
      Object.entries(props).map(([k, p]) => [k, { type: paramType(p.type), description: p.description?.slice(0, 500), required: required.has(k) }]),
    ),
  };
}

/** The user's connected accounts on Composio, newest first. */
export async function myConnections(user: User): Promise<AppConnection[]> {
  const { items } = await composioFetch<{ items: { id: string; toolkit: { slug: string }; status: string; created_at?: string }[] }>("/connected_accounts", {
    query: { user_ids: composioUserId(user), order_by: "created_at", order_direction: "desc", limit: "200" },
  });
  return items.map((c) => ({ id: c.id, toolkit: c.toolkit.slug, status: c.status, createdAt: c.created_at }));
}

/** An enabled auth config for the app: Composio-managed when it has one, else one where the user enters their own key. */
async function authConfigFor(app: ComposioApp): Promise<string> {
  const { items } = await composioFetch<{ items: { id: string; status: string; is_composio_managed?: boolean }[] }>("/auth_configs", {
    query: { toolkit_slug: app.slug, limit: "50" },
  });
  const enabled = items.filter((a) => a.status === "ENABLED");
  const existing = enabled.find((a) => a.is_composio_managed) ?? enabled[0];
  if (existing) return existing.id;

  let auth_config: Record<string, unknown>;
  if (app.managed) auth_config = { type: "use_composio_managed_auth" };
  else {
    const scheme = app.authSchemes.find((s) => !s.startsWith("OAUTH") && s !== "DCR_OAUTH");
    if (!scheme) throw new Error(`${app.name} needs its own OAuth app; set one up in the Composio dashboard first.`);
    auth_config = { type: "use_custom_auth", authScheme: scheme, name: app.name, credentials: {} };
  }
  const created = await composioFetch<{ auth_config: { id: string } }>("/auth_configs", { method: "POST", body: { toolkit: { slug: app.slug }, auth_config } });
  return created.auth_config.id;
}

/**
 * Connect an app for `user`: saves its connector (main tools, or `tools`) and returns the link
 * where they sign in to the app (OAuth, or enter their key), unless it is already connected or needs no auth.
 */
export async function connectApp(
  user: User,
  toolkit: string,
  opts: { tools?: string[]; callbackUrl?: string; reconnect?: boolean } = {},
): Promise<{ app: ComposioApp; connector: Connector; status: "connected" | "no_auth" | "link"; redirectUrl?: string }> {
  const app = await getApp(toolkit);
  const tools = await appTools(app.slug, { tools: opts.tools });
  if (!tools.length) throw new Error(`${app.name} has no tools on Composio.`);

  const connector = await createConnector(user, {
    name: `composio-${app.slug}`,
    title: app.name,
    description: app.description || `${app.name} via Composio`,
    actions: tools.map((t) => toolAction(t, app.name)).filter((a, i, all) => all.findIndex((b) => b.name === a.name) === i),
  });

  if (app.noAuth) return { app, connector, status: "no_auth" };
  if (!opts.reconnect && (await myConnections(user)).some((c) => c.toolkit === app.slug && c.status === "ACTIVE")) return { app, connector, status: "connected" };

  const link = await composioFetch<{ redirect_url: string }>("/connected_accounts/link", {
    method: "POST",
    body: { auth_config_id: await authConfigFor(app), user_id: composioUserId(user), callback_url: opts.callbackUrl },
  });
  return { app, connector, status: "link", redirectUrl: link.redirect_url };
}

/** Remove the user's connected accounts for an app. Its connector stays but its actions stop working until reconnected. */
export async function disconnectApp(user: User, toolkit: string): Promise<number> {
  const key = toolkit.trim().toLowerCase();
  const mine = (await myConnections(user)).filter((c) => c.toolkit === key);
  for (const c of mine) await composioFetch(`/connected_accounts/${encodeURIComponent(c.id)}`, { method: "DELETE" });
  return mine.length;
}

/** Names of the user's app connectors (from connect_app); see `appConnectorName`. */
export async function appConnectorNames(user: User): Promise<Set<string>> {
  const prefix = `${user.handle}-composio-`;
  return new Set((await store.listConnectors(user.id)).map((c) => c.name).filter((n) => n.startsWith(prefix)));
}
