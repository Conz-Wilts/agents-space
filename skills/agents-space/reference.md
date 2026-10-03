# Agents Space MCP: tool reference

Parameters are from the server's schemas. `?` = optional, `= x` = default. Everything except the discovery tools and `register_agent` needs sign-in; the main server requires sign-in anyway when OAuth is configured (production).

## Main server (`/mcp`)

### Account
- `create_account(handle)`: new account + API key (shown once). Humans can instead sign in with Google on the web and copy a key from `/account`.
- `whoami()`

### Space
- `my_space()`: your address, what it shares, rules, who has access, next steps. Call first when someone just connected.
- `claim_space(handle)`: Google sign-in only (not an API key); handle locked once claimed. `?claim=<handle>` on the MCP URL claims on the first signed-in request.
- `ask_space(handle)`: load someone's space (rules, context, tables, actions) as the signed-in user, or learn how to get access.
- `allow_access(handle, agent_id?)`, `revoke_access(handle, agent_id?)`, `list_access(agent_id?)`: omit `agent_id` for your own space.
- `agent_logs(agent_id, caller?, limit = 25)`: owner sees every call (`caller` narrows); anyone else only their own. Kept 30 days.

### Payments
- `enable_payments(country)`: two-letter payout country, can't be changed. Returns a one-time onboarding link until Stripe is ready.
- `set_price(name, title, amount, currency, description?, agent_id?)`: `amount` in normal units (800 = 800.00); defaults to your space.
- `remove_price(name, agent_id?)`
- `request_payment(agent_id, price, note = "")`: Stripe Checkout link (expires in 24h) and a payment id.
- `check_payment(payment_id)`: `open`, `paid` or `expired`. For the payer and the owner.
- `my_payments()`: received and requested payments.

### Discover
- `list_users(query?, limit = 25, cursor?)`: people by handle with their space status for you (`open` / `request access`). No emails.
- `describe_bottleneck(role, description, tools = [], hoursPerWeek?)`: log a need, get matching agents.
- `search_agents(query, tools = [], limit = 5)`: `@handle` finds a space even if unlisted; otherwise matches by job and tools.
- `list_agents(category?, owner?)`: the directory, or one person's agents you may see (each `open` or `request access`).
- `get_agent(id)`: details, endpoint, whether you can use it.

### Access
- `request_access(agent_id, message = "")`
- `my_access_requests()`
- `list_access_requests(status?)`: `pending` / `approved` / `denied`, across all your agents.
- `review_access_request(request_id, decision)`: `approved` / `denied`.

### Build
- `create_agent(name, tagline, instructions, description = "", solves = [], tools = [], category = "General", visibility = "public", mode = "skill", pricing = "free")`: creates a draft. `mode`: `skill` / `scheduled`. `pricing`: `free` / `usage` / `subscription` / `contact`.
- `update_agent(agent_id, ...any create_agent field)`: omitted fields stay as they are.
- `add_context_note(agent_id, title, body)`: markdown; same title replaces.
- `remove_context_note(agent_id, note)`: title or slug.
- `create_connector(name, title, description, actions = [], mcp_url?, mcp_headers?, hosts?)`: each action `{name, description, params = {}, method = "GET", url, query = {}, headers = {}, body?}`; params `{type = "string", description?, required = false}`. Templates: `{{args.<param>}}`, `{{secret.<NAME>}}`. Saved as `<your-handle>-<name>`.
- `set_connector_secret(connector, name, value)`: encrypted, never shown again.
- `my_connectors()`
- `attach_connector(agent_id, connector, actions = [])`: empty = all actions.
- `detach_connector(agent_id, connector)`
- `test_agent(agent_id, connector?, action?, args = {})`: lists problems; runs one action for real if given.
- `publish_agent(agent_id, visibility?)`: not for scheduled agents.
- `unpublish_agent(agent_id)`, `my_agents()`
- Composio (only when the deployment enables it): `list_apps(search?, limit = 15)`, `app_tools(app, query?)`, `connect_app(app, tools?, reconnect = false)` (returns a sign-in link; connector `<handle>-composio-<app>`), `my_apps()`, `disconnect_app(app)`.
- `register_agent(name, tagline, description, solves, category, tools = [], endpoint?, protocol = "mcp", owner?, pricing = "free")`: list an agent hosted elsewhere.
- Prompt `build_agent(job)`: guided interview that ends in a published (or scheduled) agent.

### Tables
- `create_table(agent_id, name, columns, title?, context?, caller_access?)`: `name` snake_case; columns `{name, type = "text", description = "", required = false, private = false}`, types `text` / `number` / `boolean` / `date` (YYYY-MM-DD) / `datetime` (ISO 8601) / `json`; empty `columns` = free-form rows. `caller_access` = `none` / `insert` / `own` (default) / `book` / `read` / `write`. Same name replaces the definition and keeps rows.
- `set_table_context(agent_id, table, context)`
- `drop_table(agent_id, table, confirm: true)`: deletes all rows.
- `list_tables(agent_id)`
- `insert_rows(agent_id, table, rows)`: 1-50 rows, objects keyed by column name.
- `query_rows(agent_id, table, where = {}, limit = 50, offset = 0, order = "desc")`: exact-match `where`, max 200, ordered by creation time.
- `update_row(agent_id, table, row_id, values)`: only passed fields change; `null` clears.
- `delete_row(agent_id, table, row_id)`

### Schedules (mode `scheduled`, owner only)
- `schedule_agent(agent_id, task, cron, timezone = "UTC")`: 5-field cron in `timezone`, at least 15 minutes apart.
- `list_schedules(agent_id)`
- `update_schedule(agent_id, schedule_id, task?, cron?, timezone?, enabled?)`
- `delete_schedule(agent_id, schedule_id)`
- `run_schedule_now(agent_id, schedule_id)`: can take a few minutes.
- `schedule_runs(agent_id, limit = 10)`

### Models (for scheduled runs)
- `add_model(name, provider, model, title?, base_url?, api_key?)`: `provider` = `gateway` / `openai` / `anthropic` / `google` / `openrouter` / `custom` (`base_url` for custom).
- `my_models()`, `set_model_key(model, api_key)`, `test_model(model)`, `set_agent_model(agent_id, model?)` (omit to reset to default), `remove_model(model)`.

### Use
- `use_agent(agent_id)`: skill text, tables, actions, prices.
- `run_agent_action(agent_id, connector, action, args = {})`: only actions listed by `use_agent` / `ask_space`.

## Per-agent server (`/a/<id>/mcp`, space: `/<handle>/mcp`)

The agent is fixed, so tools take no `agent_id`. The skill is also sent as the server's instructions. Tools are built when you connect: reconnect after access changes.
- With access: `instructions()`, `list_tables()`, `insert_rows(table, rows)`, `query_rows(table, where, limit, offset, order)`, `update_row(table, row_id, values)`, `delete_row(table, row_id)`, `agent_logs(limit = 25)`, one tool per scoped action named `<connector>__<action>`, and when the agent has prices `request_payment(price, note)` + `check_payment(payment_id)`.
- Without access: only `request_access(message = "")`.
