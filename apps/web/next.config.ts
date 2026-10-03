import type { NextConfig } from "next";

// One env file for the whole monorepo (repo-root .env.local / .env); app-level files still win.
for (const f of ["../../.env.local", "../../.env"]) {
  try {
    process.loadEnvFile(f);
  } catch {}
}

const nextConfig: NextConfig = {
  transpilePackages: ["@agents-space/core"],
  // The agents-space skill (copied into public/ by scripts/copy-static.mjs), served as markdown.
  async headers() {
    const markdown = [
      { key: "content-type", value: "text/markdown; charset=utf-8" },
      { key: "cache-control", value: "public, max-age=300" },
    ];
    return [
      { source: "/skill.md", headers: markdown },
      { source: "/skill/reference.md", headers: markdown },
    ];
  },
};

export default nextConfig;
