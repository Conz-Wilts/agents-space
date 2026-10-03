import { createMcpHandler } from "mcp-handler";
import { z } from "zod";
import {
  store,
  matchAgents,
  actionSignature,
  addContextNote,
  checkAgent,
  createConnector,
  appTools,
  appConnectorName,
  composioEnabled,
  connectApp,
  disconnectApp,
  listApps,
  myConnections,
  loadSkill,
  missingSecrets,
  runAgentAction,
  scopedActions,
  setConnectorSecret,
  slug,
  claimSpace,
  getSpace,
  VisibilitySchema,
  agentTables,
  defineTable,
  describeTable,
  dropTable,
  setTableContext,
  OUTPUTS_TABLE,
  checkPayment,
  enablePayments,
  money,
  paymentLine,
  paymentsEnabled,
  payoutStatus,
  priceLine,
  requestPayment,
  setPrice,
  stripeDashboardLink,
  SPACE_CATEGORY,
  type Agent,
  type User,
} from "@agents-space/core";
import { currentUser, metadataPathFor, oauthEnabled, requireUser, withAuth } from "@/lib/auth";
import { reachable } from "@/lib/access";
import { VISIBILITY_HELP, agentEndpoint, fmt, origin, safe, spaceEndpoint, text } from "@/lib/format";
import { registerRowTools } from "@/lib/table-tools";
import { registerScheduleTools } from "@/lib/schedule-tools";
import { registerModelTools } from "@/lib/model-tools";

let base = origin();
const WEB_URL = process.env.NEXT_PUBLIC_WEB_URL ?? "http://localhost:3000";

/** Agents a viewer can see, each flagged with whether they can use it. */
async function withAccess(agents: Agent[], userId?: string) {
  return Promise.all(agents.map(async (a) => ({ agent: a, access: await store.hasAccess(a.id, userId) })));
}

async function ownedAgent(id: string, userId: string) {
  const a = await store.getAgent(id);
  // Someone else's draft or private agent is indistinguishable from an unknown id.
  if (!a || (a.ownerId !== userId && (a.status !== "published" || a.visibility === "private"))) throw new Error(`No agent "${id}". See my_agents.`);
  if (a.ownerId !== userId) throw new Error(`You don't own "${id}".`);
  return a;
}

const SPACE_MODE: Record<Agent["visibility"], string> = {
  public: "public: anyone can call it, listed in the directory",
  listed: "listed: shown in the directory, but only people you approve can call it",
  restricted: "restricted: only people you approve can see or call it, not in the directory for anyone else",
  private: "private: only you can see or call it",
};

/** The agent an owner manages access for: their own space when `agentId` is omitted. */
async function accessTarget(ctx: Parameters<typeof requireUser>[0], agentId?: string) {
  if (!agentId) {
    const { user, space } = await ownSpace(ctx);
    return { user, agent: space, name: "your space" };
  }
  const user = await requireUser(ctx);
  const agent = await ownedAgent(agentId, user.id);
  return { user, agent, name: agent.name };
}

/** Where the space stands and what to do next. */
async function spaceStatus(user: User, space: Agent) {
  const [notes, actions, tables, requests, prices] = await Promise.all([
    store.listNotes(space.id),
    scopedActions(space),
    agentTables(space),
    store.listAccessRequests({ ownerId: user.id }),
    store.listPrices(space.id),
  ]);
  const payouts = paymentsEnabled() && user.stripeAccountId ? await payoutStatus(user).catch(() => undefined) : undefined;
  const payments = !paymentsEnabled()
    ? "not available on this deployment"
    : !user.stripeAccountId
      ? "off (enable_payments to charge through Stripe)"
      : payouts?.ready
        ? `on · prices: ${prices.length ? prices.map(priceLine).join("; ") : "none yet (set_price)"}`
        : "Stripe setup not finished (enable_payments for the link)";
  const mine = requests.filter((r) => r.agentId === space.id);
  const approved = mine.filter((r) => r.status === "approved").length;
  const pending = mine.filter((r) => r.status === "pending").length;
  return [
    // Built from the serving origin, not the stored endpoint: a claim made on another deployment (or locally) stored its own origin.
    `Your space: ${spaceEndpoint(base, space.id)}`,
    `@${user.handle} · ${SPACE_MODE[space.visibility]}`,
    "",
    `Shared context: ${notes.length ? notes.map((n) => n.title).join(", ") : "nothing yet"}`,
    `Actions it can take: ${actions.length ? actions.map(actionSignature).join(", ") : "none yet"}`,
    `Data tables: ${tables.map((t) => t.name).join(", ")}`,
    `People with access: ${approved}${pending ? ` (${pending} waiting: list_access_requests)` : ""}`,
    `Payments: ${payments}`,
    "",
    "Your rules:",
    space.instructions,
    "",
    `Next steps (agent_id "${space.id}"):`,
    "1. Share what it can use: add_context_note (availability, prices, policies, FAQs), create_table for data it should keep (bookings, requests, leads), or create_connector (any API or MCP server) / connect_app (1000+ apps like Gmail or Slack, signed in with OAuth) + attach_connector for a calendar or other system.",
    "2. Set your rules in plain words with update_agent instructions: what it answers alone, what it asks you first, what it never touches.",
    `3. Decide who can reach you: allow_access("@their-handle") (list_access, revoke_access). Their agents then call ask_space("${space.id}"). Visibility is "${space.visibility}"; change it with update_agent visibility (public, listed, restricted, private).`,
    ...(!paymentsEnabled()
      ? []
      : !payouts?.ready
        ? ["4. Charge for it (optional): enable_payments to connect Stripe, then set_price (e.g. a 'consultation' at 50 USD). Callers' agents get a checkout link with request_payment once a time is picked."]
        : !prices.length
          ? ["4. Payments are on: set_price for what you charge (e.g. a 'consultation' at 50 USD), and say in your rules when to ask for payment."]
          : ["4. Payments are on: my_payments shows what came in; set_price / remove_price to change prices."]),
  ].join("\n");
}

/** `@emma`, or a bare word that could be a handle. */
const HANDLE_QUERY = /^@?[a-zA-Z0-9][a-zA-Z0-9-]{0,30}[a-zA-Z0-9]$/;

/** One space found by handle (already `reachable`): whether the viewer can use it, and what to call next. */
async function spaceLine(space: Agent, viewer?: User) {
  const h = space.id;
  if (await store.hasAccess(space.id, viewer?.id)) {
    const [actions, prices] = await Promise.all([scopedActions(space), store.listPrices(space.id)]);
    const how = space.ownerId === viewer?.id ? "your space" : space.visibility === "public" ? "public" : "you're allowed in";
    return [
      `@${h}: ${space.tagline} (${how})`,
      `Actions: ${actions.length ? actions.map(actionSignature).join(", ") : "none, answers from shared context"}`,
      ...(prices.length ? [`Prices: ${prices.map(priceLine).join("; ")}`] : []),
      `Next: ask_space("@${h}") for the rules and context, then run_agent_action / request_payment with agent_id "${h}".`,
    ].join("\n");
  }
  // Restricted: only the name and "request access" are public. Listed: its info is open too.
  const info = (await store.canSeeInfo(space.id, viewer?.id)) ? `: ${space.tagline}` : "";
  if (!viewer) return `@${h}${info} (needs the owner's approval). Sign in, then request_access with agent_id "${h}".`;
  const pending = (await store.listAccessRequests({ requesterId: viewer.id })).some((r) => r.agentId === h && r.status === "pending");
  return pending
    ? `@${h}${info} (needs the owner's approval). You asked for access; they haven't answered yet.`
    : `@${h}${info} (needs the owner's approval, and you're not allowed in yet). Call request_access with agent_id "${h}" and say who you are, or ask them to allow @${viewer.handle}.`;
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
  visibility: VisibilitySchema.describe(VISIBILITY_HELP),
  mode: z
    .enum(["skill", "scheduled"])
    .describe("skill = other people's agents call it (shared over MCP); scheduled = it runs by itself for you at set times (schedule_agent), owner-only and never listed"),
  pricing: z.enum(["free", "usage", "subscription", "contact"]),
};

const createAgentInput = z.object({
  ...agentBase,
  description: agentBase.description.default(""),
  solves: agentBase.solves.default([]),
  tools: agentBase.tools.default([]),
  category: agentBase.category.default("General"),
  visibility: agentBase.visibility.default("public"),
  mode: agentBase.mode.default("skill"),
  pricing: agentBase.pricing.default("free"),
});

// No defaults here: an omitted field must stay untouched.
const updateAgentInput = z.object(agentBase).partial().extend({ agent_id: z.string() });

const AGENT_ID = z.string().optional().describe("An agent you own. Omit for your own space.");

const handler = createMcpHandler(
  (server) => {
    /* ───────────── account ───────────── */

    server.registerTool(
      "create_account",
      {
        title: "Create an account",
        description:
          "Create an Agents Space account and get an API key (shown ONCE). Needed to build agents, own connectors and request access to agents. Humans can instead sign in with Google on the website and copy a key from their account page.",
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
          "Claim a handle and create your space at <origin>/<handle>/mcp: an MCP restricted to people you approve, that answers for you with what you share and the rules you set. Needs a Google sign-in. The handle is locked once claimed.",
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
        const a = await reachable(h, user?.id);
        if (!a || a.kind !== "hosted") throw new Error(`No space "@${h}". Check the handle, or search_agents to find someone.`);
        if (!(await store.hasAccess(a.id, user?.id))) {
          if (!user) throw new Error(`@${h}'s space needs their approval. Sign in, then request_access("${h}").`);
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
        description: "Whitelist a person by handle so their agents can use your space (ask_space), or another agent you own (agent_id). No request needed.",
        inputSchema: z.object({ handle: z.string().describe("Their handle, with or without @"), agent_id: AGENT_ID }),
      },
      safe(async ({ handle, agent_id }, ctx) => {
        const { agent, name } = await accessTarget(ctx, agent_id);
        const who = await store.userByHandle(plainHandle(handle));
        if (!who) throw new Error(`No one is @${plainHandle(handle)} on Agents Space yet.`);
        const r = await store.requestAccess(agent.id, who.id, "Allowed by the owner");
        if (r.status !== "approved") await store.decideAccessRequest(r.id, "approved");
        const how = agent_id ? `use_agent("${agent.id}")` : `ask_space("${agent.id}")`;
        const note = agent.visibility === "private" ? ` ${name} is private, so this only takes effect once you change its visibility.` : "";
        return text(`@${who.handle} can now use ${name}: their agent calls ${how}.${note}`);
      }),
    );

    server.registerTool(
      "revoke_access",
      {
        title: "Remove someone from your space",
        description: "Take a person's access to your space (or another agent you own, with agent_id) away. They can ask again with request_access.",
        inputSchema: z.object({ handle: z.string().describe("Their handle, with or without @"), agent_id: AGENT_ID }),
      },
      safe(async ({ handle, agent_id }, ctx) => {
        const { user, agent, name } = await accessTarget(ctx, agent_id);
        const who = await store.userByHandle(plainHandle(handle));
        const grants = who ? (await store.listAccessRequests({ ownerId: user.id })).filter((r) => r.agentId === agent.id && r.requesterId === who.id && r.status !== "denied") : [];
        if (!grants.length) throw new Error(`@${plainHandle(handle)} has no access to ${name}.`);
        for (const r of grants) await store.decideAccessRequest(r.id, "denied");
        return text(`@${who!.handle} no longer has access to ${name}.`);
      }),
    );

    server.registerTool(
      "list_access",
      {
        title: "Who can use your space",
        description: "People allowed into your space (or another agent you own, with agent_id), and requests waiting for you (approve with review_access_request or allow_access).",
        inputSchema: z.object({ agent_id: AGENT_ID }),
      },
      safe(async ({ agent_id }, ctx) => {
        const { user, agent } = await accessTarget(ctx, agent_id);
        const rs = (await store.listAccessRequests({ ownerId: user.id })).filter((r) => r.agentId === agent.id && r.status !== "denied");
        const line = async (r: (typeof rs)[number]) => `• @${(await store.getUser(r.requesterId))?.handle ?? "?"}${r.message ? `: "${r.message}"` : ""} (${r.id})`;
        const allowed = await Promise.all(rs.filter((r) => r.status === "approved").map(line));
        const waiting = await Promise.all(rs.filter((r) => r.status === "pending").map(line));
        return text(`Allowed (${allowed.length}):\n${allowed.join("\n") || "nobody yet"}\n\nWaiting for you (${waiting.length}):\n${waiting.join("\n") || "none"}`);
      }),
    );

    /* ───────────── payments ───────────── */

    server.registerTool(
      "enable_payments",
      {
        title: "Turn on payments (Stripe Connect)",
        description:
          "Let your space and agents charge the people whose agents call them, paid out to your own Stripe account. The first call creates your Stripe Express account; while Stripe still needs details it returns an onboarding link for you (the human) to open. Call again to check status; once ready it returns a link to your Stripe dashboard.",
        inputSchema: z.object({
          country: z.string().length(2).describe("Two-letter country where you get paid (your bank account), e.g. 'MX' or 'US'. Ask the owner; it can't be changed later."),
        }),
      },
      safe(async ({ country }, ctx) => {
        const user = await requireUser(ctx);
        if (!paymentsEnabled()) throw new Error("Payments aren't available on this deployment.");
        const r = await enablePayments(user, {
          country,
          returnUrl: `${base}/payments?status=connected`,
          refreshUrl: `${base}/payments?status=refresh`,
        });
        if (r.onboardingUrl)
          return text(
            `${r.created ? "Created your Stripe account" : "Your Stripe account isn't finished yet"} (${r.status.accountId}).\n\nOpen this link to finish setting up payouts (it works once and expires in a few minutes; call enable_payments again for a new one):\n${r.onboardingUrl}\n\nMeanwhile, set what you charge with set_price.`,
          );
        const prices = (await getSpace(r.user)) ? await store.listPrices(r.user.handle) : [];
        const dashboard = await stripeDashboardLink(r.user).catch(() => undefined);
        return text(
          `Payments are on (${r.status.accountId}${r.status.payoutsEnabled ? ", payouts enabled" : ", payouts pending"}).\n\nPrices on your space: ${prices.length ? prices.map(priceLine).join("; ") : "none yet: set_price"}${dashboard ? `\nStripe dashboard (one-time link): ${dashboard}` : ""}`,
        );
      }),
    );

    server.registerTool(
      "set_price",
      {
        title: "Set a price",
        description:
          "Add or change something your space (or one of your agents) charges for, e.g. a dental cleaning. Callers' agents see it and get a Stripe checkout link with request_payment. Needs enable_payments.",
        inputSchema: z.object({
          name: z.string().describe("Short id callers use, e.g. 'cleaning'"),
          title: z.string().describe("What it is, shown on the checkout page, e.g. 'Dental cleaning (45 min)'"),
          amount: z.number().positive().describe("In normal units, NOT cents: 800 means 800.00"),
          currency: z.string().length(3).describe("e.g. 'mxn', 'usd'"),
          description: z.string().optional().describe("Terms, e.g. 'Paid in advance to confirm the appointment; refundable up to 24h before'"),
          agent_id: z.string().optional().describe("Defaults to your space"),
        }),
      },
      safe(async ({ agent_id, ...p }, ctx) => {
        const user = await requireUser(ctx);
        const agent = agent_id ? await ownedAgent(agent_id, user.id) : (await ownSpace(ctx)).space;
        const price = await setPrice(agent, p);
        if (agent.pricing === "free") await store.updateAgent(agent.id, { pricing: "usage" });
        const ready = paymentsEnabled() && user.stripeAccountId ? (await payoutStatus(user)).ready : false;
        return text(
          `${agent.name} charges ${priceLine(price)}.${ready ? "" : "\n\nCallers can't pay yet: finish enable_payments."}\n\nTell your rules when to charge, e.g. update_agent instructions: "Once someone picks a time, call request_payment('${price.name}') and hold the slot until paid."`,
        );
      }),
    );

    server.registerTool(
      "remove_price",
      {
        title: "Remove a price",
        description: "Stop charging for something.",
        inputSchema: z.object({ name: z.string(), agent_id: z.string().optional().describe("Defaults to your space") }),
      },
      safe(async ({ name, agent_id }, ctx) => {
        const user = await requireUser(ctx);
        const agent = agent_id ? await ownedAgent(agent_id, user.id) : (await ownSpace(ctx)).space;
        if (!(await store.deletePrice(agent.id, slug(name)))) throw new Error(`${agent.name} has no price "${name}".`);
        return text(`Removed "${slug(name)}" from ${agent.name}.`);
      }),
    );

    server.registerTool(
      "request_payment",
      {
        title: "Get a payment link",
        description:
          "Get a Stripe checkout link for one of a space's or agent's prices (listed under 'Prices' in ask_space / use_agent), e.g. after picking an appointment time. Give the link to your human (or pay it), then confirm with check_payment.",
        inputSchema: z.object({
          agent_id: z.string().describe("The space handle (e.g. 'dr-lopez') or agent id"),
          price: z.string().describe("Price name, e.g. 'cleaning'"),
          note: z.string().default("").describe("What it's for, shown on the checkout page, e.g. 'Cleaning, Tue Oct 7 10:00, for Ana Ruiz'"),
        }),
      },
      safe(async ({ agent_id, price, note }, ctx) => {
        const user = await currentUser(ctx);
        const a = await store.getAgent(plainHandle(agent_id));
        if (!a || !(await store.hasAccess(a.id, user?.id))) throw new Error(`No access to "${agent_id}".`);
        const p = await requestPayment(a, price, {
          payer: user,
          note,
          successUrl: `${base}/payments?status=paid`,
          cancelUrl: `${base}/payments?status=cancelled`,
        });
        return text(
          `Pay ${money(p.amount, p.currency)} to ${a.name}${p.note ? ` for: ${p.note}` : ""}\n\n${p.url}\n\nPayment id: ${p.id}. After paying, check_payment("${p.id}") confirms it. The link expires in 24 hours.`,
        );
      }),
    );

    server.registerTool(
      "check_payment",
      {
        title: "Check a payment",
        description: "Whether a payment link was paid (open, paid or expired). For the payer and the owner.",
        inputSchema: z.object({ payment_id: z.string() }),
      },
      safe(async ({ payment_id }, ctx) => {
        const p = await checkPayment(payment_id.trim(), await currentUser(ctx));
        return text(paymentLine(p));
      }),
    );

    server.registerTool(
      "my_payments",
      {
        title: "My payments",
        description: "Payments to your space and agents (who asked, for what, paid or not), and payment links you asked for.",
        inputSchema: z.object({}),
      },
      safe(async (_i, ctx) => {
        const user = await requireUser(ctx);
        const mine = (await store.listAgents({ viewerId: user.id })).filter((a) => a.ownerId === user.id);
        const space = await getSpace(user);
        const agents = space && !mine.some((a) => a.id === space.id) ? [...mine, space] : mine;
        const received = (await Promise.all(agents.map((a) => store.listPayments({ agentId: a.id })))).flat();
        // Refresh the open ones so the owner sees what's actually paid.
        const fresh = await Promise.all(received.map((p) => (p.status === "open" ? checkPayment(p.id, user).catch(() => p) : p)));
        const payer = async (id?: string) => (id ? `@${(await store.getUser(id))?.handle ?? "?"}` : "anonymous");
        const inLines = await Promise.all(fresh.map(async (p) => `• ${p.agentId} ← ${await payer(p.payerId)}: ${paymentLine(p)}`));
        const paid = fresh.filter((p) => p.status === "paid");
        const totals = Object.entries(
          paid.reduce<Record<string, number>>((t, p) => ((t[p.currency] = (t[p.currency] ?? 0) + p.amount), t), {}),
        ).map(([c, n]) => money(n, c));
        const out = (await store.listPayments({ payerId: user.id })).map((p) => `• → ${p.agentId}: ${paymentLine(p)}`);
        return text(
          `Received${totals.length ? ` (paid: ${totals.join(", ")})` : ""}:\n${inLines.join("\n") || "nothing yet"}\n\nYou asked to pay:\n${out.join("\n") || "nothing"}`,
        );
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
        description:
          "Find a person's space by handle ('@emma'), or agents by job-to-be-done and/or the tools they operate. A handle finds the space even when it's not in the directory, and says whether you can use it (then ask_space) or need to request_access.",
        inputSchema: z.object({
          query: z.string().describe("A handle like '@emma', or what you need done"),
          tools: z.array(z.string()).default([]),
          limit: z.number().int().min(1).max(25).default(5),
        }),
      },
      safe(async ({ query, tools, limit }, ctx) => {
        const user = await currentUser(ctx);
        // A handle: look the space up directly, private ones included (unlisted, but reachable by handle).
        const h = plainHandle(query);
        const space = HANDLE_QUERY.test(query.trim()) ? await reachable(h, user?.id) : undefined;
        const found = space?.kind === "hosted" && space.category === SPACE_CATEGORY ? space : undefined;
        const head = found ? await spaceLine(found, user) : query.trim().startsWith("@") ? `No space "@${h}" on Agents Space.` : "";
        if (query.trim().startsWith("@")) return text(head);
        const results = matchAgents(await store.listAgents({ viewerId: user?.id }), query, tools, limit).filter((r) => r.agent.id !== found?.id);
        const rows = await withAccess(results.map((r) => r.agent), user?.id);
        const list = rows.map((r) => fmt(r.agent, r.access)).join("\n\n");
        return text([head, list].filter(Boolean).join("\n\n") || "No matching agents.");
      }),
    );

    server.registerTool(
      "list_agents",
      {
        title: "List agents",
        description:
          "List every agent in the directory, optionally filtered by category. Pass `owner` (a handle like 'emma' or '@emma') to see which agents that person has: only the ones you're allowed to see, each marked open (use it now) or request access.",
        inputSchema: z.object({
          category: z.string().optional(),
          owner: z.string().optional().describe("A person's handle, with or without '@', case-insensitive"),
        }),
      },
      safe(async ({ category, owner }, ctx) => {
        const user = await currentUser(ctx);
        if (owner !== undefined) {
          const h = plainHandle(owner);
          const who = h ? await store.userByHandle(h) : undefined;
          const rows = who ? await store.agentsOf(who.id, { viewerId: user?.id, category }) : [];
          // An unknown handle and one with nothing visible to you answer the same, so hidden agents leave no trace.
          if (!rows.length) return text(`No agents from @${h}${category ? ` in ${category}` : ""} that you can see.`);
          const hints = [
            rows.some((r) => r.access) && 'open: use_agent("<id>")',
            rows.some((r) => !r.access) && 'request access: request_access("<id>")',
          ].filter(Boolean);
          return text(`Agents by @${h}:\n\n${rows.map((r) => fmt(r.agent, r.access, { open: true })).join("\n\n")}\n\n${hints.join(" · ")}`);
        }
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
        const a = await reachable(id, user?.id);
        if (!a) return text(`No agent with id "${id}".`);
        if (!(await store.canSeeInfo(id, user?.id))) return text(`${a.name}\nYou don't have access to this agent. Call request_access("${a.id}") and the owner will review it.`);
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
              : `Using it needs the owner's approval — call request_access("${a.id}") and they will review it.`,
          ].join("\n"),
        );
      }),
    );

    server.registerTool(
      "list_users",
      {
        title: "List people",
        description:
          "Find people and businesses on Agents Space by handle: who they are, when they joined, and whether their space is open to you or needs a request. Anyone can call it. Then reach one with ask_space.",
        inputSchema: z.object({
          query: z.string().optional().describe("Part of a handle, case-insensitive"),
          limit: z.number().int().min(1).max(100).default(25),
          cursor: z.string().optional().describe("The cursor from the previous page"),
        }),
      },
      safe(async ({ query, limit, cursor }, ctx) => {
        const viewer = await currentUser(ctx);
        const q = query ? plainHandle(query) : undefined;
        const found = await store.listUsers({ query: q || undefined, limit: limit + 1, cursor });
        const page = found.slice(0, limit);
        const statuses = await store.spaceStatuses(page, viewer?.id);
        const lines = page.map((u) => {
          const s = statuses.get(u.handle);
          return `• @${u.handle} — joined ${u.createdAt.slice(0, 10)}${s ? ` · ${s}` : ""}`;
        });
        if (!lines.length) return text("No matching people.");
        const hints = [
          [...statuses.values()].includes("open") && 'open: ask_space("<handle>")',
          [...statuses.values()].includes("request access") && 'request access: request_access("<handle>")',
          'their agents: list_agents(owner: "<handle>")',
        ].filter(Boolean);
        return text(
          [lines.join("\n"), hints.length ? `\n${hints.join(" · ")}` : "", found.length > limit ? `\nMore: call list_users again with cursor "${page[page.length - 1].handle}".` : ""].join(""),
        );
      }),
    );

    /* ───────────── access ───────────── */

    server.registerTool(
      "request_access",
      {
        title: "Request access to an agent",
        description: "Ask the owner of a listed or restricted agent for access. They approve or deny with review_access_request.",
        inputSchema: z.object({ agent_id: z.string(), message: z.string().default("").describe("Who you are and what you'll use it for") }),
      },
      safe(async ({ agent_id, message }, ctx) => {
        const user = await requireUser(ctx);
        const a = await reachable(agent_id, user.id);
        if (!a || a.status !== "published" || a.mode === "scheduled") throw new Error(`No published agent "${agent_id}".`);
        if (await store.hasAccess(a.id, user.id)) return text(`You already have access to ${a.name}.`);
        const r = await store.requestAccess(a.id, user.id, message);
        return text(`Access request ${r.id} for ${a.name} is ${r.status}. Check with my_access_requests.`);
      }),
    );

    server.registerTool(
      "my_access_requests",
      { title: "My access requests", description: "Requests you've made to use agents, and their status.", inputSchema: z.object({}) },
      safe(async (_i, ctx) => {
        const user = await requireUser(ctx);
        const rs = await store.listAccessRequests({ requesterId: user.id });
        return text(rs.map((r) => `• ${r.agentId} — ${r.status} (${r.id})`).join("\n") || "No requests.");
      }),
    );

    server.registerTool(
      "list_access_requests",
      { title: "Incoming access requests", description: "People asking to use your agents.", inputSchema: z.object({ status: z.enum(["pending", "approved", "denied"]).optional() }) },
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
          "Step 1 of building an agent from natural language. Creates a DRAFT hosted agent from plain-language instructions. First ask which kind: a skill other people's agents use (mode skill, default), or an agent that runs for the owner on a schedule (mode scheduled, then schedule_agent). It comes with a built-in 'outputs' table. Next: add_context_note (menus, policies, FAQs), create_table for data it keeps (e.g. reservations), create_connector + attach_connector (external systems it acts in), test_agent, publish_agent.",
        inputSchema: createAgentInput,
      },
      safe(async (input, ctx) => {
        const user = await requireUser(ctx);
        let a = await store.addAgent({ ...input, kind: "hosted", status: "draft", protocol: "mcp", owner: `@${user.handle}`, ownerId: user.id });
        a = await store.updateAgent(a.id, { endpoint: agentEndpoint(base, a.id) });
        if (a.mode === "scheduled")
          return text(
            `Scheduled agent ${a.id} created: it works for you, nobody else can call it.\n\n${fmt(a)}\n\nNext: add_context_note, create_table for data it keeps, create_connector → attach_connector for systems it acts in, then schedule_agent (task + cron + timezone) and run_schedule_now to try it. No need to publish.`,
          );
        return text(
          `Draft agent ${a.id} created, with a built-in "${OUTPUTS_TABLE}" table for what it produces.\n\n${fmt(a)}\n\nNext: add_context_note, create_table for the data this agent keeps (no connector needed), create_connector → attach_connector for outside systems, test_agent, publish_agent.`,
        );
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

    if (composioEnabled()) {
      server.registerTool(
        "list_apps",
        {
          title: "Browse apps (Composio)",
          description:
            "Search 1000+ apps your agents can use through Composio: Gmail, Google Calendar, Slack, GitHub, Notion, HubSpot, ... Returns app slugs for connect_app. No API key needed; you sign in to the app itself.",
          inputSchema: z.object({ search: z.string().optional().describe("e.g. 'email', 'calendar', 'crm'"), limit: z.number().int().min(1).max(50).default(15) }),
        },
        safe(async ({ search, limit }) => {
          const apps = await listApps({ search, limit });
          return text(
            apps.map((x) => `${x.slug} — ${x.name}: ${x.description.slice(0, 120)}${x.toolsCount ? ` (${x.toolsCount} tools)` : ""}${x.noAuth ? " [no sign-in]" : ""}`).join("\n") ||
              "No apps found.",
          );
        }),
      );

      server.registerTool(
        "app_tools",
        {
          title: "List an app's tools",
          description: "The tools of a Composio app (its main ones, or those matching query), to pick from in connect_app.",
          inputSchema: z.object({ app: z.string().describe("App slug from list_apps, e.g. gmail"), query: z.string().optional() }),
        },
        safe(async ({ app, query }) => {
          const tools = await appTools(app.toLowerCase(), { query, limit: 50 });
          return text(tools.map((t) => `${t.slug} — ${t.description.slice(0, 160)}`).join("\n") || "No tools found.");
        }),
      );

      server.registerTool(
        "connect_app",
        {
          title: "Connect an app (Composio)",
          description: [
            "Connect one of your accounts (Gmail, Slack, GitHub, ...) so your agents can act in it. Creates connector <handle>-composio-<app> with the app's main tools (or the tools you name) and returns a link where you sign in to the app (OAuth, or your key for key-based apps). Open the link, then attach_connector to give an agent scoped access.",
            "Your agents act on YOUR connected account; callers only get the actions you attach. Run it again to change the tools (reconnect: true for a fresh sign-in).",
          ].join("\n"),
          inputSchema: z.object({
            app: z.string().describe("App slug from list_apps, e.g. gmail"),
            tools: z.array(z.string()).optional().describe("Tool slugs from app_tools, e.g. GMAIL_SEND_EMAIL. Default: the app's main tools"),
            reconnect: z.boolean().default(false),
          }),
        },
        safe(async ({ app, tools, reconnect }, ctx) => {
          const user = await requireUser(ctx);
          const r = await connectApp(user, app, { tools, reconnect, callbackUrl: `${WEB_URL}/account?connected=${encodeURIComponent(app.toLowerCase())}` });
          const head = `Connector ${r.connector.name} saved with ${r.connector.actions.length} action(s): ${r.connector.actions.map((a) => a.name).join(", ")}`;
          const next = `attach_connector(agent_id, "${r.connector.name}", [actions]) to give an agent access.`;
          if (r.status === "link") return text(`${head}\n\nSign in to ${r.app.name} here (the user must open it):\n${r.redirectUrl}\n\nThen ${next}`);
          return text(`${head}\n${r.status === "connected" ? `${r.app.name} is already connected.` : `${r.app.name} needs no sign-in.`}\n${next}`);
        }),
      );

      server.registerTool(
        "my_apps",
        { title: "My connected apps", description: "Your Composio app connections and their status (ACTIVE = ready).", inputSchema: z.object({}) },
        safe(async (_args, ctx) => {
          const user = await requireUser(ctx);
          const cs = await myConnections(user);
          return text(cs.map((c) => `${c.toolkit}: ${c.status} → connector ${appConnectorName(user, c.toolkit)}`).join("\n") || "No apps connected. Use list_apps and connect_app.");
        }),
      );

      server.registerTool(
        "disconnect_app",
        { title: "Disconnect an app", description: "Remove your connected account(s) for an app. Agents using its connector stop working until you reconnect.", inputSchema: z.object({ app: z.string() }) },
        safe(async ({ app }, ctx) => {
          const user = await requireUser(ctx);
          const n = await disconnectApp(user, app);
          return text(n ? `Disconnected ${n} ${app} account(s).` : `No ${app} account connected.`);
        }),
      );
    }

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
        description: "List a draft agent in the directory. Visibility decides who finds and uses it (public, listed, restricted, private). Returns its MCP endpoint to share (e.g. link it from your Google Business profile).",
        inputSchema: z.object({ agent_id: z.string(), visibility: VisibilitySchema.optional().describe(VISIBILITY_HELP) }),
      },
      safe(async ({ agent_id, visibility }, ctx) => {
        const user = await requireUser(ctx);
        const a = await ownedAgent(agent_id, user.id);
        if (a.mode === "scheduled") throw new Error(`${a.name} is a scheduled agent: it runs for you and isn't published. Use schedule_agent, or update_agent mode "skill" to share it instead.`);
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

    /* ───────────── tables ───────────── */

    const column = z.object({
      name: z.string().regex(/^[a-z][a-z0-9_]{0,39}$/).describe("snake_case"),
      type: z.enum(["text", "number", "boolean", "date", "datetime", "json"]).default("text").describe("date = YYYY-MM-DD, datetime = ISO 8601"),
      description: z.string().default("").describe("What goes here; callers' LLMs read this"),
      required: z.boolean().default(false),
    });
    const callerAccess = z
      .enum(["none", "insert", "own", "read", "write"])
      .describe(
        "What callers (not you) may do: none = owner only; insert = add rows only; own = add rows and see/change/delete their own (bookings, requests); read = read every row (availability, catalogue); write = read and change every row",
      );

    server.registerTool(
      "create_table",
      {
        title: "Create a data table",
        description: [
          "Give an agent its own table on Agents Space: no database or connector needed. Design tables from the agent's purpose, e.g. a restaurant reservations agent:",
          "reservations: name* text, phone text, party_size* number, date* date, time* text, notes text, status text (requested|confirmed|cancelled); caller_access own; context: 'One row per booking request. Check availability first with query_rows on date. New rows are status requested.'",
          "Every agent also has a built-in 'outputs' table (kind, summary, data) for what it produced; create_table 'outputs' to customise it.",
          "Same name again replaces the definition; existing rows are kept. The table's context goes into the agent's skill, so explain when and how to use it.",
        ].join("\n"),
        inputSchema: z.object({
          agent_id: z.string(),
          name: z.string().regex(/^[a-z][a-z0-9_]{0,39}$/).describe("snake_case, e.g. 'reservations'"),
          title: z.string().optional(),
          context: z.string().optional().describe("Markdown: what the table is for, when to add/read rows, what values mean"),
          columns: z.array(column).max(40).describe("Leave empty for a free-form table (any JSON object per row)"),
          caller_access: callerAccess.optional().describe("Default own. " + (callerAccess.description ?? "")),
        }),
      },
      safe(async ({ agent_id, caller_access, ...spec }, ctx) => {
        const user = await requireUser(ctx);
        const a = await ownedAgent(agent_id, user.id);
        const t = await defineTable(a, { ...spec, callerAccess: caller_access });
        return text(`Table saved on ${a.name}.\n\n${describeTable(t, { rows: await store.countRows(a.id, t.name) })}\n\nAdd rows with insert_rows; set its guidance with set_table_context.`);
      }),
    );

    server.registerTool(
      "set_table_context",
      {
        title: "Set a table's context",
        description: "Explain what a table is for and how the agent should use it (when to add rows, what statuses mean, what to check first). Included in the agent's skill. Replaces the previous context.",
        inputSchema: z.object({ agent_id: z.string(), table: z.string(), context: z.string().describe("Markdown") }),
      },
      safe(async ({ agent_id, table, context }, ctx) => {
        const user = await requireUser(ctx);
        const a = await ownedAgent(agent_id, user.id);
        const t = await setTableContext(a, table, context);
        return text(`Context saved.\n\n${describeTable(t)}`);
      }),
    );

    server.registerTool(
      "drop_table",
      {
        title: "Delete a data table",
        description: "Delete one of your agent's tables and ALL its rows. Dropping 'outputs' empties it and restores the default definition.",
        inputSchema: z.object({ agent_id: z.string(), table: z.string(), confirm: z.literal(true).describe("Must be true: rows can't be recovered") }),
      },
      safe(async ({ agent_id, table }, ctx) => {
        const user = await requireUser(ctx);
        const a = await ownedAgent(agent_id, user.id);
        await dropTable(a, table);
        return text(`Dropped ${table} from ${a.name}.`);
      }),
    );

    registerRowTools(server);

    /* ───────────── schedules ───────────── */

    registerScheduleTools(server);

    /* ───────────── models ───────────── */

    registerModelTools(server);

    /* ───────────── use ───────────── */

    server.registerTool(
      "use_agent",
      {
        title: "Use an agent",
        description: "Load an agent's skill: its instructions, context, data tables and the actions you may run. Follow the instructions; act with run_agent_action and the table tools (insert_rows, query_rows, update_row, delete_row).",
        inputSchema: z.object({ agent_id: z.string() }),
      },
      safe(async ({ agent_id }, ctx) => {
        const user = await currentUser(ctx);
        const a = await reachable(agent_id, user?.id);
        if (!a) throw new Error(`No agent "${agent_id}".`);
        if (!(await store.hasAccess(a.id, user?.id))) throw new Error(`${a.name} needs the owner's approval. Call request_access("${a.id}").`);
        if (a.kind === "external") return text(`${a.name} is an external agent. Connect to it directly: ${a.endpoint ?? "(no endpoint listed)"} via ${a.protocol}.`);
        const actions = await scopedActions(a);
        return text(
          `${await loadSkill(a)}\n\n## Actions (call run_agent_action)\n${actions.map((x) => `- ${actionSignature(x)}: ${x.description}`).join("\n") || "none"}\n\nOn this server, pass agent_id "${a.id}" to run_agent_action and the table tools.`,
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
        const a = await reachable(agent_id, user?.id);
        if (!a) throw new Error(`No access to "${agent_id}".`);
        if (!(await store.hasAccess(a.id, user?.id))) throw new Error(`No access to "${agent_id}". Call request_access("${a.id}").`);
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
              text: `Help me build an Agents Space agent that handles: ${job}.\n\nInterview me briefly (max 4 questions in one message): is it a skill other people's agents use, or should it run for me on a schedule (when, in which timezone), who uses it, the rules it must follow, the systems it must act in (their API docs or MCP URL, and how they authenticate), visibility (public, listed, restricted or private). Then: create_account if I have no key → create_agent with clear instructions → add_context_note for policies/FAQs → create_table for each kind of record the agent keeps (pick columns, caller_access and a context that says when to read/write it; e.g. reservations for a restaurant) → for outside systems it must act in: connect_app if list_apps has the app (Gmail, Slack, GitHub, Notion, ...; give me the sign-in link, pick tools with app_tools), else create_connector (http action templates or mcp_url; secrets as {{secret.NAME}} placeholders, never inline) → set_connector_secret when I give a key → attach_connector with the minimum actions → test_agent → publish_agent. Show me the endpoint at the end. For a scheduled agent: create_agent with mode scheduled, skip publishing, then schedule_agent and run_schedule_now to show me a first report.`,
            },
          },
        ],
      }),
    );
  },
  {
    serverInfo: { name: "agents-space", version: "0.2.0" },
    instructions:
      "Agents Space gives people and businesses a space: their own MCP address that other people's agents call instead of waiting on them. To reach someone (\"ask emma if Saturday works\", \"check @marcos-trattoria for a table\"), call ask_space with their handle. If the user just connected, call my_space first (claim_space if they have none) and help them set it up; allow_access / revoke_access / list_access manage who can use it; enable_payments + set_price let it charge callers. When a space lists Prices, request_payment returns a Stripe checkout link for your user and check_payment confirms it. Agents Space is also a directory of agents as shareable skills. Find people with list_users; list_agents(owner: \"<handle>\") shows the agents a person has that you may see. Find agents (describe_bottleneck, search_agents), use them (use_agent, run_agent_action), request access to ones that need approval (request_access), or build your own in natural language (prompt build_agent, or create_agent → add_context_note → create_table → create_connector or connect_app → attach_connector → test_agent → publish_agent). Agents keep their own data in tables (create_table; built-in 'outputs'); no connector is needed to store data. An agent is either a skill other people's agents call (mode skill) or works for its owner on a schedule (mode scheduled → schedule_agent, run_schedule_now, schedule_runs); add_model / set_agent_model pick the LLM it runs on.",
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
