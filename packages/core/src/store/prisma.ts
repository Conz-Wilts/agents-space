import { PrismaPg } from "@prisma/adapter-pg";
import { Prisma, PrismaClient } from "../generated/prisma/client";
import { matchAgents } from "../match";
import { AgentSchema, ConnectorActionSchema, type AccessRequest, type Agent, type Bottleneck, type Connector, type ContextNote, type DeviceLogin, type User } from "../schema";
import type { Store } from "./index";
import { DEVICE_LOGIN_TTL_MS, RESERVED_HANDLES, handleCandidates, hashKey, newApiKey, newDeviceCode, newUserCode, normalizeHandle, normalizeUserCode, slug } from "./util";

const agentInclude = { connectors: true } satisfies Prisma.AgentInclude;
type AgentRow = Prisma.AgentGetPayload<{ include: typeof agentInclude }>;

const iso = (d: Date) => d.toISOString();

function toAgent(r: AgentRow): Agent {
  const { connectors, ownerUser: _u, createdAt, endpoint, ownerId, ...rest } = r as AgentRow & { ownerUser?: unknown };
  return AgentSchema.parse({
    ...rest,
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
  createdAt: iso(r.createdAt),
});

const toNote = (r: { agentId: string; slug: string; title: string; body: string; updatedAt: Date }): ContextNote => ({ ...r, updatedAt: iso(r.updatedAt) });

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
function agentData<T extends Partial<Agent>>(a: T): Omit<T, "connectors" | "id" | "createdAt" | "ownerId"> {
  const { connectors: _c, id: _i, createdAt: _t, ownerId: _o, ...cols } = a;
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
            { status: "published" as const, visibility: { in: ["public" as const, "listed" as const] } },
            ...(viewerId
              ? [
                  { ownerId: viewerId },
                  { status: "published" as const, visibility: "restricted" as const, accessRequests: { some: { requesterId: viewerId, status: "approved" as const } } },
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
        return tx.agent.update({ where: { id }, data: agentData(next), include: agentInclude });
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
      const a = await db.agent.findUnique({ where: { id: agentId }, select: { ownerId: true, status: true, visibility: true } });
      if (!a) return false;
      if (userId && a.ownerId === userId) return true;
      if (a.status !== "published") return false;
      if (a.visibility === "public") return true;
      if (a.visibility === "private") return false;
      return approved(agentId, userId);
    },
    async canSeeInfo(agentId, userId) {
      const a = await db.agent.findUnique({ where: { id: agentId }, select: { ownerId: true, status: true, visibility: true } });
      if (!a) return false;
      if (userId && a.ownerId === userId) return true;
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
