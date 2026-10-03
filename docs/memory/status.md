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
- [x] Google sign-in on the web via Supabase Auth (`@supabase/ssr`, PKCE, `proxy.ts` session refresh): `/login`, `/auth/callback`, `/account` (generate/rotate MCP API key), sign out. `User` links to Supabase via `authId`
- [x] MCP OAuth: Supabase Auth OAuth 2.1 server as authorization server, RFC 9728 metadata at `/.well-known/oauth-protected-resource/<path>`, AS-metadata passthrough at `/.well-known/oauth-authorization-server`, consent page `/oauth/consent` on web. `/mcp` returns a 401 challenge when signed out (when Supabase is configured); private per-agent endpoints too. First sign-in creates the `User` row in Postgres
- [x] Google client credentials verified valid (token endpoint answers invalid_grant to a fake code)
- [x] E2E tested against a local Postgres (prisma dev): accounts, private agent, notes, HTTP + MCP connectors, secrets, scope, access approval, per-agent endpoint
- [x] Landing page at `/` from the Pencil design (responsive; network diagram zooms on lg+, hidden on mobile); directory at `/directory`
- [x] Web `/my-agents` (avatar menu → My agents): signed-in owner's drafts + published agents
- [x] Landing motion: scroll reveals, hero conversation plays out, task log checks off, network lines draw + packets flow, typed handle field, sticky frosted nav, spotlight on dark sections; reduced-motion safe

## Next
- [ ] Create the Supabase project, set `DATABASE_URL` / `DIRECT_URL` / `CONNECTOR_SECRETS_KEY` (local + Vercel), `pnpm db:push && pnpm db:seed` — switch to `db:migrate` migrations before real users
- [x] `apps/web` deployed: Vercel project `agents-space-web` (team SUPAYAPPERS, root dir `apps/web`, prod env set) → https://agents-space-web.vercel.app; MCP on `agents-space-mcp` → https://agents-space-mcp.vercel.app (CLI deploys, no git integration yet)
- [ ] Deploy `apps/mcp` as its own Vercel project; set `PUBLIC_MCP_ORIGIN`, `NEXT_PUBLIC_MCP_URL`
- [ ] Web: agent detail pages, visibility badges, "request access" button
- [ ] Supabase dashboard: Google provider, redirect URLs, OAuth Server (path `/oauth/consent`, dynamic registration) — then test sign-in from Claude / MCP Inspector end to end (**not yet tested live**: no `NEXT_PUBLIC_SUPABASE_URL` set)
- [ ] Rate limiting on writes
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
