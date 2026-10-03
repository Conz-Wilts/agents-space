// Copies files that live outside apps/web into public/ before a build (Vercel's root dir is
// apps/web, but the whole repo is checked out): the CLI script and the agents-space skill.
import { copyFileSync, mkdirSync } from "node:fs";

const copies = [
  ["../../packages/cli/agents-space.mjs", "public/cli.mjs"],
  ["../../skills/agents-space/SKILL.md", "public/skill.md"],
  ["../../skills/agents-space/reference.md", "public/skill/reference.md"],
];

mkdirSync("public/skill", { recursive: true });
for (const [from, to] of copies) copyFileSync(from, to);
