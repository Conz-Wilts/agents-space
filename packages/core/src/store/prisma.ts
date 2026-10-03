import { PrismaPg } from "@prisma/adapter-pg";
import { Prisma, PrismaClient } from "../generated/prisma/client";
import { matchAgents } from "../match";
import { ModelSchema, AgentSchema, AgentScheduleSchema, CallerAccessSchema, ConnectorActionSchema, TableColumnSchema, type AccessRequest, type Agent, type AgentSchedule, type Bottleneck, type Connector, type ContextNote, type DataTable, type DeviceLogin, type Model, type Payment, type Price, type TableRow, type User } from "../schema";
import type { Store } from "./index";
import { DEVICE_LOGIN_TTL_MS, RESERVED_HANDLES, handleCandidates, hashKey, newApiKey, newDeviceCode, newUserCode, normalizeHandle, normalizeUserCode, slug } from "./util";

const agentInclude = { connectors: true } satisfies Prisma.AgentInclude;
type AgentRow = Prisma.AgentGetPayload<{ include: typeof agentInclude }>;

const iso = (d: Date) => d.toISOString();

function toAgent(r: AgentRow): Agent {
  const { connectors, ownerUser: _u, createdAt, endpoint, ownerId, model, ...rest } = r as AgentRow & { ownerUser?: unknown };
  return AgentSchema.parse({
    ...rest,
    model: model ?? undefined,
    endpoint: endpoint ?? undefined,
    ownerId: ownerId ?? undefined,
    createdAt: iso(createdAt),
    connectors: connectors.map((c) => ({ connector: c.connectorName, actions: c.actions })),
  });
}

const toUser = (r: Prisma.UserGetPayload<object>): User => ({
  id: r.id,
  handle: r.handle,
  keyHash: r.keyHash ?? undefined,
  authId: r.authId ?? undefined,
  email: r.email ?? undefined,
  stripeAccountId: r.stripeAccountId ?? undefined,
  createdAt: iso(r.createdAt),
});

const toPrice = (r: Prisma.PriceGetPayload<object>): Price => ({ ...r, updatedAt: iso(r.updatedAt) });

const toPayment = (r: Prisma.PaymentGetPayload<object>): Payment => ({
  ...r,
  payerId: r.payerId ?? undefined,
  status: r.status as Payment["status"],
  createdAt: iso(r.createdAt),
  paidAt: r.paidAt ? iso(r.paidAt) : undefined,
});

const toNote = (r: { agentId: string; slug: string; title: string; body: string; updatedAt: Date }): ContextNote => ({ ...r, updatedAt: iso(r.updatedAt) });

const toTable = (r: Prisma.AgentTableGetPayload<object>): DataTable => ({
  agentId: r.agentId,
  name: r.name,
  title: r.title,
  context: r.context,
  columns: TableColumnSchema.array().parse(r.columns),
  callerAccess: CallerAccessSchema.parse(r.callerAccess),
  builtIn: false,
  updatedAt: iso(r.updatedAt),
});

const toSchedule = (r: Prisma.AgentScheduleGetPayload<object>): AgentSchedule =>
  AgentScheduleSchema.parse({
    ...r,
    nextRunAt: iso(r.nextRunAt),
    lastRunAt: r.lastRunAt ? iso(r.lastRunAt) : undefined,
    lastStatus: r.lastStatus ?? undefined,
    lastResult: r.lastResult ?? undefined,
    createdAt: iso(r.createdAt),
  });

/** Schedule fields as Prisma data: ISO strings become Dates. */
function scheduleData(p: Partial<AgentSchedule>) {
  const { id: _i, agentId: _a, createdAt: _c, nextRunAt, lastRunAt, ...rest } = p;
  return { ...rest, ...(nextRunAt ? { nextRunAt: new Date(nextRunAt) } : {}), ...(lastRunAt ? { lastRunAt: new Date(lastRunAt) } : {}) };
}

const toRow = (r: Prisma.TableRowGetPayload<object>): TableRow => ({
  id: r.id,
  agentId: r.agentId,
  table: r.tableName,
  data: (r.data ?? {}) as Record<string, unknown>,
  createdBy: r.createdBy ?? undefined,
  createdAt: iso(r.createdAt),
  updatedAt: iso(r.updatedAt),
});

function toConnector(r: Prisma.ConnectorGetPayload<object>): Connector {
  return {
    name: r.name,
    ownerId: r.ownerId,
    title: r.title,
    description: r.description,
    hosts: r.hosts,
    secrets: r.secrets,
    actions: ConnectorActionSchema.array().parse(r.actions),
    createdAt: iso(r.createdAt),
  };
}

const toModel = (r: Prisma.AiModelGetPayload<object>): Model =>
  ModelSchema.parse({
    name: r.name,
    ownerId: r.ownerId,
    title: r.title,
    provider: r.provider,
    model: r.modelId,
    baseUrl: r.baseUrl ?? undefined,
    hasKey: !!r.keyCiphertext,
    createdAt: iso(r.createdAt),
  });

function toRequest(r: Prisma.AccessRequestGetPayload<object>): AccessRequest {
  return { ...r, createdAt: iso(r.createdAt), decidedAt: r.decidedAt ? iso(r.decidedAt) : undefined };
}

const toDeviceLogin = (r: Prisma.DeviceLoginGetPayload<object>): DeviceLogin => ({
  userCode: r.userCode,
  status: r.status as DeviceLogin["status"],
  userId: r.userId ?? undefined,
  clientName: r.clientName ?? undefined,
  createdAt: iso(r.createdAt),
  expiresAt: iso(r.expiresAt),
});

const toBottleneck = (r: Prisma.BottleneckGetPayload<object>): Bottleneck => ({
  ...r,
  hoursPerWeek: r.hoursPerWeek ?? undefined,
  createdAt: iso(r.createdAt),
});

/** Columns of an Agent (minus relations/id) from a domain object or patch. */
function agentData<T extends Partial<Agent>>(a: T): Omit<T, "connectors" | "id" | "createdAt" | "ownerId" | "model"> {
  const { connectors: _c, id: _i, createdAt: _t, ownerId: _o, model: _m, ...cols } = a;
  return cols;
}

/** Prisma on Supabase Postgres. Use the pooled connection string (port 6543) as DATABASE_URL. */
export function createPrismaStore(connectionString: string): Store {
  const db = new PrismaClient({ adapter: new PrismaPg({ connectionString, max: 5 }) });

  const getAgent = async (id: string) => {
    const r = await db.agent.findUnique({ where: { id }, include: agentInclude });
    return r ? toAgent(r) : undefined;
  };

  const approved = async (agentId: string, userId?: string) =>
    !!userId && !!(await db.accessRequest.findFirst({ where: { agentId, requesterId: userId, status: "approved" }, select: { id: true } }));

  const rotateApiKey = async (userId: string) => {
    const apiKey = newApiKey();
    await db.user.update({ where: { id: userId }, data: { keyHash: hashKey(apiKey) } });
    return apiKey;
  };

  return {
    async listAgents({ query, category, viewerId } = {}) {
      const rows = await db.agent.findMany({
        where: {
          OR: [
            { status: "published" as const, mode: "skill", visibility: { in: ["public" as const, "listed" as const] } },
            ...(viewerId
              ? [
                  { ownerId: viewerId },
                  { status: "published" as const, mode: "skill", visibility: "restricted" as const, accessRequests: { some: { requesterId: viewerId, status: "approved" as const } } },
                ]
              : []),
          ],
          ...(category ? { category: { equals: category, mode: "insensitive" as const } } : {}),
        },
        include: agentInclude,
        orderBy: { createdAt: "asc" },
      });
      const all = rows.map(toAgent);
      if (query) return matchAgents(all, query, [], all.length).map((r) => r.agent);
      return all;
    },
    getAgent,
    async addAgent(input, opts) {
      const parsed = AgentSchema.parse({ ...input, id: "_", createdAt: new Date().toISOString() });
      let id = opts?.id ?? (slug(parsed.name) || crypto.randomUUID());
      // An explicit id (a space's handle) must be free; the create below throws P2002 if not.
      if (
        !opts?.id &&
        (RESERVED_HANDLES.has(id) ||
          (await db.agent.findUnique({ where: { id }, select: { id: true } })) ||
          (await db.user.findUnique({ where: { handle: id }, select: { id: true } })))
      )
        id = `${id}-${crypto.randomUUID().slice(0, 6)}`;
      try {
        const r = await db.agent.create({
          data: {
            ...agentData(parsed),
            id,
            ...(parsed.ownerId ? { ownerUser: { connect: { id: parsed.ownerId } } } : {}),
            ...(parsed.model ? { modelRef: { connect: { name: parsed.model } } } : {}),
            connectors: { create: parsed.connectors.map((c) => ({ connectorName: c.connector, actions: c.actions })) },
          },
          include: agentInclude,
        });
        return toAgent(r);
      } catch (e) {
        if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") throw new Error(`"${id}" is taken.`);
        throw e;
      }
    },
    async updateAgent(id, patch) {
      const current = await getAgent(id);
      if (!current) throw new Error(`No agent "${id}"`);
      const next = AgentSchema.parse({ ...current, ...patch, id });
      const r = await db.$transaction(async (tx) => {
        if (patch.connectors) {
          await tx.agentConnector.deleteMany({ where: { agentId: id } });
          await tx.agentConnector.createMany({ data: next.connectors.map((c) => ({ agentId: id, connectorName: c.connector, actions: c.actions })) });
        }
        return tx.agent.update({ where: { id }, data: { ...agentData(next), model: next.model ?? null }, include: agentInclude });
      });
      return toAgent(r);
    },

    async listNotes(agentId) {
      return (await db.contextNote.findMany({ where: { agentId }, orderBy: { title: "asc" } })).map(toNote);
    },
    async upsertNote({ agentId, slug: s, title, body }) {
      const r = await db.contextNote.upsert({
        where: { agentId_slug: { agentId, slug: s } },
        create: { agentId, slug: s, title, body },
        update: { title, body },
      });
      return toNote(r);
    },
    async deleteNote(agentId, s) {
      const { count } = await db.contextNote.deleteMany({ where: { agentId, slug: s } });
      return count > 0;
    },

    async listTables(agentId) {
      return (await db.agentTable.findMany({ where: { agentId }, orderBy: { createdAt: "asc" } })).map(toTable);
    },
    async saveTable({ agentId, name, title, context, columns, callerAccess }) {
      const data = { title, context, columns: columns as Prisma.InputJsonValue, callerAccess };
      return toTable(await db.agentTable.upsert({ where: { agentId_name: { agentId, name } }, create: { ...data, agentId, name }, update: data }));
    },
    async deleteTable(agentId, name) {
      const [rowsGone, tablesGone] = await db.$transaction([
        db.tableRow.deleteMany({ where: { agentId, tableName: name } }),
        db.agentTable.deleteMany({ where: { agentId, name } }),
      ]);
      return rowsGone.count + tablesGone.count > 0;
    },
    async insertRows(agentId, table, input) {
      const created = await db.$transaction(
        input.map(({ data, createdBy }) => db.tableRow.create({ data: { agentId, tableName: table, data: data as Prisma.InputJsonValue, createdBy } })),
      );
      return created.map(toRow);
    },
    async queryRows(agentId, table, { where = {}, createdBy, limit = 50, offset = 0, order = "desc" } = {}) {
      const rows = await db.tableRow.findMany({
        where: {
          agentId,
          tableName: table,
          ...(createdBy ? { createdBy } : {}),
          AND: Object.entries(where).map(([k, v]) => ({ data: { path: [k], equals: v as Prisma.InputJsonValue } })),
        },
        orderBy: [{ createdAt: order }, { id: order }],
        take: limit,
        skip: offset,
      });
      return rows.map(toRow);
    },
    async countRows(agentId, table) {
      return db.tableRow.count({ where: { agentId, tableName: table } });
    },
    async getRow(agentId, table, id) {
      const r = await db.tableRow.findFirst({ where: { id, agentId, tableName: table } });
      return r ? toRow(r) : undefined;
    },
    async updateRow(agentId, table, id, data) {
      const { count } = await db.tableRow.updateMany({ where: { id, agentId, tableName: table }, data: { data: data as Prisma.InputJsonValue } });
      if (!count) throw new Error(`No row "${id}" in ${table}.`);
      return toRow((await db.tableRow.findUnique({ where: { id } }))!);
    },
    async deleteRow(agentId, table, id) {
      const { count } = await db.tableRow.deleteMany({ where: { id, agentId, tableName: table } });
      return count > 0;
    },

    async listSchedules(agentId) {
      return (await db.agentSchedule.findMany({ where: { agentId }, orderBy: { createdAt: "asc" } })).map(toSchedule);
    },
    async getSchedule(id) {
      const r = await db.agentSchedule.findUnique({ where: { id } });
      return r ? toSchedule(r) : undefined;
    },
    async addSchedule(input) {
      const { agentId, task, cron, timezone, enabled, nextRunAt } = input;
      return toSchedule(await db.agentSchedule.create({ data: { agentId, task, cron, timezone, enabled, nextRunAt: new Date(nextRunAt) } }));
    },
    async updateSchedule(id, patch) {
      try {
        return toSchedule(await db.agentSchedule.update({ where: { id }, data: scheduleData(patch) }));
      } catch (e) {
        if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2025") throw new Error(`No schedule "${id}".`);
        throw e;
      }
    },
    async deleteSchedule(id) {
      return (await db.agentSchedule.deleteMany({ where: { id } })).count > 0;
    },
    async dueSchedules(at, limit) {
      const rows = await db.agentSchedule.findMany({ where: { enabled: true, nextRunAt: { lte: new Date(at) } }, orderBy: { nextRunAt: "asc" }, take: limit });
      return rows.map(toSchedule);
    },
    async claimSchedule(id, from, next) {
      const { count } = await db.agentSchedule.updateMany({ where: { id, nextRunAt: new Date(from) }, data: { nextRunAt: new Date(next) } });
      return count === 1;
    },

    async createUser(handle) {
      const h = normalizeHandle(handle);
      const apiKey = newApiKey();
      try {
        const r = await db.user.create({ data: { handle: h, keyHash: hashKey(apiKey) } });
        return { user: toUser(r), apiKey };
      } catch (e) {
        if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") throw new Error(`Handle "${h}" is taken.`);
        throw e;
      }
    },
    async getUser(id) {
      const r = await db.user.findUnique({ where: { id } });
      return r ? toUser(r) : undefined;
    },
    async userByApiKey(key) {
      const r = await db.user.findUnique({ where: { keyHash: hashKey(key) } });
      return r ? toUser(r) : undefined;
    },
    async userByHandle(handle) {
      const r = await db.user.findUnique({ where: { handle } });
      return r ? toUser(r) : undefined;
    },
    async setHandle(userId, handle) {
      const h = normalizeHandle(handle);
      try {
        return toUser(await db.user.update({ where: { id: userId }, data: { handle: h } }));
      } catch (e) {
        if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") throw new Error(`Handle "${h}" is taken.`);
        throw e;
      }
    },
    async userForAuth({ authId, email, name }) {
      const found = await db.user.findUnique({ where: { authId } });
      if (found) return toUser(found);
      for (const handle of handleCandidates({ email, name })) {
        try {
          return toUser(await db.user.create({ data: { handle, authId, email } }));
        } catch (e) {
          if (!(e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002")) throw e;
          // Lost a race on authId (concurrent first sign-in): return the winner.
          const again = await db.user.findUnique({ where: { authId } });
          if (again) return toUser(again);
        }
      }
      throw new Error("Could not pick a free handle.");
    },
    rotateApiKey,

    async saveConnector(c) {
      const existing = await db.connector.findUnique({ where: { name: c.name }, select: { ownerId: true } });
      if (existing && existing.ownerId !== c.ownerId) throw new Error(`Connector "${c.name}" belongs to someone else.`);
      const data = {
        title: c.title,
        description: c.description,
        hosts: c.hosts,
        secrets: c.secrets,
        actions: c.actions as Prisma.InputJsonValue,
      };
      const r = await db.connector.upsert({ where: { name: c.name }, create: { ...data, name: c.name, ownerId: c.ownerId }, update: data });
      return toConnector(r);
    },
    async getConnector(name) {
      const r = await db.connector.findUnique({ where: { name } });
      return r ? toConnector(r) : undefined;
    },
    async listConnectors(ownerId) {
      return (await db.connector.findMany({ where: { ownerId }, orderBy: { createdAt: "asc" } })).map(toConnector);
    },
    async setSecret(connectorName, name, ciphertext) {
      await db.connectorSecret.upsert({
        where: { connectorName_name: { connectorName, name } },
        create: { connectorName, name, ciphertext },
        update: { ciphertext },
      });
    },
    async getSecrets(connectorName) {
      const rows = await db.connectorSecret.findMany({ where: { connectorName } });
      return Object.fromEntries(rows.map((r) => [r.name, r.ciphertext]));
    },

    async saveModel(m) {
      const existing = await db.aiModel.findUnique({ where: { name: m.name }, select: { ownerId: true } });
      if (existing && existing.ownerId !== m.ownerId) throw new Error(`Model "${m.name}" belongs to someone else.`);
      const data = { title: m.title, provider: m.provider, modelId: m.model, baseUrl: m.baseUrl ?? null };
      return toModel(await db.aiModel.upsert({ where: { name: m.name }, create: { ...data, name: m.name, ownerId: m.ownerId }, update: data }));
    },
    async getModel(name) {
      const r = await db.aiModel.findUnique({ where: { name } });
      return r ? toModel(r) : undefined;
    },
    async listModels(ownerId) {
      return (await db.aiModel.findMany({ where: { ownerId }, orderBy: { createdAt: "asc" } })).map(toModel);
    },
    async deleteModel(name) {
      return (await db.aiModel.deleteMany({ where: { name } })).count > 0;
    },
    async setModelKey(name, ciphertext) {
      await db.aiModel.update({ where: { name }, data: { keyCiphertext: ciphertext } });
    },
    async getModelKey(name) {
      return (await db.aiModel.findUnique({ where: { name }, select: { keyCiphertext: true } }))?.keyCiphertext ?? undefined;
    },

    async setStripeAccount(userId, accountId) {
      return toUser(await db.user.update({ where: { id: userId }, data: { stripeAccountId: accountId ?? null } }));
    },

    async listPrices(agentId) {
      return (await db.price.findMany({ where: { agentId }, orderBy: { amount: "asc" } })).map(toPrice);
    },
    async upsertPrice({ agentId, name, ...data }) {
      return toPrice(await db.price.upsert({ where: { agentId_name: { agentId, name } }, create: { agentId, name, ...data }, update: data }));
    },
    async deletePrice(agentId, name) {
      const { count } = await db.price.deleteMany({ where: { agentId, name } });
      return count > 0;
    },

    async addPayment(p) {
      return toPayment(await db.payment.create({ data: p }));
    },
    async getPayment(id) {
      const r = await db.payment.findUnique({ where: { id } });
      return r ? toPayment(r) : undefined;
    },
    async setPaymentStatus(id, status) {
      const r = await db.payment.findUnique({ where: { id } });
      if (!r) throw new Error(`No payment "${id}"`);
      return toPayment(await db.payment.update({ where: { id }, data: { status, ...(status === "paid" && !r.paidAt ? { paidAt: new Date() } : {}) } }));
    },
    async listPayments({ agentId, payerId }) {
      const rows = await db.payment.findMany({ where: { ...(agentId ? { agentId } : {}), ...(payerId ? { payerId } : {}) }, orderBy: { createdAt: "desc" }, take: 100 });
      return rows.map(toPayment);
    },

    async requestAccess(agentId, requesterId, message = "") {
      const existing = await db.accessRequest.findFirst({ where: { agentId, requesterId, status: { not: "denied" } } });
      if (existing) return toRequest(existing);
      return toRequest(await db.accessRequest.create({ data: { agentId, requesterId, message } }));
    },
    async listAccessRequests({ ownerId, requesterId }) {
      const rows = await db.accessRequest.findMany({
        where: { ...(ownerId ? { agent: { ownerId } } : {}), ...(requesterId ? { requesterId } : {}) },
        orderBy: { createdAt: "desc" },
      });
      return rows.map(toRequest);
    },
    async decideAccessRequest(id, status) {
      try {
        return toRequest(await db.accessRequest.update({ where: { id }, data: { status, decidedAt: new Date() } }));
      } catch (e) {
        if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2025") throw new Error(`No access request "${id}"`);
        throw e;
      }
    },
    async hasAccess(agentId, userId) {
      const a = await db.agent.findUnique({ where: { id: agentId }, select: { ownerId: true, status: true, visibility: true, mode: true } });
      if (!a) return false;
      if (userId && a.ownerId === userId) return true;
      if (a.status !== "published" || a.mode === "scheduled") return false;
      if (a.visibility === "public") return true;
      if (a.visibility === "private") return false;
      return approved(agentId, userId);
    },
    async canSeeInfo(agentId, userId) {
      const a = await db.agent.findUnique({ where: { id: agentId }, select: { ownerId: true, status: true, visibility: true, mode: true } });
      if (!a) return false;
      if (userId && a.ownerId === userId) return true;
      if (a.mode === "scheduled") return false;
      if (a.status !== "published") return false;
      if (a.visibility === "public" || a.visibility === "listed") return true;
      return a.visibility === "restricted" && approved(agentId, userId);
    },

    async startDeviceLogin(clientName) {
      await db.deviceLogin.deleteMany({ where: { expiresAt: { lt: new Date() } } });
      const deviceCode = newDeviceCode();
      const expiresAt = new Date(Date.now() + DEVICE_LOGIN_TTL_MS);
      for (let attempt = 0; attempt < 5; attempt++) {
        const userCode = newUserCode();
        try {
          await db.deviceLogin.create({
            data: { deviceCodeHash: hashKey(deviceCode), userCode, clientName: clientName?.trim().slice(0, 60) || null, expiresAt },
          });
          return { deviceCode, userCode, expiresAt: iso(expiresAt) };
        } catch (e) {
          if (!(e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002")) throw e;
        }
      }
      throw new Error("Could not allocate a device code.");
    },
    async getDeviceLogin(userCode) {
      const code = normalizeUserCode(userCode);
      if (!code) return undefined;
      const r = await db.deviceLogin.findFirst({ where: { userCode: code, expiresAt: { gt: new Date() } } });
      return r ? toDeviceLogin(r) : undefined;
    },
    async decideDeviceLogin(userCode, userId, decision) {
      const code = normalizeUserCode(userCode);
      if (!code) return false;
      const { count } = await db.deviceLogin.updateMany({
        where: { userCode: code, status: "pending", expiresAt: { gt: new Date() } },
        data: { status: decision, userId },
      });
      return count === 1;
    },
    async redeemDeviceLogin(deviceCode) {
      const deviceCodeHash = hashKey(deviceCode);
      const r = await db.deviceLogin.findUnique({ where: { deviceCodeHash } });
      if (!r || r.expiresAt <= new Date()) return { status: "expired" };
      if (r.status === "pending") return { status: "pending" };
      // Delete first: only one concurrent poll sees count === 1 and gets the key.
      const { count } = await db.deviceLogin.deleteMany({ where: { deviceCodeHash, status: r.status } });
      if (count !== 1) return { status: "expired" };
      if (r.status === "denied" || !r.userId) return { status: "denied" };
      const user = await db.user.findUnique({ where: { id: r.userId } });
      if (!user) return { status: "expired" };
      const apiKey = await rotateApiKey(user.id);
      return { status: "approved", apiKey, user: toUser({ ...user, keyHash: hashKey(apiKey) }) };
    },

    async listBottlenecks() {
      return (await db.bottleneck.findMany({ orderBy: { createdAt: "desc" }, take: 100 })).map(toBottleneck);
    },
    async addBottleneck(input) {
      const published = (await db.agent.findMany({ where: { status: "published", visibility: { in: ["public", "listed"] } }, include: agentInclude })).map(toAgent);
      const matches = matchAgents(published, input.description, input.tools);
      const r = await db.bottleneck.create({ data: { ...input, matchedAgentIds: matches.map((m) => m.agent.id) } });
      return toBottleneck(r);
    },
  };
}
