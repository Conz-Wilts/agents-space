import { agentRoute } from "@/lib/agent-server";

async function route(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  return agentRoute(req, id, `/a/${id}/mcp`);
}

export { route as GET, route as POST, route as DELETE };
