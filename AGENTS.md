# Agents Space — agent guide

Read this before working in the repo. `CLAUDE.md` imports this file; edit this one.

People and businesses are the bottleneck: work waits on them. Agent Space gives each of them a
**space**: their own MCP address (`/<handle>/mcp`) that other people's agents call to get answers and
actions within the rules the owner sets, instead of waiting on the human. Delivered **primarily as an
MCP server**. The directory is the opt-in discovery layer. See `docs/memory/context.md`.
Hosted agents are skills: instructions + context notes + scoped connector actions, served over MCP (no agent runtime, no cron). Connector actions are declarative (HTTP templates or remote-MCP calls) and run inside Agents Space. The Next.js site is secondary — a human-facing view of the marketplace.

Built for the Vercel hackathon. Ship fast; keep it simple.

## Layout (pnpm + Turborepo monorepo)

| Path | What |
|---|---|
| `apps/mcp` | **The product.** Next.js app hosting the MCP server at `/mcp` via `mcp-handler` v2 (Streamable HTTP). Port 3001. Tools in `app/mcp/route.ts`. |
| `apps/web` | Human-facing site. Next.js 16 App Router + Tailwind v4. Port 3000. `/` = landing page, `/directory` = agent directory (Agent Book), `/login` + `/account` + `/oauth/consent` = Supabase sign-in, API keys and MCP OAuth consent, `/device` + `/api/device/{start,poll}` = CLI device login, `/cli.mjs` = the CLI script (copied from `packages/cli` at build), `/api/agents` = public JSON, `/api/handles/<h>` = handle availability. |
| `packages/core` | Shared zod schemas (`Agent`, `User`, `Connector`, `AccessRequest`, `Bottleneck`), seed data, matching, `Store` (`store/`: Prisma + in-memory fallback), connector runtime (`connectors.ts`), secret encryption (`secrets.ts`), hosted-agent logic (`agents.ts`). Prisma schema in `prisma/schema.prisma`. Both apps import `@agents-space/core` (TS source, via `transpilePackages`). |
| `packages/cli` | `agents-space` CLI (zero-dependency, one file). `agents-space login` runs the device flow and registers the MCP server with Claude Code using an API key. Publish to npm to enable `npx agents-space login`. |
| `docs/memory/` | **Project memory for LLMs.** Read before working, update after decisions. |

## Commands

```bash
pnpm install
pnpm dev          # both apps (web :3000, mcp :3001)
pnpm dev:mcp      # just the MCP
pnpm build        # turbo build all
pnpm typecheck
pnpm db:push      # DEPRECATED: schema is owned by supabase/schemas (see Rules)
pnpm db:migrate   # DEPRECATED: use `pnpm supabase db schema declarative sync`
pnpm db:seed      # example listings
```

Env: one `.env.local` at the repo root (see `.env.example`): `DATABASE_URL` (Supabase pooled, port 6543), `DIRECT_URL` (session pooler, port 5432; use the `aws-0-<region>.pooler.supabase.com` host, since `db.<ref>.supabase.co` is IPv6-only), `CONNECTOR_SECRETS_KEY`, `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (Google sign-in via Supabase Auth). Without `DATABASE_URL` the store is in-memory.

Test the MCP: `npx @modelcontextprotocol/inspector` → `http://localhost:3001/mcp`.

## MCP tools
Main server `/mcp`. Auth: OAuth — MCP clients sign in with Google through Supabase Auth's OAuth 2.1 server (consent page: web `/oauth/consent`; metadata: `/.well-known/oauth-protected-resource/mcp`) — or an `as_` API key (`Authorization: Bearer` / `?key=`) generated at web `/account`. Sign-in is required when Supabase is configured; otherwise anonymous = read + public use:
- Account: `create_account`, `whoami`
- Space: `claim_space` (Google sign-in only; locks the handle), `my_space`. `/mcp?claim=<handle>` (the URL the landing page hands out) claims it on the first signed-in request
- Discover: `describe_bottleneck`, `search_agents`, `list_agents`, `get_agent`
- Access: `request_access`, `my_access_requests`, `list_access_requests`, `review_access_request`
- Build: `create_agent` → `add_context_note` (+ `remove_context_note`) → `create_connector` → `set_connector_secret` → `attach_connector` → `test_agent` → `publish_agent` (+ `update_agent`, `detach_connector`, `unpublish_agent`, `my_agents`, `my_connectors`); prompt `build_agent`
- Use: `use_agent` (skill text + scoped actions), `run_agent_action`
- `register_agent` — list an *external* agent

Per-agent server `/a/<id>/mcp`: the shareable link. A space is the same server at `/<handle>/mcp` (hosted agent with `id = handle`, category `Space`; private spaces are unlisted). Public agents work anonymously; private ones send clients through OAuth sign-in. Tools = `instructions` + one per scoped action (`<connector>__<action>`); without access only `request_access`.

## Rules
- **Next.js 16 / mcp-handler 2 / MCP SDK v2 / zod 4** — APIs differ from older training data. Check `node_modules/next/dist/docs/` and `node_modules/mcp-handler/README.md` before guessing. `registerTool` takes `inputSchema: z.object(...)` (not a raw shape).
- Domain types live in `packages/core/src/schema.ts` only. Don't redefine them in apps.
- **Schema changes go through Supabase declarative schemas, not Prisma.** Edit `supabase/schemas/**.sql`, run `pnpm supabase db schema declarative sync -f <name> --no-apply`, review and commit the generated migration, then `pnpm supabase db push`. Do not use `pnpm db:push` / `db:migrate`. While the app still queries through the Prisma client, refresh `prisma/schema.prisma` with `prisma db pull` afterwards. If you re-run `declarative generate`, delete `supabase/schemas/_cluster/extensions/orioledb.sql` (it breaks the next sync).
- All data access goes through the `Store` interface (`packages/core/src/store/index.ts`). Prisma 7 (`prisma-client` generator → `src/generated/prisma`, gitignored, built on `postinstall`) with the `@prisma/adapter-pg` driver. Schema changes: edit `prisma/schema.prisma`, then update `store/prisma.ts` mappers + `schema.ts` zod types.
- Connector secrets: only ever stored encrypted (`secrets.ts`), never returned, redacted from action results.
- Default Node.js runtime. No `runtime = 'edge'`.
- No secrets in the repo (it's public). Use `vercel env`.

## Web app (`apps/web`)
- **Landing (`/`)** is coded from the Pencil design file `~/Pens/AgentSpace.pen`, frame "Agent Space — Landing". Read it via the Pencil MCP (`get_app_state` → `execute` / `Export`), never by opening the `.pen` file directly. Sections live in `apps/web/components/landing/`.
- **Agent logos** (Muse, Instinct, Grok Bot, Claude, ChatGPT) live in `apps/web/public/agents/`, registered in `components/landing/agents.tsx`. Scenes using them are illustrative; keep the non-affiliation disclaimer in `AgentStrip` whenever real brands appear.
- **Directory (`/directory`)** is the Agent Book UI (`app/directory/page.tsx` + `app/ui.tsx`).
- **Auth**: Supabase Auth with Google (`lib/supabase/server.ts`, `proxy.ts` refreshes the session); the sign-in modal is the `@auth` parallel route.
- **Tokens** (`app/globals.css` `@theme`): the directory uses `surface`, `fg`, `line`, `brand`…; the landing uses `ink`, `muted`, `edge`, `panel`, `wait`, `dark-*`, mirroring the .pen variables. Don't mix the two sets.
- **Landing motion** is CSS plus one client observer (`components/landing/motion.tsx`), with no animation library. Mark a block `data-animate`; its children use reveal classes (`.r`, `.r-pop`, `.r-fade`, `.r-mask`, `.r-type`, `.r-draw`, `.r-grow`, `.r-progress`) staggered with `style={d(ms)}` from `primitives.tsx`. Don't nest `data-animate` blocks, because an outer `data-in` triggers inner reveals early. Keep `prefers-reduced-motion` working (everything visible, nothing moving).
- Server components by default. A server component can't call helpers exported from a `"use client"` file.
- Check UI changes in a browser at 1440px and 390px (no horizontal overflow).

## LLM memory
`docs/memory/` is our shared project memory — keep it current:
- `context.md` — product vision, users, glossary
- `decisions.md` — append-only decision log (date, decision, why)
- `status.md` — what's built, what's next, known gaps

When you make a non-obvious decision or finish a chunk of work, update `decisions.md` / `status.md` in the same change.

<!-- BEGIN:turborepo-agent-rules -->

# This is NOT the Turborepo you know

Turborepo configuration, task behavior, and CLI commands can vary between installed versions and may differ from your training data. Resolve the `turbo` package from this file's directory or relevant workspace; in monorepos, it may not be visible from the repository root. For example, run `node -p "require.resolve('turbo/package.json')"` from a workspace that depends on `turbo`.

Read `docs/README.md` inside that installed package first, then read the relevant pages from its `docs/` directory before changing Turborepo configuration or commands. Heed deprecation notices. These bundled docs match the installed package version and are available without network access.

This block is written and re-added by `turbo` before repository-scoped commands when an AI agent is detected. In the Turborepo source repository, its template is defined in `crates/turborepo-cli/src/cli/agent_guidance.rs`. Removing the managed block while updates are enabled means a later qualifying invocation will add it again. Set `"agentGuidance": false` in the root `turbo.json` or `turbo.jsonc` to opt out; this does not remove an existing block. Keep the block committed with your work to avoid an uncommitted change on the next agent invocation.
<!-- END:turborepo-agent-rules -->
