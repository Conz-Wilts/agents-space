import { createHash, randomBytes } from "node:crypto";

export const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
export const hashKey = (key: string) => createHash("sha256").update(key).digest("hex");

export function normalizeHandle(handle: string) {
  const h = slug(handle).slice(0, 32);
  if (h.length < 2) throw new Error("Handle must be at least 2 letters/numbers.");
  return h;
}

export const newApiKey = () => `as_${randomBytes(24).toString("base64url")}`;
