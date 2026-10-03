import { config } from "dotenv";
import { defineConfig } from "prisma/config";

// Env lives at the repo root (.env / .env.local), shared by both apps.
config({ path: ["../../.env.local", "../../.env"], quiet: true });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Supabase: migrations need the direct (session) connection; the app uses the pooled DATABASE_URL.
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL,
  },
});
