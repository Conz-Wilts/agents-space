import { createMcpHandler } from "mcp-handler";
import { z } from "zod";
import {
  store,
  matchAgents,
  actionSignature,
  addContextNote,
  checkAgent,
  createConnector,
  loadSkill,
  missingSecrets,
  runAgentAction,
  scopedActions,
  setConnectorSecret,
  slug,
  claimSpace,
  getSpace,
  type Agent,
  type User,
} from "@agents-space/core";
import { currentUser, metadataPathFor, oauthEnabled, requireUser, withAuth } from "@/lib/auth";
import { agentEndpoint, fmt, origin, safe, spaceEndpoint, text } from "@/lib/format";

let base = origin();
const WEB_URL = process.env.NEXT_PUBLIC_WEB_URL ?? "http://localhost:3000";

/** Agents a viewer can see, each flagged with whether they can use it. */
async function withAccess(agents: Agent[], userId?: string) {
  return Promise.all(agents.map(async (a) => ({ agent: a, access: await store.hasAccess(a.id, userId) })));
}

async function ownedAgent(id: string, userId: string) {
  const a = await store.getAgent(id);
  if (!a) throw new Error(`No agent "${id}". See my_agents.`);
  if (a.ownerId !== userId) throw new Error(`You don't own "${id}".`);
  return a;
}

/** Where the space stands and what to do next. */
async function spaceStatus(user: User, space: Agent) {
  const [notes, actions, requests] = await Promise.all([
    store.listNotes(space.id),
    scopedActions(space),
    store.listAccessRequests({ ownerId: user.id }),
  ]);
  const mine = requests.filter((r) => r.agentId === space.id);
  const approved = mine.filter((r) => r.status === "approved").length;
  const pending = mine.filter((r) => r.status === "pending").length;
  return [
    // Built from the serving origin, not the stored endpoint: a claim made on another deployment (or locally) stored its own origin.
    `Your space: ${spaceEndpoint(base, space.id)}`,
    `@${user.handle} · ${space.visibility === "private" ? "private: only people you approve can call it, not listed in the directory" : "public: anyone can call it, listed in the directory"}`,
    "",
    `Shared context: ${notes.length ? notes.map((n) => n.title).join(", ") : "nothing yet"}`,
    `Actions it can take: ${actions.length ? actions.map(actionSignature).join(", ") : "none yet"}`,
    `People with access: ${approved}${pending ? ` (${pending} waiting: list_access_requests)` : ""}`,
    "",
    "Your rules:",
    space.instructions,
    "",
    `Next steps (agent_id "${space.id}"):`,
    "1. Share what it can use: add_context_note (availability, prices, policies, FAQs), or create_connector + attach_connector for a calendar or other system.",
    "2. Set your rules in plain words with update_agent instructions: what it answers alone, what it asks you first, what it never touches.",
    `3. Decide who can reach you: allow_access("@their-handle") (list_access, revoke_access). Their agents then call ask_space("${space.id}"). To be listed in the directory, update_agent visibility public.`,
  ].join("\n");
}

/** `@Emma ` → `emma`. */
const plainHandle = (h: string) => h.trim().replace(/^@/, "").toLowerCase();

/** The signed-in user and their space, or a clear error. */
async function ownSpace(ctx: Parameters<typeof requireUser>[0]) {
  const user = await requireUser(ctx);
  const space = await getSpace(user);
  if (!space) throw new Error("You don't have a space yet. Claim one with claim_space.");
  return { user, space };
}

/** `?claim=<handle>` on the MCP URL (from the landing page): claim it on the first signed-in request. */
async function claimFromUrl(req: Request) {
  const handle = new URL(req.url).searchParams.get("claim")?.toLowerCase();
  const userId = req.auth?.clientId;
  if (!handle || !userId) return;
  const user = await store.getUser(userId);
  if (!user?.authId || (await getSpace(user))) return;
  try {
    await claimSpace(user, handle, (id) => spaceEndpoint(base, id));
  } catch (e) {
    // Taken since the landing page checked, or invalid: my_space explains and offers claim_space.
    console.warn("[claim]", handle, e instanceof Error ? e.message : e);
  }
}

const agentBase = {
  name: z.string().min(2),
  tagline: z.string().max(140).describe("One line: what it takes off someone's plate"),
  description: z.string(),
  instructions: z
    .string()
    .describe("The skill, in plain language: how the agent should handle requests, rules, tone, what to ask for, when to use which connector action"),
  solves: z.array(z.string()).describe("Jobs it removes, e.g. ['restaurant reservations','table bookings']"),
  tools: z.array(z.string()).describe("Products it operates, e.g. ['Google Reviews','OpenTable']"),
  category: z.string(),
  visibility: z.enum(["public", "private"]).describe("private = listed, but people must request access"),
  pricing: z.enum(["free", "usage", "subscription", "contact"]),
};

const createAgentInput = z.object({
  ...agentBase,
  description: agentBase.description.default(""),
  solves: agentBase.solves.default([]),
  tools: agentBase.tools.default([]),
  category: agentBase.category.default("General"),
  visibility: agentBase.visibility.default("public"),
  pricing: agentBase.pricing.default("free"),
});

// No defaults here: an omitted field must stay untouched.
const updateAgentInput = z.object(agentBase).partial().extend({ agent_id: z.string() });

const handler = createMcpHandler(
  (server) => {
    /* ───────────── account ───────────── */

    server.registerTool(
      "create_account",
      {
        title: "Create an account",
        description:
          "Create an Agents Space account and get an API key (shown ONCE). Needed to build agents, own connectors and request access to private agents. Humans can instead sign in with Google on the website and copy a key from their account page.",
        inputSchema: z.object({ handle: z.string().describe("Lowercase handle, e.g. 'luigis-trattoria'") }),
      },
      safe(async ({ handle }) => {
        const { user, apiKey } = await store.createUser(handle);
        return text(
          `Account @${user.handle} created.\n\nAPI key (save it now — it is not shown again):\n${apiKey}\n\nReconnect this MCP with header \`Authorization: Bearer ${apiKey}\`, or use ${base}/mcp?key=${apiKey}`,
        );
      }),
    );

    server.registerTool(
      "whoami",
      { title: "Who am I", description: "The signed-in account, if any.", inputSchema: z.object({}) },
      safe(async (_i, ctx) => {
        const u = await currentUser(ctx);
        return text(u ? `Signed in as @${u.handle} (${u.id}).` : `Not signed in. Sign in with Google at ${WEB_URL}/account to get an API key, or call create_account.`);
      }),
    );

    /* ───────────── space ───────────── */

    server.registerTool(
      "my_space",
      {
        title: "My space",
        description:
          "Your space: your own MCP address that other people's agents call instead of waiting on you. Shows the address, what it shares, your rules, who has access, and next steps. Call this first when someone just connected.",
        inputSchema: z.object({}),
      },
      safe(async (_i, ctx) => {
        const user = await requireUser(ctx);
        const space = await getSpace(user);
        if (space) return text(await spaceStatus(user, space));
        if (!user.authId)
          return text(`You're signed in with an API key (@${user.handle}). Claiming a space needs a Google sign-in: reconnect this MCP without the key and sign in with Google when your client asks.`);
        const wanted = ctx.http?.req ? new URL(ctx.http.req.url).searchParams.get("claim") : null;
        return text(
          `You don't have a space yet.${wanted ? ` "${wanted}" couldn't be claimed (taken or invalid).` : ""} Claim one with claim_space: it becomes your address at ${spaceEndpoint(base, "<handle>")}. Your current handle is @${user.handle}.`,
        );
      }),
    );

    server.registerTool(
      "claim_space",
      {
        title: "Claim your space",
        description:
          "Claim a handle and create your space at <origin>/<handle>/mcp: a private MCP that answers for you with what you share and the rules you set. Needs a Google sign-in. The handle is locked once claimed.",
        inputSchema: z.object({ handle: z.string().describe("2–32 lowercase letters, numbers or dashes, e.g. 'emma' or 'marcos-trattoria'") }),
      },
      safe(async ({ handle }, ctx) => {
        const user = await requireUser(ctx);
        const { user: owner, space, created } = await claimSpace(user, handle.toLowerCase(), (id) => spaceEndpoint(base, id));
        return text(`${created ? "Claimed" : "Already yours"}: @${owner.handle}.\n\n${await spaceStatus(owner, space)}`);
      }),
    );

    server.registerTool(
      "ask_space",
      {
        title: "Ask someone's space",
        description:
          "Reach a person or business by handle (e.g. '@emma', 'marcos-trattoria') through their space, as the signed-in user. Returns their rules, what they share and the actions you may run, then answer from that or call run_agent_action with agent_id = the handle. If they haven't allowed you, it says how to ask.",
        inputSchema: z.object({ handle: z.string().describe("Their handle, with or without @") }),
      },
      safe(async ({ handle }, ctx) => {
        const h = plainHandle(handle);
        const user = await currentUser(ctx);
        const a = await store.getAgent(h);
        if (!a || a.kind !== "hosted") throw new Error(`No space "@${h}". Check the handle, or search_agents to find someone.`);
        if (!(await store.hasAccess(a.id, user?.id))) {
          if (!user) throw new Error(`@${h}'s space is private. Sign in, then request_access("${h}").`);
          const pending = (await store.listAccessRequests({ requesterId: user.id })).some((r) => r.agentId === a.id && r.status === "pending");
          throw new Error(
            pending
              ? `You asked @${h} for access; they haven't answered yet.`
              : `@${h} hasn't allowed you yet. Call request_access with agent_id "${h}" and say who you are, or ask them to allow @${user.handle}.`,
          );
        }
        const actions = await scopedActions(a);
        return text(
          `You're talking to @${h}'s space as @${user?.handle ?? "anonymous"}. Follow its rules; if a request needs @${h}'s decision, say so instead of acting.\n\n${await loadSkill(a)}\n\n## Actions (run_agent_action with agent_id "${h}")\n${actions.map((x) => `- ${actionSignature(x)}: ${x.description}`).join("\n") || "none: answer from the context above"}`,
        );
      }),
    );

    server.registerTool(
      "allow_access",
      {
        title: "Allow someone into your space",
        description: "Whitelist a person by handle so their agents can use your space (ask_space). No request needed.",
        inputSchema: z.object({ handle: z.string().describe("Their handle, with or without @") }),
      },
      safe(async ({ handle }, ctx) => {
        const { space } = await ownSpace(ctx);
        const who = await store.userByHandle(plainHandle(handle));
        if (!who) throw new Error(`No one is @${plainHandle(handle)} on Agents Space yet.`);
        const r = await store.requestAccess(space.id, who.id, "Allowed by the owner");
        if (r.status !== "approved") await store.decideAccessRequest(r.id, "approved");
        return text(`@${who.handle} can now use your space: their agent calls ask_space("${space.id}").`);
      }),
    );

    server.registerTool(
      "revoke_access",
      {
        title: "Remove someone from your space",
        description: "Take a person's access to your space away. They can ask again with request_access.",
        inputSchema: z.object({ handle: z.string().describe("Their handle, with or without @") }),
      },
      safe(async ({ handle }, ctx) => {
        const { user, space } = await ownSpace(ctx);
        const who = await store.userByHandle(plainHandle(handle));
        const grants = who ? (await store.listAccessRequests({ ownerId: user.id })).filter((r) => r.agentId === space.id && r.requesterId === who.id && r.status !== "denied") : [];
        if (!grants.length) throw new Error(`@${plainHandle(handle)} has no access to your space.`);
        for (const r of grants) await store.decideAccessRequest(r.id, "denied");
        return text(`@${who!.handle} no longer has access to your space.`);
      }),
    );

    server.registerTool(
      "list_access",
      {
        title: "Who can use your space",
        description: "People allowed into your space, and requests waiting for you (approve with review_access_request or allow_access).",
        inputSchema: z.object({}),
      },
      safe(async (_i, ctx) => {
        const { user, space } = await ownSpace(ctx);
        const rs = (await store.listAccessRequests({ ownerId: user.id })).filter((r) => r.agentId === space.id && r.status !== "denied");
        const line = async (r: (typeof rs)[number]) => `• @${(await store.getUser(r.requesterId))?.handle ?? "?"}${r.message ? `: "${r.message}"` : ""} (${r.id})`;
        const allowed = await Promise.all(rs.filter((r) => r.status === "approved").map(line));
        const waiting = await Promise.all(rs.filter((r) => r.status === "pending").map(line));
        return text(`Allowed (${allowed.length}):\n${allowed.join("\n") || "nobody yet"}\n\nWaiting for you (${waiting.length}):\n${waiting.join("\n") || "none"}`);
      }),
    );

    /* ───────────── discover ───────────── */

    server.registerTool(
      "describe_bottleneck",
      {
        title: "Describe your bottleneck",
        description:
          "A human explains the work where THEY are the bottleneck (what only they can unblock), and the tools they use. Returns agents from the directory that could take it off their plate.",
        inputSchema: z.object({
          role: z.string().describe("Who you are, e.g. 'Founder of a 5-person agency'"),
          description: z.string().min(10).describe("What work waits on you, and why"),
          tools: z.array(z.string()).default([]).describe("Tools you use for this work, e.g. ['Gmail','Stripe']"),
          hoursPerWeek: z.number().min(0).max(168).optional().describe("Rough hours per week this costs you"),
        }),
      },
      safe(async (input, ctx) => {
        const user = await currentUser(ctx);
        const b = await store.addBottleneck(input);
        const agents = (await Promise.all(b.matchedAgentIds.map((id) => store.getAgent(id)))).filter((a): a is Agent => !!a);
        if (!agents.length)
          return text(`Logged bottleneck ${b.id}. No agents match yet — a gap in the directory. Anyone can fill it with create_agent.`);
        const rows = await withAccess(agents, user?.id);
        return text(`Logged bottleneck ${b.id}. Agents that could unblock you:\n\n${rows.map((r) => fmt(r.agent, r.access)).join("\n\n")}`);
      }),
    );

    server.registerTool(
      "search_agents",
      {
        title: "Search the agent directory",
        description: "Find agents by job-to-be-done and/or the tools they operate. Includes private agents (marked 'request access').",
        inputSchema: z.object({
          query: z.string().describe("What you need done"),
          tools: z.array(z.string()).default([]),
          limit: z.number().int().min(1).max(25).default(5),
        }),
      },
      safe(async ({ query, tools, limit }, ctx) => {
        const user = await currentUser(ctx);
        const results = matchAgents(await store.listAgents({ viewerId: user?.id }), query, tools, limit);
        const rows = await withAccess(results.map((r) => r.agent), user?.id);
        return text(rows.length ? rows.map((r) => fmt(r.agent, r.access)).join("\n\n") : "No matching agents.");
      }),
    );

    server.registerTool(
      "list_agents",
      {
        title: "List agents",
        description: "List every agent in the directory, optionally filtered by category.",
        inputSchema: z.object({ category: z.string().optional() }),
      },
      safe(async ({ category }, ctx) => {
        const user = await currentUser(ctx);
        const rows = await withAccess(await store.listAgents({ category, viewerId: user?.id }), user?.id);
        return text(rows.map((r) => fmt(r.agent, r.access)).join("\n\n") || "Directory is empty.");
      }),
    );

    server.registerTool(
      "get_agent",
      {
        title: "Get agent",
        description: "Details for one agent: what it does, who owns it, its MCP endpoint and whether you can use it.",
        inputSchema: z.object({ id: z.string() }),
      },
      safe(async ({ id }, ctx) => {
        const user = await currentUser(ctx);
        const a = await store.getAgent(id);
        if (!a || (a.status === "draft" && a.ownerId !== user?.id)) return text(`No agent with id "${id}".`);
        const access = await store.hasAccess(id, user?.id);
        const actions = access ? await scopedActions(a) : [];
        return text(
          [
            fmt(a, access),
            "",
            a.description,
            `solves: ${a.solves.join(", ") || "—"}`,
            access
              ? `actions: ${actions.map((x) => `${x.connector}.${x.action}`).join(", ") || "none"}\nUse it: use_agent("${a.id}") here, or connect ${a.endpoint ?? "its endpoint"} as its own MCP server.`
              : `Private — call request_access("${a.id}") and the owner will review it.`,
          ].join("\n"),
        );
      }),
    );

    /* ───────────── access ───────────── */

    server.registerTool(
      "request_access",
      {
        title: "Request access to a private agent",
        description: "Ask a private agent's owner for access. They approve or deny with review_access_request.",
        inputSchema: z.object({ agent_id: z.string(), message: z.string().default("").describe("Who you are and what you'll use it for") }),
      },
      safe(async ({ agent_id, message }, ctx) => {
        const user = await requireUser(ctx);
        const a = await store.getAgent(agent_id);
        if (!a || a.status !== "published") throw new Error(`No published agent "${agent_id}".`);
        if (await store.hasAccess(a.id, user.id)) return text(`You already have access to ${a.name}.`);
        const r = await store.requestAccess(a.id, user.id, message);
        return text(`Access request ${r.id} for ${a.name} is ${r.status}. Check with my_access_requests.`);
      }),
    );

    server.registerTool(
      "my_access_requests",
      { title: "My access requests", description: "Requests you've made to use private agents, and their status.", inputSchema: z.object({}) },
      safe(async (_i, ctx) => {
        const user = await requireUser(ctx);
        const rs = await store.listAccessRequests({ requesterId: user.id });
        return text(rs.map((r) => `• ${r.agentId} — ${r.status} (${r.id})`).join("\n") || "No requests.");
      }),
    );

    server.registerTool(
      "list_access_requests",
      { title: "Incoming access requests", description: "People asking to use your private agents.", inputSchema: z.object({ status: z.enum(["pending", "approved", "denied"]).optional() }) },
      safe(async ({ status }, ctx) => {
        const user = await requireUser(ctx);
        const rs = (await store.listAccessRequests({ ownerId: user.id })).filter((r) => !status || r.status === status);
        const lines = await Promise.all(
          rs.map(async (r) => `• ${r.id} — @${(await store.getUser(r.requesterId))?.handle ?? "?"} → ${r.agentId} [${r.status}]${r.message ? `: "${r.message}"` : ""}`),
        );
        return text(lines.join("\n") || "No requests.");
      }),
    );

    server.registerTool(
      "review_access_request",
      { title: "Approve or deny access", description: "Decide an access request for one of your agents.", inputSchema: z.object({ request_id: z.string(), decision: z.enum(["approved", "denied"]) }) },
      safe(async ({ request_id, decision }, ctx) => {
        const user = await requireUser(ctx);
        const r = (await store.listAccessRequests({ ownerId: user.id })).find((x) => x.id === request_id);
        if (!r) throw new Error(`No request "${request_id}" on your agents.`);
        await store.decideAccessRequest(r.id, decision);
        return text(`Request ${r.id} ${decision}.`);
      }),
    );

    /* ───────────── build ───────────── */

    server.registerTool(
      "create_agent",
      {
        title: "Create an agent",
        description:
          "Step 1 of building an agent from natural language. Creates a DRAFT hosted agent from plain-language instructions. Next: add_context_note (menus, policies, FAQs), create_connector + attach_connector (the systems it acts in), test_agent, publish_agent.",
        inputSchema: createAgentInput,
      },
      safe(async (input, ctx) => {
        const user = await requireUser(ctx);
        let a = await store.addAgent({ ...input, kind: "hosted", status: "draft", protocol: "mcp", owner: `@${user.handle}`, ownerId: user.id });
        a = await store.updateAgent(a.id, { endpoint: agentEndpoint(base, a.id) });
        return text(`Draft agent ${a.id} created.\n\n${fmt(a)}\n\nNext: add_context_note, create_connector → attach_connector, test_agent, publish_agent.`);
      }),
    );

    server.registerTool(
      "update_agent",
      {
        title: "Update an agent",
        description: "Change any field of an agent you own.",
        inputSchema: updateAgentInput,
      },
      safe(async ({ agent_id, ...patch }, ctx) => {
        const user = await requireUser(ctx);
        await ownedAgent(agent_id, user.id);
        const clean = Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined));
        const a = await store.updateAgent(agent_id, clean);
        return text(`Updated.\n\n${fmt(a)}`);
      }),
    );

    server.registerTool(
      "add_context_note",
      {
        title: "Add a context note",
        description:
          "Give an agent knowledge it needs (menu, opening hours, booking policy, FAQ). Included in the agent's skill. Same title again replaces the note.",
        inputSchema: z.object({ agent_id: z.string(), title: z.string(), body: z.string().describe("Markdown") }),
      },
      safe(async ({ agent_id, title, body }, ctx) => {
        const user = await requireUser(ctx);
        const a = await ownedAgent(agent_id, user.id);
        await addContextNote(a, title, body);
        const notes = await store.listNotes(a.id);
        return text(`Saved. ${a.name} has ${notes.length} context note(s):\n${notes.map((n) => `• ${n.title} (${n.slug})`).join("\n")}`);
      }),
    );

    server.registerTool(
      "remove_context_note",
      {
        title: "Remove a context note",
        description: "Delete one of an agent's context notes by title or slug.",
        inputSchema: z.object({ agent_id: z.string(), note: z.string().describe("Title or slug") }),
      },
      safe(async ({ agent_id, note }, ctx) => {
        const user = await requireUser(ctx);
        const a = await ownedAgent(agent_id, user.id);
        const ok = await store.deleteNote(a.id, slug(note));
        return text(ok ? `Removed "${note}" from ${a.name}.` : `${a.name} has no note "${note}".`);
      }),
    );

    const param = z.object({
      type: z.enum(["string", "number", "boolean", "object", "array"]).default("string"),
      description: z.string().optional(),
      required: z.boolean().default(false),
    });

    server.registerTool(
      "create_connector",
      {
        title: "Create a connector",
        description: [
          "Connect an external system so agents can act in it. Two kinds of action:",
          "• http: a request template — method, url, query, headers, body. Use {{args.<param>}} for values the caller passes and {{secret.<NAME>}} for API keys, e.g. headers {\"Authorization\": \"Bearer {{secret.OPENTABLE_KEY}}\"}, url \"https://api.example.com/v1/bookings/{{args.id}}\". A body string that is exactly one placeholder keeps the arg's type.",
          "• mcp_url: wrap an existing remote MCP server; adds list_tools and call_tool actions.",
          "Hosts and secret names are derived from the templates. Set secret values with set_connector_secret — they're encrypted and never shown again. Same name again replaces the connector.",
        ].join("\n"),
        inputSchema: z.object({
          name: z.string().describe("Short name, e.g. 'bookings' (namespaced to your handle)"),
          title: z.string(),
          description: z.string(),
          actions: z
            .array(
              z.object({
                name: z.string().regex(/^[a-z][a-z0-9_]*$/),
                description: z.string().describe("What it does and when to use it — callers' LLMs read this"),
                params: z.record(z.string(), param).default({}).describe("Arguments callers pass, by name"),
                method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]).default("GET"),
                url: z.string().describe("Absolute https URL; placeholders allowed in path, not host"),
                query: z.record(z.string(), z.string()).default({}).describe("Query params; empty values are dropped"),
                headers: z.record(z.string(), z.string()).default({}),
                body: z.unknown().optional().describe("JSON body template (ignored for GET)"),
              }),
            )
            .default([]),
          mcp_url: z.string().url().optional().describe("Wrap a remote MCP server"),
          mcp_headers: z.record(z.string(), z.string()).optional().describe("Headers for the MCP server, e.g. {\"Authorization\": \"Bearer {{secret.REVIEWS_KEY}}\"}"),
          hosts: z.array(z.string()).optional().describe("Extra allowed hosts (derived from action URLs otherwise)"),
        }),
      },
      safe(async ({ mcp_url, mcp_headers, actions, ...spec }, ctx) => {
        const user = await requireUser(ctx);
        const c = await createConnector(user, {
          ...spec,
          actions: actions.map((a) => ({ ...a, type: "http" as const })),
          mcpUrl: mcp_url,
          mcpHeaders: mcp_headers,
        });
        return text(
          `Connector ${c.name} saved.\nactions: ${c.actions.map((a) => a.name).join(", ")}\nhosts: ${c.hosts.join(", ")}\n${c.secrets.length ? `Needs secrets: ${c.secrets.join(", ")} → set_connector_secret.\n` : ""}Then attach_connector to give an agent scoped access.`,
        );
      }),
    );

    server.registerTool(
      "set_connector_secret",
      {
        title: "Set a connector secret",
        description: "Store an API key for one of YOUR connectors. Encrypted at rest; never shown to anyone, including callers of your agents.",
        inputSchema: z.object({ connector: z.string(), name: z.string(), value: z.string().min(1) }),
      },
      safe(async ({ connector, name, value }, ctx) => {
        const user = await requireUser(ctx);
        await setConnectorSecret(user, connector, name, value);
        return text(`Secret ${name} set on ${connector}.`);
      }),
    );

    server.registerTool(
      "my_connectors",
      { title: "My connectors", description: "Connectors you've created.", inputSchema: z.object({}) },
      safe(async (_i, ctx) => {
        const user = await requireUser(ctx);
        const cs = await store.listConnectors(user.id);
        const lines = await Promise.all(
          cs.map(async (c) => {
            const missing = await missingSecrets(c);
            return `• ${c.name} — ${c.description}\n  actions: ${c.actions.map((a) => a.name).join(", ")} | hosts: ${c.hosts.join(", ")} | secrets: ${c.secrets.map((s) => `${s}${missing.includes(s) ? " (not set)" : " ✓"}`).join(", ") || "none"}`;
          }),
        );
        return text(lines.join("\n") || "None yet. Use create_connector.");
      }),
    );

    server.registerTool(
      "attach_connector",
      {
        title: "Give an agent scoped access to a connector",
        description: "Let an agent use some (or all) actions of one of your connectors. Callers of the agent can run only these actions — never raw code, never the secrets.",
        inputSchema: z.object({
          agent_id: z.string(),
          connector: z.string(),
          actions: z.array(z.string()).default([]).describe("Allowed action names; empty = all declared actions"),
        }),
      },
      safe(async ({ agent_id, connector, actions }, ctx) => {
        const user = await requireUser(ctx);
        const a = await ownedAgent(agent_id, user.id);
        const c = await store.getConnector(connector);
        if (!c || c.ownerId !== user.id) throw new Error(`You don't own a connector "${connector}".`);
        const bad = actions.filter((x) => !c.actions.some((y) => y.name === x));
        if (bad.length) throw new Error(`${connector} has no action(s) ${bad.join(", ")}. It has: ${c.actions.map((y) => y.name).join(", ")}`);
        const next = await store.updateAgent(a.id, { connectors: [...a.connectors.filter((s) => s.connector !== connector), { connector, actions }] });
        const scope = await scopedActions(next);
        return text(`${next.name} can now run: ${scope.map((s) => `${s.connector}.${s.action}`).join(", ")}`);
      }),
    );

    server.registerTool(
      "detach_connector",
      { title: "Remove a connector from an agent", description: "Revoke an agent's access to a connector.", inputSchema: z.object({ agent_id: z.string(), connector: z.string() }) },
      safe(async ({ agent_id, connector }, ctx) => {
        const user = await requireUser(ctx);
        const a = await ownedAgent(agent_id, user.id);
        await store.updateAgent(a.id, { connectors: a.connectors.filter((s) => s.connector !== connector) });
        return text(`Removed ${connector} from ${a.name}.`);
      }),
    );

    server.registerTool(
      "test_agent",
      {
        title: "Test an agent",
        description: "Owner check before publishing: lists problems (missing secrets, bad connectors) and optionally runs one scoped action for real.",
        inputSchema: z.object({
          agent_id: z.string(),
          connector: z.string().optional(),
          action: z.string().optional(),
          args: z.record(z.string(), z.unknown()).default({}),
        }),
      },
      safe(async ({ agent_id, connector, action, args }, ctx) => {
        const user = await requireUser(ctx);
        const a = await ownedAgent(agent_id, user.id);
        const problems = await checkAgent(a);
        const out = [problems.length ? `Problems:\n${problems.map((p) => `- ${p}`).join("\n")}` : "No problems found."];
        if (connector && action) out.push(`\n${connector}.${action} →\n${JSON.stringify(await runAgentAction(a, connector, action, args), null, 2).slice(0, 8000)}`);
        out.push(`\nSkill preview:\n${(await loadSkill(a)).slice(0, 3000)}`);
        return text(out.join("\n"));
      }),
    );

    server.registerTool(
      "publish_agent",
      {
        title: "Publish an agent",
        description: "List a draft agent in the directory. Public = anyone can use it; private = listed, access by request. Returns its MCP endpoint to share (e.g. link it from your Google Business profile).",
        inputSchema: z.object({ agent_id: z.string(), visibility: z.enum(["public", "private"]).optional() }),
      },
      safe(async ({ agent_id, visibility }, ctx) => {
        const user = await requireUser(ctx);
        const a = await ownedAgent(agent_id, user.id);
        const problems = await checkAgent(a);
        const blocking = problems.filter((p) => !p.includes("needs secret"));
        if (blocking.length) throw new Error(`Fix before publishing:\n${blocking.map((p) => `- ${p}`).join("\n")}`);
        const next = await store.updateAgent(a.id, { status: "published", visibility: visibility ?? a.visibility, endpoint: agentEndpoint(base, a.id) });
        return text(
          `${next.name} is live (${next.visibility}).\n\nMCP endpoint: ${next.endpoint}\nAny MCP client or agent can connect to it.${problems.length ? `\n\nWarnings:\n${problems.map((p) => `- ${p}`).join("\n")}` : ""}`,
        );
      }),
    );

    server.registerTool(
      "unpublish_agent",
      { title: "Unpublish an agent", description: "Move an agent back to draft.", inputSchema: z.object({ agent_id: z.string() }) },
      safe(async ({ agent_id }, ctx) => {
        const user = await requireUser(ctx);
        await ownedAgent(agent_id, user.id);
        await store.updateAgent(agent_id, { status: "draft" });
        return text(`${agent_id} is a draft again.`);
      }),
    );

    server.registerTool(
      "my_agents",
      { title: "My agents", description: "Agents you own, drafts included.", inputSchema: z.object({}) },
      safe(async (_i, ctx) => {
        const user = await requireUser(ctx);
        const mine = (await store.listAgents({ viewerId: user.id })).filter((a) => a.ownerId === user.id);
        return text(mine.map((a) => fmt(a)).join("\n\n") || "No agents yet. Use create_agent.");
      }),
    );

    /* ───────────── use ───────────── */

    server.registerTool(
      "use_agent",
      {
        title: "Use an agent",
        description: "Load an agent's skill: its instructions, context and the actions you may run. Follow the instructions and call run_agent_action to act.",
        inputSchema: z.object({ agent_id: z.string() }),
      },
      safe(async ({ agent_id }, ctx) => {
        const user = await currentUser(ctx);
        const a = await store.getAgent(agent_id);
        if (!a) throw new Error(`No agent "${agent_id}".`);
        if (!(await store.hasAccess(a.id, user?.id)))
          throw new Error(a.visibility === "private" ? `${a.name} is private. Call request_access("${a.id}").` : `${a.name} is not published.`);
        if (a.kind === "external") return text(`${a.name} is an external agent. Connect to it directly: ${a.endpoint ?? "(no endpoint listed)"} via ${a.protocol}.`);
        const actions = await scopedActions(a);
        return text(
          `${await loadSkill(a)}\n\n## Actions (call run_agent_action)\n${actions.map((x) => `- ${actionSignature(x)}: ${x.description}`).join("\n") || "none — this agent is instructions only"}`,
        );
      }),
    );

    server.registerTool(
      "run_agent_action",
      {
        title: "Run an agent action",
        description: "Run one of an agent's scoped connector actions (see use_agent).",
        inputSchema: z.object({ agent_id: z.string(), connector: z.string(), action: z.string(), args: z.record(z.string(), z.unknown()).default({}) }),
      },
      safe(async ({ agent_id, connector, action, args }, ctx) => {
        const user = await currentUser(ctx);
        const a = await store.getAgent(agent_id);
        if (!a || !(await store.hasAccess(a.id, user?.id))) throw new Error(`No access to "${agent_id}".`);
        return text(JSON.stringify(await runAgentAction(a, connector, action, args), null, 2).slice(0, 20000));
      }),
    );

    /* ───────────── external listings ───────────── */

    server.registerTool(
      "register_agent",
      {
        title: "List an external agent",
        description: "List an agent that lives elsewhere (your own MCP/A2A/API endpoint). To BUILD one here instead, use create_agent.",
        inputSchema: z.object({
          name: z.string().min(2),
          tagline: z.string().max(140),
          description: z.string(),
          solves: z.array(z.string()).min(1).describe("Jobs / bottlenecks it removes"),
          tools: z.array(z.string()).default([]),
          category: z.string(),
          endpoint: z.string().url().optional(),
          protocol: z.enum(["mcp", "a2a", "api", "web"]).default("mcp"),
          owner: z.string().optional(),
          pricing: z.enum(["free", "usage", "subscription", "contact"]).default("free"),
        }),
      },
      safe(async (input, ctx) => {
        const user = await currentUser(ctx);
        const a = await store.addAgent({ ...input, kind: "external", owner: input.owner ?? (user ? `@${user.handle}` : "anonymous"), ownerId: user?.id });
        return text(`Registered "${a.name}" as ${a.id}.\n\n${fmt(a)}`);
      }),
    );

    /* ───────────── guided build ───────────── */

    server.registerPrompt(
      "build_agent",
      {
        title: "Build an agent with me",
        description: "Interview to turn a job (e.g. 'take restaurant reservations') into a published agent.",
        argsSchema: z.object({ job: z.string().describe("What the agent should take off your plate") }),
      },
      ({ job }) => ({
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: `Help me build an Agents Space agent that handles: ${job}.\n\nInterview me briefly (max 4 questions in one message): who uses it, the rules it must follow, the systems it must act in (their API docs or MCP URL, and how they authenticate), public or private. Then: create_account if I have no key → create_agent with clear instructions → add_context_note for policies/FAQs → create_connector for each system (http action templates or mcp_url; secrets as {{secret.NAME}} placeholders, never inline) → set_connector_secret when I give a key → attach_connector with the minimum actions → test_agent → publish_agent. Show me the endpoint at the end.`,
            },
          },
        ],
      }),
    );
  },
  {
    serverInfo: { name: "agents-space", version: "0.2.0" },
    instructions:
      "Agents Space gives people and businesses a space: their own MCP address that other people's agents call instead of waiting on them. To reach someone (\"ask emma if Saturday works\", \"check @marcos-trattoria for a table\"), call ask_space with their handle. If the user just connected, call my_space first (claim_space if they have none) and help them set it up; allow_access / revoke_access / list_access manage who can use it. Agents Space is also a directory of agents as shareable skills. Find agents (describe_bottleneck, search_agents), use them (use_agent, run_agent_action), request access to private ones (request_access), or build your own in natural language (prompt build_agent, or create_agent → add_context_note → create_connector → attach_connector → test_agent → publish_agent).",
  },
);

// With OAuth configured, the main server requires sign-in: the 401 is what makes MCP clients
// start the Google sign-in flow. Without it (local dev, no Supabase) it stays open.
const route = (req: Request) =>
  withAuth(
    async (r) => {
      base = origin(r);
      await claimFromUrl(r);
      return handler(r);
    },
    { required: oauthEnabled(), metadataPath: metadataPathFor("/mcp") },
  )(req);

export { route as GET, route as POST, route as DELETE };
