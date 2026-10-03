import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

/**
 * Connector secrets are encrypted at rest with AES-256-GCM. The key comes from
 * CONNECTOR_SECRETS_KEY (32 random bytes, base64: `openssl rand -base64 32`). Rotating it makes
 * existing secrets unreadable — owners re-run set_connector_secret.
 */
function key(): Buffer {
  const raw = process.env.CONNECTOR_SECRETS_KEY;
  if (!raw) throw new Error("Server is missing CONNECTOR_SECRETS_KEY (generate with `openssl rand -base64 32`).");
  const k = Buffer.from(raw, "base64");
  if (k.length !== 32) throw new Error("CONNECTOR_SECRETS_KEY must be 32 bytes, base64-encoded.");
  return k;
}

export function encryptSecret(plain: string): string {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", key(), iv);
  const ct = Buffer.concat([c.update(plain, "utf8"), c.final()]);
  return ["v1", iv.toString("base64"), c.getAuthTag().toString("base64"), ct.toString("base64")].join(":");
}

export function decryptSecret(stored: string): string {
  const [v, iv, tag, ct] = stored.split(":");
  if (v !== "v1" || !iv || !tag || !ct) throw new Error("Unreadable secret; set it again with set_connector_secret.");
  const d = createDecipheriv("aes-256-gcm", key(), Buffer.from(iv, "base64"));
  d.setAuthTag(Buffer.from(tag, "base64"));
  return Buffer.concat([d.update(Buffer.from(ct, "base64")), d.final()]).toString("utf8");
}
