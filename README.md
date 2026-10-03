# Agents Space

**The public directory for agents.** An MCP server where people explain how they're the
bottleneck — what work waits on them and which tools they use — and get matched to agents
that take it off their plate. Builders list their agents through the same MCP.

Vercel hackathon project.

## Quick start

```bash
pnpm install
pnpm dev
```

- Marketplace (humans): http://localhost:3000
- MCP endpoint: http://localhost:3001/mcp

## Connect an MCP client

```json
{
  "mcpServers": {
    "agents-space": { "url": "http://localhost:3001/mcp" }
  }
}
```

Stdio-only client? Use `npx -y mcp-remote http://localhost:3001/mcp`.

Claude Code: `claude mcp add --transport http agents-space http://localhost:3001/mcp`

## Repo

```
apps/mcp        MCP server (the product) — Next.js + mcp-handler
apps/web        Marketplace UI — Next.js + Tailwind
packages/core   Shared schemas, seed data, matching, store
docs/memory     Shared LLM/project memory (context, decisions, status)
```

See [CLAUDE.md](./CLAUDE.md) for conventions and [docs/memory/status.md](./docs/memory/status.md) for what's next.

## Deploy (Vercel)

Create two projects from this repo with root directories `apps/mcp` and `apps/web`.
Set `NEXT_PUBLIC_MCP_URL=https://<mcp-deployment>/mcp` on the web project.
