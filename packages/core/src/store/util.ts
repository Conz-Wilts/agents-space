import { createHash, randomBytes, randomInt } from "node:crypto";

export const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
export const hashKey = (key: string) => createHash("sha256").update(key).digest("hex");

export function normalizeHandle(handle: string) {
  const h = slug(handle).slice(0, 32);
  if (h.length < 2) throw new Error("Handle must be at least 2 letters/numbers.");
  return h;
}

/** Handles that would collide with routes or look official. A space lives at `/<handle>/mcp`. */
export const RESERVED_HANDLES = new Set([
  "a", "about", "account", "admin", "agent", "agents", "api", "app", "auth", "blog", "dashboard", "directory", "docs", "help",
  "login", "logout", "mcp", "me", "oauth", "privacy", "root", "security", "settings", "signin", "signup", "space", "spaces",
  "support", "system", "terms", "www",
]);

/** Category of a person's or business's space (the hosted agent at `/<handle>/mcp`). */
export const SPACE_CATEGORY = "Space";

/**
 * A space's status for a viewer, with hasAccess/canSeeInfo semantics: owner and public are "open";
 * published listed/restricted are "open" if approved, else "request access"; drafts and private are undefined.
 */
export function spaceStatus(
  a: { ownerId?: string | null; status: string; visibility: string },
  viewerId: string | undefined,
  approved: boolean,
): "open" | "request access" | undefined {
  if (viewerId && a.ownerId === viewerId) return "open";
  if (a.status !== "published" || a.visibility === "private") return undefined;
  if (a.visibility === "public" || approved) return "open";
  return "request access";
}

/** The fields the visibility rules look at. */
type Gated = { ownerId?: string | null; status: string; visibility: string; mode?: string | null };
/** A rule's answer before the AccessRequest lookup: yes, no, or only with an approved request. */
export type Gate = boolean | "if approved";
export const passes = (g: Gate, approved: boolean) => g === true || (g === "if approved" && approved);

/** canSeeInfo: owner always; otherwise published skills that are public/listed, or restricted and approved. */
export function infoGate(a: Gated, viewerId: string | undefined): Gate {
  if (viewerId && a.ownerId === viewerId) return true;
  if (a.status !== "published" || a.mode === "scheduled") return false;
  if (a.visibility === "public" || a.visibility === "listed") return true;
  return a.visibility === "restricted" ? "if approved" : false;
}

/** hasAccess: owner always; otherwise published skills that are public, or listed/restricted and approved. */
export function useGate(a: Gated, viewerId: string | undefined): Gate {
  if (viewerId && a.ownerId === viewerId) return true;
  if (a.status !== "published" || a.mode === "scheduled") return false;
  if (a.visibility === "public") return true;
  return a.visibility === "listed" || a.visibility === "restricted" ? "if approved" : false;
}

export const newApiKey =() => `as_${randomBytes(24).toString("base64url")}`;

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
