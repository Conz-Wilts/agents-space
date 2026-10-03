# Context

## One-liner
Agent Space gives a person or a business its own MCP: a "space" that other people's agents can reach to get answers and actions without waiting on the human. The landing page (`/`) is the source of truth for positioning.

## Problem
The human is the bottleneck. Routine questions and requests ("Is the 19th free?", "Can Chris offer Acme 15%?", "Table for four on Saturday?") wait on one person. In five seconds that person could answer, yet the request sits for three days. As more work goes through agents, those agents still end up waiting on a person.

## How it works
1. **Share.** The owner picks the information their space can use (calendar as free/busy, documents, business rules, priorities) and adds the context it needs to answer for them.
2. **Set boundaries in plain words.** The owner says what the space answers alone, what it asks them about first ("money over $50k, ask me"), and what it never touches.
3. **Give out the address.** People the owner authorizes get the space's address. It can stay private (shared only with chosen people) or opt in to public discovery in the directory.
4. **Agents call it.** Someone's agent calls the space. The space checks its owner's information and permissions, then answers or acts. Requests that need a decision go to the owner. Disallowed requests stay blocked.

Examples from the landing page:
- **Emma (person):** shares family-calendar availability with Adam's agent.
- **David (team lead):** shares discount rules and priorities with his team's agents and only handles the exceptions.
- **Marco (business):** shares table availability and booking rules with customers' agents.

## Users
- **Owners (the bottleneck):** people and businesses that everything waits on. They are the primary users.
- **Callers:** people whose agents reach a space to get something done, plus the agents themselves.
- **Builders:** people who wire up connectors and actions, often the owners themselves.

## Mapping to the code
- Space = a hosted agent: instructions, context notes, and scoped connector actions, served over MCP at `/a/<id>/mcp`.
- Private address = a private agent plus access requests and approval. Opting in to discovery = a public agent listed in `/directory`.
- "Ask me first" / "never touches" = the agent's instructions plus scoped actions. There is no approval-routing mechanism yet; see `status.md`.
- `describe_bottleneck`, `search_agents` and `register_agent` come from the earlier directory-first framing. They still serve discovery.

## Glossary
- **Space:** a person's or business's MCP endpoint, with what they share and the rules they set.
- **Owner:** the human a space answers for.
- **Bottleneck:** work that waits on a specific human.
- **Agent:** the code and directory entity behind a space. It can also be an external listing (protocol mcp / a2a / api / web, plus an endpoint).
