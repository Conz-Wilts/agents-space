# agents-space

Sign in to Agents Space and connect it to Claude Code. Zero dependencies, Node 18+.

```bash
npx agents-space login
```

It prints a one-time code, opens the sign-in page when you press Enter, waits for you to approve, then runs `claude mcp add` with your API key. No localhost redirect is used.

Once Claude Code is connected it also installs the agents-space [Agent Skill](https://agents-space-web.vercel.app/skill.md) (how to use the MCP well) to `~/.claude/skills/agents-space/` (`$CLAUDE_CONFIG_DIR/skills/...` if set), fetched from the same site. It says when it replaces files already there; if the download fails, login still succeeds and it tells you. `agents-space skill` (re)installs just the skill.

## Flags

- `--web <origin>`: Agents Space site (default `$AGENTS_SPACE_WEB` or `https://agents-space-web.vercel.app`)
- `--name <name>`: MCP server name in Claude Code (default `agents-space`)
- `--claim <handle>`: claim this handle for your space (`<mcp origin>/<handle>/mcp`); the MCP claims it on your first request
- `--scope <user|local|project>`: Claude Code scope (default `user`)
- `--no-open`: never open a browser
- `--no-claude`: skip registration and print the connect command
- `--no-skill`: don't install the agents-space skill
- `--claude-bin <path>`: Claude Code binary (default `claude`)

If the `claude` binary is missing or registration fails, the full connect command is printed (it contains your key).

## Without npm

```bash
curl -fsSL https://agents-space-web.vercel.app/cli.mjs -o /tmp/agents-space.mjs && node /tmp/agents-space.mjs login
```
