import { createMcpHandler } from "mcp-handler";
import { z } from "zod";
import { store, LOG_RETENTION_DAYS, MAX_LOGS, actionInputSchema, checkPayment, loadSkill, money, payablePrices, paymentLine, priceLine, requestPayment, runAgentAction, scopedActions } from "@agents-space/core";
import { currentUser, metadataPathFor, oauthEnabled, requireUser, withAuth } from "@/lib/auth";
import { reachable } from "@/lib/access";
import { origin, safe, text } from "@/lib/format";
import { logged, logsText } from "@/lib/logged";
import { registerRowTools } from "@/lib/table-tools";

/**
 * One hosted agent as its own MCP server — the link an owner shares (website, Google Business
 * profile, another agent's config). Tools = the agent's scoped connector actions and its data
 * tables; the skill is sent as server instructions and via the `instructions` tool. No access →
 * only request_access.
 */
async function serve(req: Request, id: string) {
  const userId = req.auth?.clientId;
  // Unknown, draft and private (not yours) all answer the same.
  const agent = await reachable(id, userId);
  if (!agent || agent.kind !== "hosted") return Response.json({ error: `No hosted agent "${id}"` }, { status: 404 });

  const access = await store.hasAccess(agent.id, userId);
  // Without use access, the tagline only goes to those who may see the agent's info (public/listed).
  const info = access || (await store.canSeeInfo(agent.id, userId));
  const [skill, actions, prices] = access ? await Promise.all([loadSkill(agent), scopedActions(agent), payablePrices(agent)]) : ["", [], []];
  const base = origin(req);

  const handler = createMcpHandler(
    (server) => {
      if (!access) {
        server.registerTool(
          "request_access",
          {
            title: `Request access to ${agent.name}`,
            description: `${agent.name} needs the owner's approval. Ask the owner for access (needs an Agents Space API key).`,
            inputSchema: z.object({ message: z.string().default("") }),
          },
          safe(async ({ message }, c) => {
            const user = await requireUser(c);
            const r = await store.requestAccess(agent.id, user.id, message);
            return text(`Request ${r.id} is ${r.status}. Reconnect once the owner approves.`);
          }),
        );
        return;
      }

      server.registerTool(
        "instructions",
        { title: "How this agent works", description: `Read first: ${agent.name}'s instructions and context.`, inputSchema: z.object({}) },
        logged("instructions", () => agent.id, async () => text(skill)),
      );

      registerRowTools(server, agent.id);

      server.registerTool(
        "agent_logs",
        {
          title: "Call log",
          description: `Recent calls to ${agent.name}, newest first: your own calls (the owner sees everyone's, last ${LOG_RETENTION_DAYS} days).`,
          inputSchema: z.object({ limit: z.number().int().min(1).max(MAX_LOGS).default(25) }),
        },
        safe(async ({ limit }, c) => text(await logsText(agent, c.http?.authInfo?.clientId, { limit }))),
      );

      for (const a of actions)
        server.registerTool(
          `${a.connector}__${a.action}`.slice(0, 64),
          {
            title: a.action.replace(/_/g, " "),
            description: a.description,
            inputSchema: actionInputSchema(a.params),
          },
          logged(`${a.connector}__${a.action}`, () => agent.id, async (args: Record<string, unknown>, c) => {
            // Re-check: access may have been revoked since this server was built.
            if (!(await store.hasAccess(agent.id, (await currentUser(c))?.id))) throw new Error("Access revoked.");
            return text(JSON.stringify(await runAgentAction(agent, a.connector, a.action, args), null, 2).slice(0, 20000));
          }),
        );

      if (prices.length) {
        server.registerTool(
          "request_payment",
          {
            title: "Get a payment link",
            description: `Get a Stripe checkout link to pay ${agent.name}. Prices: ${prices.map(priceLine).join("; ")}. Give the link to your human (or pay it), then confirm with check_payment.`,
            inputSchema: z.object({
              price: z.enum(prices.map((p) => p.name) as [string, ...string[]]),
              note: z.string().default("").describe("What it's for, shown on the checkout page, e.g. 'Cleaning, Tue Oct 7 10:00, for Ana Ruiz'"),
            }),
          },
          logged("request_payment", () => agent.id, async ({ price, note }: { price: string; note: string }, c) => {
            const user = await currentUser(c);
            if (!(await store.hasAccess(agent.id, user?.id))) throw new Error("Access revoked.");
            const p = await requestPayment(agent, price, { payer: user, note, successUrl: `${base}/payments?status=paid`, cancelUrl: `${base}/payments?status=cancelled` });
            return text(`Pay ${money(p.amount, p.currency)} to ${agent.name}${p.note ? ` for: ${p.note}` : ""}\n\n${p.url}\n\nPayment id: ${p.id}. check_payment confirms it once paid. The link expires in 24 hours.`);
          }),
        );
        server.registerTool(
          "check_payment",
          { title: "Check a payment", description: "Whether a payment link was paid (open, paid or expired).", inputSchema: z.object({ payment_id: z.string() }) },
          logged("check_payment", () => agent.id, async ({ payment_id }: { payment_id: string }, c) => text(paymentLine(await checkPayment(payment_id.trim(), await currentUser(c))))),
        );
      }
    },
    {
      serverInfo: { name: `agents-space/${agent.id}`, version: "1.0.0" },
      instructions: access
        ? skill.slice(0, 8000)
        : info
          ? `${agent.name}: ${agent.tagline} (access required)`
          : `${agent.name} (access required)`,
    },
  );
  return handler(req);
}

/**
 * With OAuth enabled, only published public agents work anonymously; every other id (unknown,
 * draft, private, listed, restricted) gets the same sign-in challenge, so strangers learn nothing
 * and owners can start OAuth on their own private agents. Without OAuth nothing is challenged
 * and `serve` answers 404 for ids the caller can't reach.
 * `mcpPath` is the path the client connected to (`/a/<id>/mcp`, or `/<handle>/mcp` for a space).
 */
export async function agentRoute(req: Request, id: string, mcpPath: string) {
  const agent = await store.getAgent(id);
  const open = !!agent && agent.status === "published" && agent.visibility === "public";
  return withAuth((r) => serve(r, id), { required: oauthEnabled() && !open, metadataPath: metadataPathFor(mcpPath) })(req);
}
