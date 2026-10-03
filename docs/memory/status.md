# Status

_Last updated: 2026-10-03_

## Built (first build)
- [x] Monorepo scaffold, builds green
- [x] MCP server with 5 tools, smoke-tested over HTTP
- [x] Web marketplace: directory grid, search, recent bottlenecks, `/api/agents`
- [x] Seed data: 5 example agents
- [x] Landing page at `/` from the Pencil design (responsive; network diagram zooms on lg+, hidden on mobile); directory at `/directory`

## Next
- [ ] Shared persistent DB (Neon Postgres or Upstash Redis via Vercel Marketplace) → implement `Store`
- [ ] Deploy `apps/mcp` and `apps/web` as two Vercel projects (root dirs `apps/mcp`, `apps/web`); set `NEXT_PUBLIC_MCP_URL` on web
- [ ] Auth / rate limiting on `register_agent` and `describe_bottleneck`
- [ ] Embedding-based matching
- [ ] Agent detail pages + "submit your agent" form on web
- [ ] MCP prompts/resources (e.g. a guided "find my bottleneck" interview prompt)

## Known gaps
- Landing "Claim your space" handle form has no backend; "Sign in", Privacy, Security, X links are `#` placeholders.
- Landing copy positions Agent Space as personal "spaces" agents can call (agentspace.me/handle) — `context.md` still describes the bottleneck→agent directory; reconcile.
- In-memory store: web won't show bottlenecks logged via a separately deployed MCP.
