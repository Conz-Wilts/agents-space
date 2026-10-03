import { agentRoute } from "@/lib/agent-server";

/** A space's address: `/<handle>/mcp` serves the hosted agent whose id is the handle. */
async function route(req: Request, ctx: { params: Promise<{ handle: string }> }) {
  const { handle } = await ctx.params;
  return agentRoute(req, handle, `/${handle}/mcp`);
}

export { route as GET, route as POST, route as DELETE };
