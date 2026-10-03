import { matchAgents } from "../match";
import { AgentSchema, type Agent, type AccessRequest, type AgentSchedule, type Bottleneck, type Connector, type ContextNote, type DataTable, type DeviceLogin, type Model, type Payment, type Price, type TableRow, type User } from "../schema";
import type { Store } from "./index";
import { DEVICE_LOGIN_TTL_MS, RESERVED_HANDLES, handleCandidates, hashKey, newApiKey, newDeviceCode, newUserCode, normalizeHandle, normalizeUserCode, SPACE_CATEGORY, slug, spaceStatus, infoGate, useGate, passes } from "./util";

const now = () => new Date().toISOString();

/** In-memory store for local development without a database. Resets on restart. */
export function createMemoryStore(): Store {
  console.warn("[agents-space] DATABASE_URL not set — using the in-memory store (data resets on restart).");
  const agents: Agent[] = [];
  const notes: ContextNote[] = [];
  const tables: DataTable[] = [];
  const rows: TableRow[] = [];
  const schedules: AgentSchedule[] = [];
  const rowsOf = (agentId: string, table: string) => rows.filter((r) => r.agentId === agentId && r.table === table);
  const users: User[] = [];
  const connectors: Connector[] = [];
  const models: (Omit<Model, "hasKey"> & { key?: string })[] = [];
  const pubModel = ({ key, ...m }: (typeof models)[number]): Model => ({ ...m, hasKey: !!key });
  const secrets = new Map<string, Record<string, string>>();
  const requests: AccessRequest[] = [];
  const bottlenecks: Bottleneck[] = [];
  const prices: Price[] = [];
  const payments: Payment[] = [];
  const deviceLogins = new Map<string, DeviceLogin>(); // by device code hash
  const liveByUserCode = (code: string) => {
    const c = normalizeUserCode(code);
    return [...deviceLogins.values()].find((d) => d.userCode === c && d.expiresAt > now());
  };

  const approved = (agentId: string, userId?: string) =>
    !!userId && requests.some((r) => r.agentId === agentId && r.requesterId === userId && r.status === "approved");

  const rotateApiKey = async (userId: string) => {
    const user = users.find((u) => u.id === userId);
    if (!user) throw new Error("No such user.");
    const apiKey = newApiKey();
    user.keyHash = hashKey(apiKey);
    return apiKey;
  };

  return {
    async listAgents({ query, category, viewerId } = {}) {
      let all = agents.filter(
        (a) =>
          (viewerId && a.ownerId === viewerId) ||
          (a.status === "published" && a.mode !== "scheduled" && (a.visibility === "public" || a.visibility === "listed" || (a.visibility === "restricted" && approved(a.id, viewerId)))),
      );
      if (category) all = all.filter((a) => a.category.toLowerCase() === category.toLowerCase());
      if (query) return matchAgents(all, query, [], all.length).map((r) => r.agent);
      return all;
    },
    async getAgent(id) {
      return agents.find((a) => a.id === id);
    },
    async agentsOf(ownerId, { viewerId, category } = {}) {
      return agents
        .filter((a) => a.ownerId === ownerId && (!category || a.category.toLowerCase() === category.toLowerCase()))
        .filter((a) => passes(infoGate(a, viewerId), approved(a.id, viewerId)))
        .map((a) => ({ agent: a, access: passes(useGate(a, viewerId), approved(a.id, viewerId)) }));
    },
    async addAgent(input, opts) {
      let id = opts?.id ?? (slug(input.name) || crypto.randomUUID());
      const taken = agents.some((a) => a.id === id);
      if (opts?.id && taken) throw new Error(`"${id}" is taken.`);
      if (!opts?.id && (taken || RESERVED_HANDLES.has(id) || users.some((u) => u.handle === id))) id = `${id}-${crypto.randomUUID().slice(0, 6)}`;
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

    async listTables(agentId) {
      return tables.filter((t) => t.agentId === agentId);
    },
    async saveTable(t) {
      const table: DataTable = { ...t, builtIn: false, updatedAt: now() };
      const i = tables.findIndex((x) => x.agentId === t.agentId && x.name === t.name);
      if (i >= 0) tables[i] = table;
      else tables.push(table);
      return table;
    },
    async deleteTable(agentId, name) {
      const i = tables.findIndex((x) => x.agentId === agentId && x.name === name);
      if (i >= 0) tables.splice(i, 1);
      const before = rows.length;
      for (let j = rows.length - 1; j >= 0; j--) if (rows[j].agentId === agentId && rows[j].table === name) rows.splice(j, 1);
      return i >= 0 || rows.length < before;
    },
    async insertRows(agentId, table, input) {
      const added = input.map(({ data, createdBy }) => ({ id: crypto.randomUUID(), agentId, table, data, createdBy, createdAt: now(), updatedAt: now() }));
      rows.push(...added);
      return added;
    },
    async queryRows(agentId, table, { where = {}, createdBy, limit = 50, offset = 0, order = "desc" } = {}) {
      const hits = rowsOf(agentId, table).filter(
        (r) => (!createdBy || r.createdBy === createdBy) && Object.entries(where).every(([k, v]) => JSON.stringify(r.data[k]) === JSON.stringify(v)),
      );
      if (order === "desc") hits.reverse();
      return hits.slice(offset, offset + limit);
    },
    async countRows(agentId, table) {
      return rowsOf(agentId, table).length;
    },
    async getRow(agentId, table, id) {
      return rowsOf(agentId, table).find((r) => r.id === id);
    },
    async updateRow(agentId, table, id, data) {
      const r = rowsOf(agentId, table).find((x) => x.id === id);
      if (!r) throw new Error(`No row "${id}" in ${table}.`);
      r.data = data;
      r.updatedAt = now();
      return r;
    },
    async deleteRow(agentId, table, id) {
      const i = rows.findIndex((r) => r.agentId === agentId && r.table === table && r.id === id);
      if (i >= 0) rows.splice(i, 1);
      return i >= 0;
    },

    async listSchedules(agentId) {
      return schedules.filter((x) => x.agentId === agentId).map((x) => ({ ...x }));
    },
    async getSchedule(id) {
      const sc = schedules.find((x) => x.id === id);
      return sc && { ...sc };
    },
    async addSchedule(input) {
      const sc = { ...input, id: crypto.randomUUID(), createdAt: now() };
      schedules.push(sc);
      return { ...sc };
    },
    async updateSchedule(id, patch) {
      const sc = schedules.find((x) => x.id === id);
      if (!sc) throw new Error(`No schedule "${id}".`);
      return { ...Object.assign(sc, patch) };
    },
    async deleteSchedule(id) {
      const i = schedules.findIndex((x) => x.id === id);
      if (i >= 0) schedules.splice(i, 1);
      return i >= 0;
    },
    async dueSchedules(at, limit) {
      return schedules
        .filter((x) => x.enabled && x.nextRunAt <= at)
        .sort((a, b) => a.nextRunAt.localeCompare(b.nextRunAt))
        .slice(0, limit)
        .map((x) => ({ ...x }));
    },
    async claimSchedule(id, from, next) {
      const sc = schedules.find((x) => x.id === id);
      if (!sc || sc.nextRunAt !== from) return false;
      sc.nextRunAt = next;
      return true;
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
    async userByHandle(handle) {
      return users.find((u) => u.handle === handle);
    },
    async setHandle(userId, handle) {
      const h = normalizeHandle(handle);
      const user = users.find((u) => u.id === userId);
      if (!user) throw new Error("No such user.");
      if (users.some((u) => u.handle === h && u.id !== userId)) throw new Error(`Handle "${h}" is taken.`);
      user.handle = h;
      return user;
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
    async listUsers({ query, limit, cursor }) {
      const q = query?.toLowerCase();
      return users
        .filter((u) => (!q || u.handle.includes(q)) && (!cursor || u.handle > cursor))
        .sort((a, b) => (a.handle < b.handle ? -1 : a.handle > b.handle ? 1 : 0))
        .slice(0, limit);
    },
    async spaceStatuses(list, viewerId) {
      const out = new Map<string, "open" | "request access">();
      for (const u of list) {
        const a = agents.find((x) => x.id === u.handle);
        if (!a || a.ownerId !== u.id || a.kind !== "hosted" || a.category !== SPACE_CATEGORY) continue;
        const s = spaceStatus(a, viewerId, approved(a.id, viewerId));
        if (s) out.set(u.handle, s);
      }
      return out;
    },
    rotateApiKey,

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

    async saveModel(m) {
      const i = models.findIndex((x) => x.name === m.name);
      if (i >= 0 && models[i].ownerId !== m.ownerId) throw new Error(`Model "${m.name}" belongs to someone else.`);
      const row = { ...m, key: i >= 0 ? models[i].key : undefined, createdAt: i >= 0 ? models[i].createdAt : now() };
      if (i >= 0) models[i] = row;
      else models.push(row);
      return pubModel(row);
    },
    async getModel(name) {
      const m = models.find((x) => x.name === name);
      return m && pubModel(m);
    },
    async listModels(ownerId) {
      return models.filter((m) => m.ownerId === ownerId).map(pubModel);
    },
    async deleteModel(name) {
      const i = models.findIndex((x) => x.name === name);
      if (i < 0) return false;
      models.splice(i, 1);
      for (const a of agents) if (a.model === name) a.model = undefined;
      return true;
    },
    async setModelKey(name, ciphertext) {
      const m = models.find((x) => x.name === name);
      if (!m) throw new Error(`No model "${name}".`);
      m.key = ciphertext;
    },
    async getModelKey(name) {
      return models.find((x) => x.name === name)?.key;
    },

    async setStripeAccount(userId, accountId) {
      const user = users.find((u) => u.id === userId);
      if (!user) throw new Error("No such user.");
      user.stripeAccountId = accountId;
      return user;
    },
    async setAvatar(userId, url) {
      const user = users.find((u) => u.id === userId);
      if (user) user.avatarUrl = url;
    },

    async listPrices(agentId) {
      return prices.filter((p) => p.agentId === agentId);
    },
    async upsertPrice(price) {
      const next = { ...price, updatedAt: now() };
      const i = prices.findIndex((p) => p.agentId === price.agentId && p.name === price.name);
      if (i >= 0) prices[i] = next;
      else prices.push(next);
      return next;
    },
    async deletePrice(agentId, name) {
      const i = prices.findIndex((p) => p.agentId === agentId && p.name === name);
      if (i >= 0) prices.splice(i, 1);
      return i >= 0;
    },

    async addPayment(p) {
      const payment: Payment = { ...p, id: crypto.randomUUID(), status: "open", createdAt: now() };
      payments.push(payment);
      return payment;
    },
    async getPayment(id) {
      return payments.find((p) => p.id === id);
    },
    async setPaymentStatus(id, status) {
      const p = payments.find((x) => x.id === id);
      if (!p) throw new Error(`No payment "${id}"`);
      p.status = status;
      if (status === "paid") p.paidAt ??= now();
      return p;
    },
    async listPayments({ agentId, payerId }) {
      return payments.filter((p) => (!agentId || p.agentId === agentId) && (!payerId || p.payerId === payerId)).reverse();
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
      return !!a && passes(useGate(a, userId), approved(agentId, userId));
    },
    async canSeeInfo(agentId, userId) {
      const a = agents.find((x) => x.id === agentId);
      return !!a && passes(infoGate(a, userId), approved(agentId, userId));
    },

    async startDeviceLogin(clientName) {
      for (const [k, d] of deviceLogins) if (d.expiresAt <= now()) deviceLogins.delete(k);
      let userCode = newUserCode();
      while ([...deviceLogins.values()].some((d) => d.userCode === userCode)) userCode = newUserCode();
      const deviceCode = newDeviceCode();
      const expiresAt = new Date(Date.now() + DEVICE_LOGIN_TTL_MS).toISOString();
      deviceLogins.set(hashKey(deviceCode), { userCode, status: "pending", clientName: clientName?.trim().slice(0, 60) || undefined, createdAt: now(), expiresAt });
      return { deviceCode, userCode, expiresAt };
    },
    async getDeviceLogin(userCode) {
      return liveByUserCode(userCode);
    },
    async decideDeviceLogin(userCode, userId, decision) {
      const d = liveByUserCode(userCode);
      if (!d || d.status !== "pending") return false;
      d.status = decision;
      d.userId = userId;
      return true;
    },
    async redeemDeviceLogin(deviceCode) {
      const key = hashKey(deviceCode);
      const d = deviceLogins.get(key);
      if (!d || d.expiresAt <= now()) {
        deviceLogins.delete(key);
        return { status: "expired" };
      }
      if (d.status === "pending") return { status: "pending" };
      deviceLogins.delete(key);
      if (d.status === "denied" || !d.userId) return { status: "denied" };
      const user = users.find((u) => u.id === d.userId);
      if (!user) return { status: "expired" };
      const apiKey = await rotateApiKey(user.id);
      return { status: "approved", apiKey, user };
    },

    async listBottlenecks() {
      return [...bottlenecks].reverse();
    },
    async addBottleneck(input) {
      const published = agents.filter((a) => a.status === "published" && (a.visibility === "public" || a.visibility === "listed"));
      const matches = matchAgents(published, input.description, input.tools);
      const b: Bottleneck = { ...input, id: crypto.randomUUID(), matchedAgentIds: matches.map((m) => m.agent.id), createdAt: now() };
      bottlenecks.push(b);
      return b;
    },
  };
}
