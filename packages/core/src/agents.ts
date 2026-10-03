import { z } from "zod";
import { store, slug } from "./store";
import { mcpServerActions, prepareConnector, runConnectorAction } from "./connectors";
import { encryptSecret } from "./secrets";
import { tablesSkill } from "./tables";
import { payablePrices, priceLine } from "./payments";
import type { ActionParam, Agent, Connector, ConnectorActionInput, User } from "./schema";

/**
 * Hosted agents = skills. An agent is its instructions + context notes plus scoped access to
 * connector actions. Whoever calls it over MCP brings the LLM; Agents Space runs the actions.
 */

export async function addContextNote(agent: Agent, title: string, body: string) {
  return store.upsertNote({ agentId: agent.id, slug: slug(title) || "note", title, body });
}

/** The full skill text a caller's LLM should follow. */
export async function loadSkill(agent: Agent): Promise<string> {
  const parts = [`# ${agent.name}\n\n${agent.tagline}\n\n## Instructions\n\n${agent.instructions || agent.description}`];
  for (const n of await store.listNotes(agent.id)) parts.push(`## Context: ${n.title}\n\n${n.body}`);
  const tables = await tablesSkill(agent);
  if (tables) parts.push(tables);
  const prices = await payablePrices(agent);
  if (prices.length)
    parts.push(
      `## Prices\n\n${prices.map((p) => `- ${priceLine(p)}`).join("\n")}\n\nWhen something needs paying (e.g. once a time is picked), call request_payment with the price name and a note saying what it's for. Give the link to your human (or pay it), then confirm with check_payment.`,
    );
  return parts.join("\n\n");
}

/** What anyone may see about an agent: no instructions or connector scope. */
export function publicAgent(a: Agent) {
  const { instructions: _i, connectors: _c, ownerId: _o, model: _m, ...listing } = a;
  return listing;
}

export type ScopedAction = { connector: string; action: string; description: string; params: Record<string, ActionParam> };

/** Connector actions callers of this agent may run. */
export async function scopedActions(agent: Agent): Promise<ScopedAction[]> {
  const out: ScopedAction[] = [];
  for (const scope of agent.connectors) {
    const c = await store.getConnector(scope.connector);
    if (!c) continue;
    for (const a of c.actions)
      if (!scope.actions.length || scope.actions.includes(a.name))
        out.push({ connector: c.name, action: a.name, description: a.description, params: a.params });
  }
  return out;
}

const zodFor: Record<ActionParam["type"], () => z.ZodType> = {
  string: () => z.string(),
  number: () => z.number(),
  boolean: () => z.boolean(),
  object: () => z.record(z.string(), z.unknown()),
  array: () => z.array(z.unknown()),
};

/** A tool input schema from an action's declared params. */
export function actionInputSchema(params: Record<string, ActionParam>) {
  return z.object(
    Object.fromEntries(
      Object.entries(params).map(([k, p]) => {
        const t = p.description ? zodFor[p.type]().describe(p.description) : zodFor[p.type]();
        return [k, p.required ? t : t.optional()];
      }),
    ),
  );
}

/** One-line signature for listing an action to an LLM, e.g. `bookings.create(date*, party_size*, notes)`. */
export const actionSignature = (a: ScopedAction) =>
  `${a.connector}.${a.action}(${Object.entries(a.params).map(([k, p]) => `${k}${p.required ? "*" : ""}: ${p.type}`).join(", ")})`;

export async function runAgentAction(agent: Agent, connector: string, action: string, args: Record<string, unknown> = {}) {
  const allowed = await scopedActions(agent);
  if (!allowed.some((a) => a.connector === connector && a.action === action))
    throw new Error(`"${connector}.${action}" is not in ${agent.name}'s scope. Allowed: ${allowed.map((a) => `${a.connector}.${a.action}`).join(", ") || "none"}`);
  const c = await store.getConnector(connector);
  if (!c) throw new Error(`Connector "${connector}" no longer exists.`);
  return runConnectorAction(c, action, args, await store.getSecrets(c.name));
}

/** Create (or replace) a connector owned by `owner`. Name is namespaced by handle. */
export async function createConnector(
  owner: User,
  spec: {
    name: string;
    title: string;
    description: string;
    hosts?: string[];
    secrets?: string[];
    actions: ConnectorActionInput[];
    mcpUrl?: string;
    mcpHeaders?: Record<string, string>;
  },
): Promise<Connector> {
  const name = `${owner.handle}-${slug(spec.name)}`;
  const actions = [...spec.actions, ...(spec.mcpUrl ? mcpServerActions(spec.mcpUrl, spec.mcpHeaders) : [])];
  if (!actions.length) throw new Error("Give at least one action, or an mcp_url.");
  const prepared = prepareConnector({ actions, hosts: spec.hosts, secrets: spec.secrets });
  return store.saveConnector({ name, ownerId: owner.id, title: spec.title, description: spec.description, ...prepared });
}

/** Encrypt and store a secret on one of the owner's connectors. The value is never returned. */
export async function setConnectorSecret(owner: User, connector: string, name: string, value: string) {
  const c = await store.getConnector(connector);
  if (!c || c.ownerId !== owner.id) throw new Error(`You don't own a connector "${connector}". See my_connectors.`);
  if (!c.secrets.includes(name)) throw new Error(`${connector} doesn't reference a secret "${name}". It uses: ${c.secrets.join(", ") || "none"}.`);
  await store.setSecret(c.name, name, encryptSecret(value));
}

/** Secret names a connector references but that have no value yet. */
export async function missingSecrets(c: Connector) {
  const set = await store.getSecrets(c.name);
  return c.secrets.filter((s) => !set[s]);
}

/** Problems that stop an agent working: no instructions, missing connectors or actions, unset secrets. */
export async function checkAgent(agent: Agent): Promise<string[]> {
  const problems: string[] = [];
  if (!agent.instructions.trim()) problems.push("No instructions yet — add them with update_agent.");
  for (const s of agent.connectors) {
    const c = await store.getConnector(s.connector);
    if (!c) {
      problems.push(`Connector "${s.connector}" does not exist.`);
      continue;
    }
    const unknown = s.actions.filter((a) => !c.actions.some((x) => x.name === a));
    if (unknown.length) problems.push(`Connector "${c.name}" has no action(s): ${unknown.join(", ")}.`);
    const missing = await missingSecrets(c);
    if (missing.length) problems.push(`Connector "${c.name}" still needs secret(s): ${missing.join(", ")} — use set_connector_secret.`);
  }
  return problems;
}
