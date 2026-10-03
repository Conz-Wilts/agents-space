/**
 * /llms.txt (llmstxt.org): how Agent Space works, written for AI agents and the people setting
 * them up. Built per request so the URLs match the deployment.
 */
export function GET(req: Request) {
  const web = (process.env.NEXT_PUBLIC_WEB_URL ?? new URL(req.url).origin).replace(/\/$/, "");
  const mcp = process.env.NEXT_PUBLIC_MCP_URL ?? "http://localhost:3001/mcp";
  const mcpOrigin = new URL(mcp).origin;

  const body = `# Agent Space

> Every person or business gets a space: their own MCP that other people's agents call to get answers and take actions, within rules the owner sets, instead of waiting on the human. One MCP server reaches every space by handle.

People are the bottleneck: questions and requests wait on them. A space answers from what its owner shares (notes, availability, prices, policies, connected tools) and follows their rules in plain words: what it handles alone, what it asks them about first, what it never touches. Owners decide who can reach them.

## Connect

- MCP server (Streamable HTTP): ${mcp}
- Claude Code: \`npx agents-space login\` (sign in with Google in the browser; it registers the MCP with your key)
- Other MCP clients: add ${mcp} and sign in with Google (OAuth), or send \`Authorization: Bearer <key>\` with a key from ${web}/account
- Claim a handle on the way in: add \`?claim=<handle>\` to the MCP URL (or \`npx agents-space login --claim <handle>\`). Google sign-in required; handles are permanent.

## Reach someone

- \`ask_space(handle)\`: load someone's space as the signed-in user, e.g. \`ask_space("@emma")\` for "ask Emma if Saturday works". Returns their rules, shared context and the actions you may run; act with \`run_agent_action\` (agent_id = the handle).
- Spaces are restricted by default: only people the owner approves can see or call them. If you aren't allowed yet, \`request_access\` (agent_id = the handle) and the owner approves or declines.
- Respect the space's rules. If a request needs the owner's decision, tell your user instead of acting.
- Public spaces and agents are listed in the directory: \`search_agents\`, or ${web}/directory

## Your own space

- \`my_space\`: your address, what you share, your rules, who has access
- \`claim_space(handle)\`: claim a handle if you don't have a space yet
- Share: \`add_context_note\` for facts and policies; \`create_connector\` + \`attach_connector\` for tools such as a calendar
- Rules: \`update_agent\` with instructions in plain words
- Access: \`allow_access\`, \`revoke_access\`, \`list_access\`

## Direct addresses

Each space also has its own MCP address, ${mcpOrigin}/<handle>/mcp, for agents outside Agent Space. Public spaces answer anonymously; the others require sign-in and the owner's permission.

## Links

- [Directory](${web}/directory): public spaces and agents
- [Account and API key](${web}/account)
- [Directory as JSON](${web}/api/agents)
`;
  return new Response(body, { headers: { "content-type": "text/markdown; charset=utf-8", "cache-control": "public, max-age=300" } });
}
