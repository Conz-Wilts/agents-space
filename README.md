# Agents Space

People and businesses are the bottleneck: work waits on them. Agents Space gives each of them a
**space** — their own MCP address (`/<handle>/mcp`) that other people's agents call to get answers
and actions within the rules the owner sets. Delivered primarily as an MCP server; the web app is
the human-facing view and the opt-in directory.

Vercel hackathon project.

## Production

| What | Where |
|---|---|
| Web | https://agents-space-web.vercel.app |
| MCP | https://agents-space-mcp.vercel.app/mcp |
| A space | `https://agents-space-mcp.vercel.app/<handle>/mcp` |
| Hosted agent | `https://agents-space-mcp.vercel.app/a/<id>/mcp` |
| For AI agents | https://agents-space-web.vercel.app/llms.txt |

Hosting: two Vercel projects in the `supayappers` team — `agents-space-web` (root `apps/web`) and
`agents-space-mcp` (root `apps/mcp`). Deployed with the CLI; no git integration yet.

Database + auth: one Supabase project (ref `mdcuxbcbykojpztogzpm`). Postgres backs the `Store`
(Prisma client over the pooler); Supabase Auth provides Google sign-in for the web and the OAuth 2.1
server MCP clients sign in through. The prod `/mcp` requires sign-in (`401` without a token).

### Connect

```bash
# Claude Code (OAuth sign-in on first use)
claude mcp add --transport http agents-space https://agents-space-mcp.vercel.app/mcp

# or: device login + API key, registers the server for you
curl -fsSL https://agents-space-web.vercel.app/cli.mjs -o /tmp/agents-space.mjs && node /tmp/agents-space.mjs login
```

Other clients: `{"mcpServers": {"agents-space": {"url": "https://agents-space-mcp.vercel.app/mcp"}}}`,
or an `as_` API key from `/account` as `Authorization: Bearer as_...`.
Stdio-only client: `npx -y mcp-remote https://agents-space-mcp.vercel.app/mcp`.

### Environment

Both projects carry the same production variables (values live in Vercel, never in the repo):

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Supabase pooled connection (port 6543), used at runtime |
| `DIRECT_URL` | Supabase session pooler (port 5432, `aws-0-<region>.pooler.supabase.com`) |
| `CONNECTOR_SECRETS_KEY` | AES-256-GCM key for connector secrets. Rotating it orphans stored secrets |
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase Auth |
| `NEXT_PUBLIC_WEB_URL` / `NEXT_PUBLIC_MCP_URL` / `PUBLIC_MCP_ORIGIN` | How the apps link to each other and build agent endpoints |

Pull them locally: `vercel env pull .env.local --scope supayappers --project agents-space-web`.

### Deploy

```bash
vercel deploy --prod --scope supayappers --project agents-space-web
vercel deploy --prod --scope supayappers --project agents-space-mcp
```

Schema changes go through Supabase declarative schemas (`supabase/schemas/**.sql` →
`pnpm supabase db schema declarative sync -f <name> --no-apply` → review → `pnpm supabase db push`),
not `pnpm db:push`. See [AGENTS.md](./AGENTS.md).

## Local development

```bash
pnpm install
cp .env.example .env.local   # optional; without DATABASE_URL the store is in-memory and seeded
pnpm dev                     # web :3000, MCP :3001/mcp
```

Without Supabase env the local `/mcp` is open (no sign-in). Local web and MCP each hold their own
in-memory store unless `DATABASE_URL` is set.

```bash
claude mcp add --transport http agents-space-local http://localhost:3001/mcp
npx @modelcontextprotocol/inspector   # → http://localhost:3001/mcp
```

## Repo

```
apps/mcp        MCP server (the product) — Next.js + mcp-handler
apps/web        Landing, directory, account, OAuth consent — Next.js + Tailwind
packages/core   Shared schemas, store (Prisma + in-memory), connectors, secrets
packages/cli    agents-space CLI (device login)
supabase/       Declarative schemas + migrations
docs/memory     Shared LLM/project memory (context, decisions, status)
```

See [AGENTS.md](./AGENTS.md) for conventions and [docs/memory/status.md](./docs/memory/status.md) for what's next.
