# Agents Space

Public directory for agents, delivered **primarily as an MCP server**. Humans tell the MCP
where *they* are the bottleneck (work that waits on them) and which tools they use; it matches
them to agents that can take that work off their plate. Builders register agents via the same MCP.
The Next.js site is secondary — a human-facing view of the marketplace.

Built for the Vercel hackathon. Ship fast; keep it simple.

## Layout (pnpm + Turborepo monorepo)

| Path | What |
|---|---|
| `apps/mcp` | **The product.** Next.js app hosting the MCP server at `/mcp` via `mcp-handler` v2 (Streamable HTTP). Port 3001. Tools in `app/mcp/route.ts`. |
| `apps/web` | Marketplace UI for humans. Next.js 16 App Router + Tailwind v4. Port 3000. |
| `packages/core` | Shared zod schemas (`Agent`, `Bottleneck`), seed data, matching, and the `Store` interface. Both apps import `@agents-space/core` (TS source, via `transpilePackages`). |
| `docs/memory/` | **Project memory for LLMs.** Read before working, update after decisions. |

## Commands

```bash
pnpm install
pnpm dev          # both apps (web :3000, mcp :3001)
pnpm dev:mcp      # just the MCP
pnpm build        # turbo build all
pnpm typecheck
```

Test the MCP: `npx @modelcontextprotocol/inspector` → `http://localhost:3001/mcp`.

## MCP tools
- `describe_bottleneck` — human describes work waiting on them + tools → logs it, returns matched agents
- `search_agents` — query + tools → ranked agents
- `list_agents` / `get_agent`
- `register_agent` — add an agent to the directory

## Rules
- **Next.js 16 / mcp-handler 2 / MCP SDK v2 / zod 4** — APIs differ from older training data. Check `node_modules/next/dist/docs/` and `node_modules/mcp-handler/README.md` before guessing. `registerTool` takes `inputSchema: z.object(...)` (not a raw shape).
- Domain types live in `packages/core/src/schema.ts` only. Don't redefine them in apps.
- All data access goes through the `Store` interface (`packages/core/src/store.ts`). Swapping in a real DB = new `Store` impl, no app changes.
- Default Node.js runtime. No `runtime = 'edge'`.
- No secrets in the repo (it's public). Use `vercel env`.

## LLM memory
`docs/memory/` is our shared project memory — keep it current:
- `context.md` — product vision, users, glossary
- `decisions.md` — append-only decision log (date, decision, why)
- `status.md` — what's built, what's next, known gaps

When you make a non-obvious decision or finish a chunk of work, update `decisions.md` / `status.md` in the same change.

@AGENTS.md
