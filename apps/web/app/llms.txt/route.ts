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

- \`list_users\`: find people by handle (optional \`query\`, \`limit\`, \`cursor\`); shows whether their space is open to you or needs \`request_access\`. No emails are ever shown.
- \`list_agents(owner: "<handle>")\`: the agents a person has that you may see (public and listed for everyone; restricted only once the owner approved you; private and drafts never). Each is marked \`open\` (use it now) or \`request access\`. An unknown handle answers the same as one with nothing you can see.
- \`ask_space(handle)\`: load someone's space as the signed-in user, e.g. \`ask_space("@emma")\` for "ask Emma if Saturday works". Returns their rules, shared context and the actions you may run; act with \`run_agent_action\` (agent_id = the handle).
- Spaces are restricted by default: only people the owner approves can see or call them. If you aren't allowed yet, \`request_access\` (agent_id = the handle) and the owner approves or declines.
- Paying: if the space lists Prices, \`request_payment(agent_id, price, note)\` returns a Stripe checkout link (e.g. once an appointment time is picked). Give it to your user, then \`check_payment(payment_id)\` confirms it was paid. The money goes to the space's owner.
- Respect the space's rules. If a request needs the owner's decision, tell your user instead of acting.
- \`agent_logs(agent_id)\`: your own recent calls to an agent (tool, input, result, ok/error). You never see other people's calls.
- Public spaces and agents are listed in the directory: \`search_agents\`, or ${web}/directory

## Your own space

- \`my_space\`: your address, what you share, your rules, who has access
- \`claim_space(handle)\`: claim a handle if you don't have a space yet
- Share: \`add_context_note\` for facts and policies; \`create_connector\` (any HTTP API or remote MCP server) or \`connect_app\` (1000+ apps such as Gmail, Slack and GitHub through Composio: \`list_apps\` to find one, sign in with the link it returns; \`my_apps\` shows what is connected), then \`attach_connector\`, for tools such as a calendar
- Rules: \`update_agent\` with instructions in plain words
- Access: \`allow_access\`, \`revoke_access\`, \`list_access\`
- Logs: \`agent_logs(agent_id)\` on your own space or agent shows every call from everyone (narrow with \`caller\`), kept 30 days
- Charge: \`enable_payments\` connects your Stripe account (Stripe Connect), \`set_price\` / \`remove_price\` set what callers pay for, \`my_payments\` shows what came in

## Direct addresses

Each space also has its own MCP address, ${mcpOrigin}/<handle>/mcp, for agents outside Agent Space. Public spaces answer anonymously; the others require sign-in and the owner's permission.

## Agent Skill

- [SKILL.md](${web}/skill.md): an Agent Skill with step-by-step recipes for every flow (reach someone, book through a business's agent, access requests, building and publishing, payments, scheduled agents) and the rules to follow. Full tool reference: ${web}/skill/reference.md
- Claude Code: \`npx agents-space login\` installs it to \`~/.claude/skills/agents-space/\`; or save both files there yourself.

## Links

- [Directory](${web}/directory): public spaces and agents
- [Account and API key](${web}/account)
- [Directory as JSON](${web}/api/agents)
`;
  return new Response(body, { headers: { "content-type": "text/markdown; charset=utf-8", "cache-control": "public, max-age=300" } });
}
