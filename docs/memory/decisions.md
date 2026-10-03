# Decisions (append-only)

Format: `YYYY-MM-DD — decision — why`

- 2026-10-03 — pnpm + Turborepo monorepo: `apps/mcp`, `apps/web`, `packages/core` — one repo for the team, shared types.
- 2026-10-03 — MCP hosted as a Next.js route with `mcp-handler` v2 (Streamable HTTP, stateless) — deploys to Vercel as-is, no Redis.
- 2026-10-03 — MCP and web are separate Vercel projects — MCP is the product; web is a viewer.
- 2026-10-03 — In-memory seeded store behind a `Store` interface for the first build — speed. **Consequence:** data resets on cold start and is not shared between web and mcp deployments. Next step is a real DB.
- 2026-10-03 — Keyword matching (`packages/core/src/match.ts`) — good enough for demo; upgrade to embeddings via AI Gateway later.
- 2026-10-03 — No auth yet — public directory; add before letting anyone write in prod.
- 2026-10-03 — Hosted agents = skills, not runtimes: instructions + context notes + scoped connector actions, served over MCP. The *caller's* LLM reasons; we never run an agent loop, cron or schedule — matches "humans out of the loop via natural language" with zero infra.
- 2026-10-03 — Visvine is infrastructure only (`POST https://visvine.com/api/actions/<name>`, bearer): `edit_context`/`read_context` for notes, connector notes (`connectors/<handle>-<name>.md`) + `run_connector` for external calls, `set_connector_secret` for keys. Visvine's agent system is NOT used.
- 2026-10-03 — One platform Visvine space/token holds every agent's notes and connectors; Agents Space enforces ownership and scope. Connector names are namespaced by owner handle. Callers can only run *declared* actions an owner attached — never raw code, never secrets.
- 2026-10-03 — API keys (`as_...`, sha256-hashed) instead of OAuth — fastest path; `?key=` accepted for clients that can't set headers (leaks into logs; replace with OAuth later).
- 2026-10-03 — Registry persisted as one private JSON note (`agentspace/registry.md`) in Visvine, reloaded when >5s stale — persistence + web/mcp sharing without adding a DB. Last write wins; swap for Postgres when it matters.
- 2026-10-03 — Private agents are listed in search (marked "request access") but instructions/actions are hidden until the owner approves.
- 2026-10-03 — Secrets: we forward to Visvine write-only and never store/echo them. Connector notes hold `{{secret:NAME}}` references only.
- 2026-10-03 — Web UI is light only with a blue accent (#2563eb). Layout is a left sidebar (logo, search, people) with the agent card grid on the right. Hero, section labels and the bottlenecks list are gone. Why: user asked for a directory look, not a landing page.
- 2026-10-03 — **Supersedes the Visvine entries above.** Connectors, context notes, secrets and the registry now live in Agents Space itself; no external runtime. — The MCP is our product; it shouldn't depend on another platform's servers.
- 2026-10-03 — Database: Supabase Postgres via Prisma 7 (`prisma-client` generator, `@prisma/adapter-pg`). `DATABASE_URL` = pooled (6543) for the apps, `DIRECT_URL` = direct for the CLI. In-memory `Store` remains as the no-DB fallback. — Team choice; adapter-pg works with Supabase's transaction pooler.
- 2026-10-03 — Connector actions are declarative (HTTP request templates with `{{args.x}}` / `{{secret.X}}`, or remote-MCP `list_tools` / `call_tool`), not builder JS. — Running untrusted code needs a sandbox (cost, latency); templates cover most REST APIs and are safe to run in our functions.
- 2026-10-03 — Outbound safety: host must be fixed in the template and in the connector's allowlist; private/loopback hosts rejected; path/query args URL-encoded; redirects not followed; 30s timeout; 50KB response cap; secret values redacted from results.
- 2026-10-03 — Secrets encrypted with AES-256-GCM (`CONNECTOR_SECRETS_KEY`), stored in `ConnectorSecret`, decrypted only per request. — Owners need write-only secrets; key rotation = owners re-set secrets.
- 2026-10-03 — Monorepo uses one root `.env.local`; Next configs load it via `process.loadEnvFile`, Prisma config via dotenv.
