import { seedAgents } from "../seed";
import { matchAgents } from "../match";
import { AgentSchema, type AccessRequest, type Bottleneck, type Connector, type ContextNote, type User } from "../schema";
import type { Store } from "./index";
import { handleCandidates, hashKey, newApiKey, normalizeHandle, slug } from "./util";

const now = () => new Date().toISOString();

/** In-memory store for local development without a database. Resets on restart. */
export function createMemoryStore(): Store {
  console.warn("[agents-space] DATABASE_URL not set — using the in-memory store (data resets on restart).");
  const agents = [...seedAgents];
  const notes: ContextNote[] = [];
  const users: User[] = [];
  const connectors: Connector[] = [];
  const secrets = new Map<string, Record<string, string>>();
  const requests: AccessRequest[] = [];
  const bottlenecks: Bottleneck[] = [];

  return {
    async listAgents({ query, category, viewerId } = {}) {
      let all = agents.filter((a) => a.status === "published" || (viewerId && a.ownerId === viewerId));
      if (category) all = all.filter((a) => a.category.toLowerCase() === category.toLowerCase());
      if (query) return matchAgents(all, query, [], all.length).map((r) => r.agent);
      return all;
    },
    async getAgent(id) {
      return agents.find((a) => a.id === id);
    },
    async addAgent(input) {
      let id = slug(input.name) || crypto.randomUUID();
      if (agents.some((a) => a.id === id)) id = `${id}-${crypto.randomUUID().slice(0, 6)}`;
      const agent = AgentSchema.parse({ ...input, id, createdAt: now() });
      agents.push(agent);
      return agent;
    },
    async updateAgent(id, patch) {
      const i = agents.findIndex((a) => a.id === id);
      if (i < 0) throw new Error(`No agent "${id}"`);
      agents[i] = AgentSchema.parse({ ...agents[i], ...patch, id });
      return agents[i];
    },

    async listNotes(agentId) {
      return notes.filter((n) => n.agentId === agentId);
    },
    async upsertNote(n) {
      const note = { ...n, updatedAt: now() };
      const i = notes.findIndex((x) => x.agentId === n.agentId && x.slug === n.slug);
      if (i >= 0) notes[i] = note;
      else notes.push(note);
      return note;
    },
    async deleteNote(agentId, s) {
      const i = notes.findIndex((x) => x.agentId === agentId && x.slug === s);
      if (i >= 0) notes.splice(i, 1);
      return i >= 0;
    },

    async createUser(handle) {
      const h = normalizeHandle(handle);
      if (users.some((u) => u.handle === h)) throw new Error(`Handle "${h}" is taken.`);
      const apiKey = newApiKey();
      const user: User = { id: crypto.randomUUID(), handle: h, keyHash: hashKey(apiKey), createdAt: now() };
      users.push(user);
      return { user, apiKey };
    },
    async getUser(id) {
      return users.find((u) => u.id === id);
    },
    async userByApiKey(key) {
      const h = hashKey(key);
      return users.find((u) => u.keyHash === h);
    },
    async userForAuth({ authId, email, name }) {
      const found = users.find((u) => u.authId === authId);
      if (found) return found;
      const handle = handleCandidates({ email, name }).find((h) => !users.some((u) => u.handle === h));
      if (!handle) throw new Error("Could not pick a free handle.");
      const user: User = { id: crypto.randomUUID(), handle, authId, email, createdAt: now() };
      users.push(user);
      return user;
    },
    async rotateApiKey(userId) {
      const user = users.find((u) => u.id === userId);
      if (!user) throw new Error("No such user.");
      const apiKey = newApiKey();
      user.keyHash = hashKey(apiKey);
      return apiKey;
    },

    async saveConnector(c) {
      const i = connectors.findIndex((x) => x.name === c.name);
      if (i >= 0 && connectors[i].ownerId !== c.ownerId) throw new Error(`Connector "${c.name}" belongs to someone else.`);
      const conn: Connector = { ...c, createdAt: i >= 0 ? connectors[i].createdAt : now() };
      if (i >= 0) connectors[i] = conn;
      else connectors.push(conn);
      return conn;
    },
    async getConnector(name) {
      return connectors.find((c) => c.name === name);
    },
    async listConnectors(ownerId) {
      return connectors.filter((c) => c.ownerId === ownerId);
    },
    async setSecret(connector, name, ciphertext) {
      secrets.set(connector, { ...secrets.get(connector), [name]: ciphertext });
    },
    async getSecrets(connector) {
      return { ...secrets.get(connector) };
    },

    async requestAccess(agentId, requesterId, message = "") {
      const existing = requests.find((r) => r.agentId === agentId && r.requesterId === requesterId && r.status !== "denied");
      if (existing) return existing;
      const r: AccessRequest = { id: crypto.randomUUID(), agentId, requesterId, message, status: "pending", createdAt: now() };
      requests.push(r);
      return r;
    },
    async listAccessRequests({ ownerId, requesterId }) {
      const owned = new Set(agents.filter((a) => a.ownerId === ownerId).map((a) => a.id));
      return requests
        .filter((r) => (ownerId ? owned.has(r.agentId) : true) && (requesterId ? r.requesterId === requesterId : true))
        .reverse();
    },
    async decideAccessRequest(id, status) {
      const r = requests.find((x) => x.id === id);
      if (!r) throw new Error(`No access request "${id}"`);
      r.status = status;
      r.decidedAt = now();
      return r;
    },
    async hasAccess(agentId, userId) {
      const a = agents.find((x) => x.id === agentId);
      if (!a) return false;
      if (userId && a.ownerId === userId) return true;
      if (a.status !== "published") return false;
      if (a.visibility === "public") return true;
      return !!userId && requests.some((r) => r.agentId === agentId && r.requesterId === userId && r.status === "approved");
    },

    async listBottlenecks() {
      return [...bottlenecks].reverse();
    },
    async addBottleneck(input) {
      const published = agents.filter((a) => a.status === "published");
      const matches = matchAgents(published, input.description, input.tools);
      const b: Bottleneck = { ...input, id: crypto.randomUUID(), matchedAgentIds: matches.map((m) => m.agent.id), createdAt: now() };
      bottlenecks.push(b);
      return b;
    },
  };
}
