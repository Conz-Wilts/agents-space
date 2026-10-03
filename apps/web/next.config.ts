import type { NextConfig } from "next";

// One env file for the whole monorepo (repo-root .env.local / .env); app-level files still win.
for (const f of ["../../.env.local", "../../.env"]) {
  try {
    process.loadEnvFile(f);
  } catch {}
}

const nextConfig: NextConfig = {
  transpilePackages: ["@agents-space/core"],
};

export default nextConfig;
