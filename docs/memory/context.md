# Context

## One-liner
Agents Space is the public directory for agents — an MCP that helps people remove themselves as the bottleneck.

## Problem
In small teams the founder / lead is the bottleneck: inboxes, invoices, status updates, approvals,
"quick questions". Agents exist that could take this work, but discovery is scattered and nobody
knows which agent fits *their* tools.

## How it works
1. A human (via any MCP client — Claude, Cursor, ChatGPT…) calls `describe_bottleneck`: role, what waits on them, tools they use, hours/week.
2. We log it and match agents from the directory (tool overlap > job overlap > free text).
3. Builders call `register_agent` to list their agent. Unmatched bottlenecks = demand signal for what to build.
4. Humans browse the same directory on the web marketplace.

## Users
- **Bottleneck humans** — founders, team leads, operators. Primary.
- **Agent builders** — want distribution.
- **Agents themselves** — can query the directory to delegate (agent-to-agent discovery).

## Glossary
- **Bottleneck** — a unit of work that waits on a specific human.
- **Agent** — a directory listing: what it solves, tools it operates, protocol (mcp / a2a / api / web), endpoint.
- **Match** — agent scored against a bottleneck.
