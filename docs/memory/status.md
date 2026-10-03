# Status

_Last updated: 2026-10-03_

## Built
- [x] Monorepo scaffold, builds green
- [x] Web marketplace: directory grid, search, recent bottlenecks, `/api/agents` (public projection only)
- [x] Seed data: 5 example external agents
- [x] Accounts + API keys; anonymous read
- [x] Natural-language agent builder over MCP: create → context notes → connectors (REST or wrapped MCP) → secrets → scoped attach → test → publish
- [x] Four visibility modes (public / listed / restricted / private) with `canSeeInfo` + `hasAccess` in both stores; `allow_access` / `revoke_access` / `list_access` take an optional `agent_id`; web owner control has four options. Migrations `20261003212832_visibility_modes.sql` (adds enum values) and `20261003213100_visibility_backfill.sql` (old private → listed, spaces → restricted) are applied to the remote DB (via the Supabase MCP, since `db push` is blocked by the `payments` migration `20261003213000` that is on the remote but not in the repo); web and MCP are deployed on this code. Driven on the in-memory MCP only; the web owner controls and agent page were read, not driven (no Supabase locally)
- [x] Public / private agents, access requests + owner review (superseded by the line above)
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
- [x] Web agent pages `/agents/<id>` (cards link there), Visvine-style: doc list (Instructions, each context note, Tools) + rendered markdown with a Raw toggle; drafts owner-only, private agents hide the skill without access
- [x] Web owner controls on `/agents/<id>`: Public/Private switch, Share (copy page / MCP link); My agents lists pending access requests with Approve/Deny; non-owners on private agents get a Request access form
- [x] Web connector secrets: owners set connector secrets on the agent page and in `/account` → Connectors & secrets (write-only; web needs `CONNECTOR_SECRETS_KEY`)
- [x] Sign-in `redirectTo` is the bare `/auth/callback`; `next` rides in an `auth_next` cookie so Supabase's exact allowlist match works
- [x] Every web page is in the landing design: `/directory`, `/my-agents`, `/agents/<id>`, `/account` and a 404 share `AppPage` (landing nav + footer + motion); login/device/consent cards already matched. The old Agent Book header, user menu, `ui.tsx` and the `surface`/`fg`/`brand` tokens are gone
- [x] Landing motion: scroll reveals, hero conversation plays out, task log checks off, network lines draw + packets flow, typed handle field, sticky frosted nav, spotlight on dark sections; reduced-motion safe
- [x] RLS lockdown (2026-10-03): all 8 remaining public tables RLS-enabled, no anon/authenticated grants, default table privileges for those roles removed (`supabase/migrations/20261003204622_rls_lockdown.sql`). Applied to the remote DB; security advisor shows 0 RLS errors.

- [x] Claim your space: landing form checks the handle (`/api/handles/<h>`) and shows the MCP install command with `?claim=<handle>` (Claude Code via `npx agents-space login --claim <handle>`, Claude / Cursor / VS Code via the URL). The first signed-in (Google) request claims it: handle set, private space created at `/<handle>/mcp`. Also `claim_space` / `my_space` tools. Tested end to end locally against the Supabase DB (2026-10-03): device login → auto-claim of `scarranca` → `my_space`, handle lock, availability, unlisted, `/scarranca/mcp` 401 anonymous / works for owner. The npm `agents-space` CLI (0.1.0) needs a new publish for `--claim`

- [x] One MCP to reach anyone: `ask_space("@emma")` loads Emma's space as the signed-in user (rules, context, allowed actions) or says how to get access; owners whitelist with `allow_access` / `revoke_access` / `list_access` (an allow = an approved AccessRequest, no schema change). Tested against the Supabase DB with a throwaway account (deleted)

- [x] `/llms.txt` on the web (llmstxt.org): what Agent Space is, how to connect, reach someone by handle, run your own space; linked as "For agents" in the landing footer
- [x] Agent tables (2026-10-03): every hosted agent keeps its own data on Agents Space, no connector needed. Built-in `outputs` table (kind, summary, data) on every agent; owners `create_table` for their purpose (e.g. `reservations`) with typed columns, a context that goes into the skill, and `caller_access` (none / insert / own / read / write). Row tools on `/mcp` (with `agent_id`) and on every per-agent server. Tested on the in-memory store and through the route handlers. **Migration `20261003214000_agent_tables.sql` is hand-written (Docker was off for the declarative sync) and not yet pushed to Supabase.**

- [x] Scheduled agents (2026-10-03): `Agent.mode` = `skill` (default, for others) or `scheduled` (runs for its owner). `AgentSchedule` table (cron + IANA timezone + task, ≥15 min apart, ≤10 per agent). Vercel Cron → `/api/cron/schedules` every minute claims due schedules atomically and runs an AI SDK `ToolLoopAgent` (AI Gateway, `SCHEDULE_MODEL`) over the agent's skill, scoped actions and tables as the owner; report saved to `lastResult` + an `outputs` row (`kind: scheduled_run`). MCP tools: `schedule_agent`, `list_schedules`, `update_schedule`, `delete_schedule`, `run_schedule_now`, `schedule_runs`. Scheduled agents are owner-only: unlisted, no access for others, can't be published. Tested on the in-memory store with a mock model; **not yet run against a real model** (no `AI_GATEWAY_API_KEY` locally). Migration `20261003220000_agent_schedules.sql` not yet pushed

- [x] Models (2026-10-03): owners add LLMs like Visvine's models/ (Vercel AI Gateway, OpenAI, Anthropic, Google, OpenRouter, any OpenAI-compatible URL), key encrypted, pick one per agent (`Agent.model`); scheduled runs use it, else the default. MCP tools `add_model`, `my_models`, `set_model_key`, `test_model`, `set_agent_model`, `remove_model`; web: Models folder on the agent page (switch, add, set key, test). Provider wiring checked offline; **no live provider call made yet**. Migration `20261003223000_ai_models.sql` not yet pushed
- [x] Agent page skill tree (2026-10-03): Visvine-style explorer replaces the flat doc list: folders Context / Tables / Tools / Models / Schedules with counts, nested notes by `/` in titles, search (names + text, highlights, Enter opens first hit), breadcrumbs, red setup dots. Checked at 1440px and 390px (no overflow)
- [x] Composio apps + custom connectors (2026-10-03): platform `COMPOSIO_API_KEY` (env on web + mcp; users never see a key). Users browse 1000+ apps and sign in via Composio's hosted page (OAuth or their own key); connecting saves connector `<handle>-composio-<app>` with `composio` actions (main tools, or named ones) that run as the connector owner. MCP: `list_apps`, `app_tools`, `connect_app`, `my_apps`, `disconnect_app` (registered only when the key is set). Web `/account`: Apps grid (search, Connect → sign-in → back to `/account?connected=<app>`, Reconnect, Disconnect) + Custom MCP server form. Tested live against Composio: catalog, Gmail/Slack sign-in links, a no-auth tool (Hacker News `get_item`) run through attach → `test_agent` → per-agent server. **Not yet done: completing a real OAuth sign-in; the web Apps section was built and compiled but not viewed in a browser (no local Google sign-in).** Needs `COMPOSIO_API_KEY` set on both Vercel projects

## Testing
- Test plan and results grid: [docs/test-plan.md](../test-plan.md)

- [x] Payments (2026-10-03): `enable_payments` (Stripe Connect Express + onboarding link), `set_price` / `remove_price`, `request_payment` → Stripe Checkout link paid out to the owner, `check_payment`, `my_payments`. Prices show in the skill (ask_space / use_agent / `/<handle>/mcp`, which also gets request_payment + check_payment). Tables `Price`, `Payment`, column `User.stripeAccountId` (migration `20261003213000_payments`, applied). Tested end to end against the Supabase DB + Stripe test mode: dentist space with availability + a MX$800 cleaning, patient's agent got the link, paid with 4242, check_payment → paid, transfer reached the connected account. (The test used an API-made Custom test account; the Express onboarding page was checked to load but not filled in.)

## Next
- [ ] Push the `ai_models` migration (after `agent_schedules`)
- [ ] Push the `agent_schedules` migration; set `CRON_SECRET` (+ AI Gateway) on `agents-space-mcp`. Every-minute cron needs Vercel Pro
- [ ] Web: show / edit schedules and recent runs on the agent page
- [ ] Create the Supabase project, set `DATABASE_URL` / `DIRECT_URL` / `CONNECTOR_SECRETS_KEY` (local + Vercel), `pnpm db:push` — switch to `db:migrate` migrations before real users
- [x] `apps/web` deployed: Vercel project `agents-space-web` (team SUPAYAPPERS, root dir `apps/web`, prod env set) → https://agents-space-web.vercel.app; MCP on `agents-space-mcp` → https://agents-space-mcp.vercel.app (CLI deploys, no git integration yet)
- [ ] Deploy `apps/mcp` as its own Vercel project; set `PUBLIC_MCP_ORIGIN`, `NEXT_PUBLIC_MCP_URL`
- [ ] Web: edit instructions / notes, publish/unpublish, invite a person by handle (MCP covers inviting and revoking via `allow_access` / `revoke_access` with `agent_id`; the web has no UI for it)
- [ ] Supabase dashboard: Google provider, redirect URLs, OAuth Server (path `/oauth/consent`, dynamic registration) — then test sign-in from Claude / MCP Inspector end to end (**not yet tested live**: no `NEXT_PUBLIC_SUPABASE_URL` set)
- [ ] Rate limiting on writes
- [ ] Embedding-based matching
- [ ] Per-caller usage/metering
- [ ] "Ask me first": hold requests outside the owner's rules for their decision (needs a table)
- [ ] Notify owners of new access requests (today they only see them in `my_space` / `list_access`)

## Known gaps
- One API key per user: `rotateApiKey` replaces it, and CLI device login (`agents-space login`, the command the landing page gives Claude Code users) rotates it on approval. Connecting Claude Code that way silently disconnects every API-key client (Poke, Muse, OpenClaw). Fix: an `ApiKey` table so device login adds a key instead of replacing it.
- Ids and handles are a public namespace: id collisions (suffixing in `register_agent`/`create_agent`, `/api/handles/<h>`, `claim_space`) reveal that an id is taken, even by a private or draft agent, but nothing about it.
- Google name + picture aren't stored on `User`, so agent tiles show them only to the signed-in owner (my agents, own agent pages); everyone else sees the `owner` handle and initials.
- Agent tables: equality filters only (no ranges, sorting by column or full-text); max 20 tables, 40 columns, 10k rows per table, 16KB per row; no web UI for tables yet; anonymous callers on public agents can add rows but can't read them back.
- Payments: no webhook (status is polled on check_payment / my_payments); no refunds or platform fee; a paid slot isn't auto-booked in a calendar: the space's rules tell the caller's agent to book after check_payment says paid. Google Calendar still needs OAuth, which connectors don't do (Cal.com-style API keys work).
- Privacy, Security, X links on the landing are `#` placeholders.
- No web (non-MCP) claim path yet: someone who won't install an MCP can't claim a space from the site.
- `update_agent` can change a space's category, which makes it stop being a space.
- "Ask me first" from the landing page isn't built: a space can't yet send a request to its owner for a decision and resume after they answer. Today it only answers within its instructions and scoped actions, or refuses.
- Without `DATABASE_URL` the store is in-memory and not shared between deployments.
- Private-host blocking checks the hostname only (no DNS resolution), so DNS rebinding to internal IPs isn't prevented.
- Connector actions can't do OAuth flows or multi-step logic — only single templated requests. Owners paste API keys.
- No migrations committed yet (using `db push`).
- `?key=` puts the API key in URLs/logs.
