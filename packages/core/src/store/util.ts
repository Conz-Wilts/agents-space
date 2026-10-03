import { createHash, randomBytes, randomInt } from "node:crypto";

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

const USER_CODE_ALPHABET = "BCDFGHJKLMNPQRSTVWXZ";
export const DEVICE_LOGIN_TTL_MS = 10 * 60 * 1000;

export const newDeviceCode = () => `asd_${randomBytes(32).toString("base64url")}`;

/** 8 letters as XXXX-XXXX, no vowels or lookalikes. */
export function newUserCode() {
  let c = "";
  for (let i = 0; i < 8; i++) c += USER_CODE_ALPHABET[randomInt(USER_CODE_ALPHABET.length)];
  return `${c.slice(0, 4)}-${c.slice(4)}`;
}

/** Sloppy user input (lowercase, no dash, spaces) to XXXX-XXXX; undefined unless it is 8 letters. */
export function normalizeUserCode(input: string) {
  const c = input.toUpperCase().replace(/[^A-Z]/g, "");
  return c.length === 8 ? `${c.slice(0, 4)}-${c.slice(4)}` : undefined;
}
