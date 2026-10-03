# Agents Space

Public directory for agents, delivered **primarily as an MCP server**. Humans tell the MCP
where *they* are the bottleneck (work that waits on them) and which tools they use; it matches
them to agents that can take that work off their plate. Builders register agents via the same MCP.
Hosted agents are skills: instructions + context notes + scoped connector actions, served over MCP (no agent runtime, no cron). Connector actions are declarative (HTTP templates or remote-MCP calls) and run inside Agents Space. The Next.js site is secondary — a human-facing view of the marketplace.

Built for the Vercel hackathon. Ship fast; keep it simple.

## Layout (pnpm + Turborepo monorepo)

| Path | What |
|---|---|
| `apps/mcp` | **The product.** Next.js app hosting the MCP server at `/mcp` via `mcp-handler` v2 (Streamable HTTP). Port 3001. Tools in `app/mcp/route.ts`. |
| `apps/web` | Marketplace UI for humans. Next.js 16 App Router + Tailwind v4. Port 3000. |
| `packages/core` | Shared zod schemas (`Agent`, `User`, `Connector`, `AccessRequest`, `Bottleneck`), seed data, matching, `Store` (`store/`: Prisma + in-memory fallback), connector runtime (`connectors.ts`), secret encryption (`secrets.ts`), hosted-agent logic (`agents.ts`). Prisma schema in `prisma/schema.prisma`. Both apps import `@agents-space/core` (TS source, via `transpilePackages`). |
| `docs/memory/` | **Project memory for LLMs.** Read before working, update after decisions. |

## Commands

```bash
pnpm install
pnpm dev          # both apps (web :3000, mcp :3001)
pnpm dev:mcp      # just the MCP
pnpm build        # turbo build all
pnpm typecheck
pnpm db:push      # sync prisma/schema.prisma to Supabase (dev)
pnpm db:migrate   # create a migration (prisma migrate dev)
pnpm db:seed      # example listings
```

Env: one `.env.local` at the repo root (see `.env.example`): `DATABASE_URL` (Supabase pooled), `DIRECT_URL` (Supabase direct, for the CLI), `CONNECTOR_SECRETS_KEY`. Without `DATABASE_URL` the store is in-memory.

Test the MCP: `npx @modelcontextprotocol/inspector` → `http://localhost:3001/mcp`.

## MCP tools
Main server `/mcp` (auth: `Authorization: Bearer as_...` or `?key=`; anonymous = read + public use):
- Account: `create_account`, `whoami`
- Discover: `describe_bottleneck`, `search_agents`, `list_agents`, `get_agent`
- Access: `request_access`, `my_access_requests`, `list_access_requests`, `review_access_request`
- Build: `create_agent` → `add_context_note` (+ `remove_context_note`) → `create_connector` → `set_connector_secret` → `attach_connector` → `test_agent` → `publish_agent` (+ `update_agent`, `detach_connector`, `unpublish_agent`, `my_agents`, `my_connectors`); prompt `build_agent`
- Use: `use_agent` (skill text + scoped actions), `run_agent_action`
- `register_agent` — list an *external* agent

Per-agent server `/a/<id>/mcp`: the shareable link. Tools = `instructions` + one per scoped action (`<connector>__<action>`); without access only `request_access`.

## Rules
- **Next.js 16 / mcp-handler 2 / MCP SDK v2 / zod 4** — APIs differ from older training data. Check `node_modules/next/dist/docs/` and `node_modules/mcp-handler/README.md` before guessing. `registerTool` takes `inputSchema: z.object(...)` (not a raw shape).
- Domain types live in `packages/core/src/schema.ts` only. Don't redefine them in apps.
- All data access goes through the `Store` interface (`packages/core/src/store/index.ts`). Prisma 7 (`prisma-client` generator → `src/generated/prisma`, gitignored, built on `postinstall`) with the `@prisma/adapter-pg` driver. Schema changes: edit `prisma/schema.prisma`, then update `store/prisma.ts` mappers + `schema.ts` zod types.
- Connector secrets: only ever stored encrypted (`secrets.ts`), never returned, redacted from action results.
- Default Node.js runtime. No `runtime = 'edge'`.
- No secrets in the repo (it's public). Use `vercel env`.

## LLM memory
`docs/memory/` is our shared project memory — keep it current:
- `context.md` — product vision, users, glossary
- `decisions.md` — append-only decision log (date, decision, why)
- `status.md` — what's built, what's next, known gaps

When you make a non-obvious decision or finish a chunk of work, update `decisions.md` / `status.md` in the same change.

@AGENTS.md
