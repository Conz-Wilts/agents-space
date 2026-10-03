// `pnpm db:seed` — upserts the example external listings so the directory isn't empty.
import { config } from "dotenv";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { seedAgents } from "../src/seed";

config({ path: ["../../.env.local", "../../.env"], quiet: true });

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DIRECT_URL ?? process.env.DATABASE_URL }) });

for (const { connectors: _c, ownerId: _o, createdAt, ...a } of seedAgents) {
  const data = { ...a, createdAt: new Date(createdAt) };
  await db.agent.upsert({ where: { id: a.id }, create: data, update: data });
}
console.log(`Seeded ${seedAgents.length} agents.`);
await db.$disconnect();
