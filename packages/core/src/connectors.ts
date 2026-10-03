import { Client, StreamableHTTPClientTransport } from "@modelcontextprotocol/client";
import { ConnectorActionSchema, type ActionParam, type Connector, type ConnectorAction, type ConnectorActionInput } from "./schema";
import { decryptSecret } from "./secrets";
import { executeComposioTool } from "./composio-api";

/**
 * The connector runtime. Actions are declarative — an HTTP request template or a call to a
 * remote MCP server — so Agents Space never runs builder code. Placeholders:
 *   {{args.<param>}}   a value the caller passes
 *   {{secret.<NAME>}}  an owner-set secret, decrypted only for the outgoing request
 * Requests may only go to the connector's declared hosts, never to private networks.
 */

const PLACEHOLDER = /\{\{\s*(args|secret)\.([A-Za-z0-9_]+)\s*\}\}/g;
const WHOLE = /^\{\{\s*(args|secret)\.([A-Za-z0-9_]+)\s*\}\}$/;
const TIMEOUT_MS = 30_000;
const MAX_BODY = 50_000;

type Ctx = { args: Record<string, unknown>; secrets: Record<string, string> };

/** Every placeholder used anywhere in a value, by kind. */
function placeholders(v: unknown, out = { args: new Set<string>(), secret: new Set<string>() }) {
  if (typeof v === "string") for (const [, kind, name] of v.matchAll(PLACEHOLDER)) out[kind as "args" | "secret"].add(name);
  else if (Array.isArray(v)) v.forEach((x) => placeholders(x, out));
  else if (v && typeof v === "object") Object.values(v).forEach((x) => placeholders(x, out));
  return out;
}

const lookup = (ctx: Ctx, kind: string, name: string) => (kind === "secret" ? ctx.secrets[name] : ctx.args[name]);

function renderString(s: string, ctx: Ctx, encode = false): string {
  return s.replace(PLACEHOLDER, (_m, kind, name) => {
    const v = lookup(ctx, kind, name);
    const str = v === undefined || v === null ? "" : typeof v === "object" ? JSON.stringify(v) : String(v);
    return encode ? encodeURIComponent(str) : str;
  });
}

/** Render a JSON template. A string that is exactly one placeholder keeps the value's type. */
function renderJson(v: unknown, ctx: Ctx): unknown {
  if (typeof v === "string") {
    const whole = v.match(WHOLE);
    return whole ? lookup(ctx, whole[1], whole[2]) : renderString(v, ctx);
  }
  if (Array.isArray(v)) return v.map((x) => renderJson(x, ctx));
  if (v && typeof v === "object") return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, renderJson(x, ctx)]));
  return v;
}

/** Fill the URL template; path/query placeholders are URL-encoded so args can't change the host. */
function renderUrl(template: string, ctx: Ctx): URL {
  const [, origin = "", rest = ""] = template.match(/^(https?:\/\/[^/?#]+)(.*)$/) ?? [];
  return new URL(origin + renderString(rest, ctx, true));
}

export function isPrivateHost(host: string): boolean {
  const h = host.toLowerCase().replace(/^\[|\]$/g, "");
  if (h === "localhost" || h.endsWith(".localhost") || h.endsWith(".local") || h.endsWith(".internal")) return true;
  if (h === "::1" || h === "::" || /^f[cd]/.test(h) || h.startsWith("fe80")) return true;
  const ip = h.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/)?.slice(1).map(Number);
  if (!ip) return false;
  const [a, b] = ip;
  return a === 0 || a === 10 || a === 127 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127);
}

function checkHost(url: URL, hosts: string[]) {
  if (!/^https?:$/.test(url.protocol)) throw new Error(`Only http(s) URLs are allowed, got ${url.protocol}`);
  if (isPrivateHost(url.hostname)) throw new Error(`${url.hostname} is a private address; connectors can only call public hosts.`);
  if (!hosts.includes(url.host)) throw new Error(`${url.host} is not in this connector's hosts (${hosts.join(", ") || "none"}).`);
}

/**
 * Validate a builder's connector spec and fill in what can be derived: hosts from action URLs,
 * secret names from {{secret.X}}, and undeclared {{args.x}} as optional string params.
 */
export function prepareConnector(spec: { actions: ConnectorActionInput[]; hosts?: string[]; secrets?: string[] }) {
  const hosts = new Set(spec.hosts ?? []);
  const secrets = new Set(spec.secrets ?? []);
  const names = new Set<string>();
  const actions: ConnectorAction[] = spec.actions.map((input) => {
    const a = ConnectorActionSchema.parse(input);
    if (names.has(a.name)) throw new Error(`Two actions are named "${a.name}".`);
    names.add(a.name);
    if (a.type === "composio") return a;

    const origin = a.url.match(/^(https?:\/\/[^/?#]+)/)?.[1];
    if (!origin) throw new Error(`Action "${a.name}": url must start with https:// (got "${a.url}").`);
    if (origin.includes("{{")) throw new Error(`Action "${a.name}": the host can't contain placeholders — put them in the path or query.`);
    const host = new URL(origin).host;
    if (isPrivateHost(new URL(origin).hostname)) throw new Error(`Action "${a.name}": ${host} is a private address.`);
    hosts.add(host);

    const used = placeholders(a);
    for (const s of used.secret) secrets.add(s);
    for (const p of used.args) a.params[p] ??= { type: "string", required: false };
    return a;
  });
  for (const s of secrets) if (!/^[A-Z][A-Z0-9_]*$/.test(s)) throw new Error(`Secret names must be UPPER_SNAKE_CASE (got "${s}").`);
  return { actions, hosts: [...hosts], secrets: [...secrets] };
}

/** Wrap a remote MCP server as `list_tools` + `call_tool` actions. */
export function mcpServerActions(url: string, headers: Record<string, string> = {}): ConnectorActionInput[] {
  return [
    { type: "mcp", name: "list_tools", description: `List the tools on ${url}`, url, headers, op: "list_tools" },
    {
      type: "mcp",
      name: "call_tool",
      description: `Call a tool on ${url} (see list_tools for names and arguments)`,
      url,
      headers,
      op: "call_tool",
      params: {
        tool: { type: "string", required: true, description: "Tool name" },
        arguments: { type: "object", description: "Tool arguments" },
      },
    },
  ];
}

function checkArgs(params: Record<string, ActionParam>, args: Record<string, unknown>) {
  const missing = Object.entries(params)
    .filter(([k, p]) => p.required && (args[k] === undefined || args[k] === null || args[k] === ""))
    .map(([k]) => k);
  if (missing.length) throw new Error(`Missing required argument(s): ${missing.join(", ")}.`);
}

/** Never let a secret value leak back to a caller, even if an API echoes it. */
function redact(text: string, secrets: Record<string, string>) {
  for (const [name, v] of Object.entries(secrets)) if (v.length >= 4) text = text.split(v).join(`[secret:${name}]`);
  return text;
}

async function runHttp(c: Connector, a: Extract<ConnectorAction, { type: "http" }>, ctx: Ctx) {
  const url = renderUrl(a.url, ctx);
  for (const [k, v] of Object.entries(a.query)) {
    const val = renderString(v, ctx);
    if (val !== "") url.searchParams.set(k, val);
  }
  checkHost(url, c.hosts);

  const headers = new Headers(Object.entries(a.headers).map(([k, v]): [string, string] => [k, renderString(v, ctx)]));
  let body: string | undefined;
  if (a.body !== undefined && a.method !== "GET") {
    const rendered = renderJson(a.body, ctx);
    body = typeof rendered === "string" ? rendered : JSON.stringify(rendered);
    if (!headers.has("content-type")) headers.set("content-type", "application/json");
  }

  // Redirects are not followed: they could point at a host outside the allowlist.
  const res = await fetch(url, { method: a.method, headers, body, redirect: "manual", signal: AbortSignal.timeout(TIMEOUT_MS), cache: "no-store" });
  let text = redact(await res.text(), ctx.secrets);
  if (text.length > MAX_BODY) text = `${text.slice(0, MAX_BODY)}\n…[truncated]`;
  let parsed: unknown = text;
  try {
    parsed = JSON.parse(text);
  } catch {}
  return { status: res.status, ok: res.ok, ...(res.headers.get("location") ? { location: res.headers.get("location") } : {}), body: parsed };
}

async function runMcp(c: Connector, a: Extract<ConnectorAction, { type: "mcp" }>, ctx: Ctx) {
  const url = new URL(a.url);
  checkHost(url, c.hosts);
  const headers = Object.fromEntries(Object.entries(a.headers).map(([k, v]) => [k, renderString(v, ctx)]));
  const client = new Client({ name: "agents-space", version: "1.0.0" });
  await client.connect(new StreamableHTTPClientTransport(url, { requestInit: { headers } }), { timeout: TIMEOUT_MS });
  try {
    if (a.op === "list_tools") {
      const { tools } = await client.listTools();
      return tools.map((t) => ({ name: t.name, description: t.description, inputSchema: t.inputSchema }));
    }
    const tool = a.tool ?? String(ctx.args.tool ?? "");
    if (!tool) throw new Error("Pass `tool` (and `arguments`).");
    const toolArgs = a.tool ? ctx.args : ((ctx.args.arguments as Record<string, unknown>) ?? {});
    const result = await client.callTool({ name: tool, arguments: toolArgs }, { timeout: TIMEOUT_MS });
    return JSON.parse(redact(JSON.stringify(result), ctx.secrets));
  } finally {
    await client.close().catch(() => {});
  }
}

/**
 * Run one declared action of a connector. `ciphertexts` are the connector's stored secrets;
 * they are decrypted here, used for this request only, and redacted from the result.
 */
export async function runConnectorAction(c: Connector, actionName: string, args: Record<string, unknown>, ciphertexts: Record<string, string>) {
  const a = c.actions.find((x) => x.name === actionName);
  if (!a) throw new Error(`${c.name} has no action "${actionName}". It has: ${c.actions.map((x) => x.name).join(", ")}`);
  checkArgs(a.params, args);

  const needed = [...placeholders(a).secret];
  const missing = needed.filter((s) => !ciphertexts[s]);
  if (missing.length) throw new Error(`${c.name} still needs secret(s) ${missing.join(", ")} — the owner sets them with set_connector_secret.`);
  const secrets = Object.fromEntries(needed.map((s) => [s, decryptSecret(ciphertexts[s])]));

  const ctx: Ctx = { args, secrets };
  if (a.type === "composio") {
    // Only declared params reach Composio, and always as the connector owner's account.
    const declared = Object.fromEntries(Object.entries(args).filter(([k, v]) => k in a.params && v !== undefined));
    return executeComposioTool(a.tool, c.ownerId, declared);
  }
  return a.type === "http" ? runHttp(c, a, ctx) : runMcp(c, a, ctx);
}
