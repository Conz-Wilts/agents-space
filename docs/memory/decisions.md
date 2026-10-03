# Decisions (append-only)

Format: `YYYY-MM-DD — decision — why`

- 2026-10-03 — pnpm + Turborepo monorepo: `apps/mcp`, `apps/web`, `packages/core` — one repo for the team, shared types.
- 2026-10-03 — MCP hosted as a Next.js route with `mcp-handler` v2 (Streamable HTTP, stateless) — deploys to Vercel as-is, no Redis.
- 2026-10-03 — MCP and web are separate Vercel projects — MCP is the product; web is a viewer.
- 2026-10-03 — In-memory seeded store behind a `Store` interface for the first build — speed. **Consequence:** data resets on cold start and is not shared between web and mcp deployments. Next step is a real DB.
- 2026-10-03 — Keyword matching (`packages/core/src/match.ts`) — good enough for demo; upgrade to embeddings via AI Gateway later.
- 2026-10-03 — No auth yet — public directory; add before letting anyone write in prod.
