# Status

_Last updated: 2026-10-03_

## Built
- [x] Monorepo scaffold, builds green
- [x] Web marketplace: directory grid, search, recent bottlenecks, `/api/agents` (public projection only)
- [x] Seed data: 5 example external agents
- [x] Accounts + API keys; anonymous read
- [x] Natural-language agent builder over MCP: create → context notes → connectors (REST or wrapped MCP) → secrets → scoped attach → test → publish
- [x] Public / private agents, access requests + owner review
- [x] Use agents: `use_agent` + `run_agent_action` on `/mcp`, and per-agent MCP server at `/a/<id>/mcp`
- [x] Own connector + context system (no third-party runtime): declarative HTTP / remote-MCP actions, `{{args.x}}` / `{{secret.X}}` templates, host allowlist + private-network block, no redirects, AES-256-GCM secrets, secret redaction
- [x] Supabase Postgres via Prisma 7 (`packages/core/prisma/schema.prisma`), in-memory fallback without `DATABASE_URL`
- [x] Per-agent MCP tools get typed input schemas from declared action params
- [x] E2E tested against a local Postgres (prisma dev): accounts, private agent, notes, HTTP + MCP connectors, secrets, scope, access approval, per-agent endpoint
- [x] Landing page at `/` from the Pencil design (responsive; network diagram zooms on lg+, hidden on mobile); directory at `/directory`

## Next
- [ ] Create the Supabase project, set `DATABASE_URL` / `DIRECT_URL` / `CONNECTOR_SECRETS_KEY` (local + Vercel), `pnpm db:push && pnpm db:seed` — switch to `db:migrate` migrations before real users
- [ ] Deploy `apps/mcp` and `apps/web` as two Vercel projects; set `PUBLIC_MCP_ORIGIN`, `NEXT_PUBLIC_MCP_URL`
- [ ] Web: agent detail pages, visibility badges, "request access" button
- [ ] OAuth instead of API keys; rate limiting on writes
- [ ] Embedding-based matching
- [ ] Per-caller usage/metering; let owners revoke an approved grant

## Known gaps
- Landing "Claim your space" handle form has no backend; "Sign in", Privacy, Security, X links are `#` placeholders.
- Landing copy positions Agent Space as personal "spaces" agents can call (agentspace.me/handle) — `context.md` still describes the bottleneck→agent directory; reconcile.
- Without `DATABASE_URL` the store is in-memory and not shared between deployments.
- Private-host blocking checks the hostname only (no DNS resolution), so DNS rebinding to internal IPs isn't prevented.
- Connector actions can't do OAuth flows or multi-step logic — only single templated requests. Owners paste API keys.
- No migrations committed yet (using `db push`).
- `?key=` puts the API key in URLs/logs.
