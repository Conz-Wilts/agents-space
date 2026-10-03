# agents-space

Sign in to Agents Space and connect it to Claude Code. Zero dependencies, Node 18+.

```bash
npx agents-space login
```

It prints a one-time code, opens the sign-in page when you press Enter, waits for you to approve, then runs `claude mcp add` with your API key. No localhost redirect is used.

## Flags

- `--web <origin>`: Agents Space site (default `$AGENTS_SPACE_WEB` or `https://agents-space-web.vercel.app`)
- `--name <name>`: MCP server name in Claude Code (default `agents-space`)
- `--scope <user|local|project>`: Claude Code scope (default `user`)
- `--no-open`: never open a browser
- `--no-claude`: skip registration and print the connect command
- `--claude-bin <path>`: Claude Code binary (default `claude`)

If the `claude` binary is missing or registration fails, the full connect command is printed (it contains your key).

## Without npm

```bash
curl -fsSL https://agents-space-web.vercel.app/cli.mjs -o /tmp/agents-space.mjs && node /tmp/agents-space.mjs login
```
