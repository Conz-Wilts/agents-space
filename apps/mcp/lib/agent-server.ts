import { createMcpHandler } from "mcp-handler";
import { z } from "zod";
import { store, actionInputSchema, loadSkill, runAgentAction, scopedActions } from "@agents-space/core";
import { currentUser, metadataPathFor, oauthEnabled, requireUser, withAuth } from "@/lib/auth";
import { reachable } from "@/lib/access";
import { safe, text } from "@/lib/format";
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
  const [skill, actions] = access ? await Promise.all([loadSkill(agent), scopedActions(agent)]) : ["", []];

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
        async () => text(skill),
      );

      registerRowTools(server, agent.id);

      for (const a of actions)
        server.registerTool(
          `${a.connector}__${a.action}`.slice(0, 64),
          {
            title: a.action.replace(/_/g, " "),
            description: a.description,
            inputSchema: actionInputSchema(a.params),
          },
          safe(async (args: Record<string, unknown>, c) => {
            // Re-check: access may have been revoked since this server was built.
            if (!(await store.hasAccess(agent.id, (await currentUser(c))?.id))) throw new Error("Access revoked.");
            return text(JSON.stringify(await runAgentAction(agent, a.connector, a.action, args), null, 2).slice(0, 20000));
          }),
        );
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
