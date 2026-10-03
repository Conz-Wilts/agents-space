import { createHash, randomBytes } from "node:crypto";

export const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
export const hashKey = (key: string) => createHash("sha256").update(key).digest("hex");

export function normalizeHandle(handle: string) {
  const h = slug(handle).slice(0, 32);
  if (h.length < 2) throw new Error("Handle must be at least 2 letters/numbers.");
  return h;
}

export const newApiKey = () => `as_${randomBytes(24).toString("base64url")}`;

/** Handle candidates for a new web sign-in: from the name or email, then with random suffixes. */
export function handleCandidates(auth: { email?: string; name?: string }): string[] {
  let base = slug(auth.name || auth.email?.split("@")[0] || "").slice(0, 26);
  if (base.length < 2) base = "user";
  const suffix = () => randomBytes(3).toString("hex");
  return [base, `${base}-${suffix()}`, `${base}-${suffix()}`, `user-${randomBytes(6).toString("hex")}`];
}
