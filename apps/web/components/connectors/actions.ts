"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { connectApp, createConnector, disconnectApp, setConnectorSecret } from "@agents-space/core";
import { getSessionUser } from "@/lib/supabase/server";

export type SecretState = { ok?: boolean; error?: string };

/** Encrypts and stores one secret on a connector the signed-in user owns. The value is never sent back. */
export async function saveSecret(_prev: SecretState, form: FormData): Promise<SecretState> {
  const user = await getSessionUser();
  if (!user) return { error: "Your session expired. Sign in again." };
  const connector = String(form.get("connector") ?? "");
  const name = String(form.get("name") ?? "");
  const value = String(form.get("value") ?? "");
  if (!value) return { error: "Enter a value." };
  try {
    await setConnectorSecret(user, connector, name, value);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Couldn't save the secret." };
  }
  revalidatePath("/", "layout");
  return { ok: true };
}

export type AddState = { ok?: boolean; error?: string; message?: string };

/** Custom connector wrapping a remote MCP server, with an optional bearer token stored as TOKEN. */
export async function addMcpConnector(_prev: AddState, form: FormData): Promise<AddState> {
  const user = await getSessionUser();
  if (!user) return { error: "Your session expired. Sign in again." };
  const name = String(form.get("name") ?? "").trim();
  const url = String(form.get("url") ?? "").trim();
  const token = String(form.get("token") ?? "");
  if (!name || !url) return { error: "Enter a name and the MCP server URL." };
  try {
    const c = await createConnector(user, {
      name,
      title: String(form.get("title") ?? "").trim() || name,
      description: String(form.get("description") ?? "").trim() || `Tools on ${url}`,
      actions: [],
      mcpUrl: url,
      mcpHeaders: token ? { Authorization: "Bearer {{secret.TOKEN}}" } : {},
    });
    if (token) await setConnectorSecret(user, c.name, "TOKEN", token);
    revalidatePath("/", "layout");
    return { ok: true, message: `${c.name} saved.` };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Couldn't save the connector." };
  }
}

/** Connect a Composio app: saves its connector, then sends the user to sign in to the app (unless already connected). */
export async function connectAppAction(_prev: AddState, form: FormData): Promise<AddState> {
  const user = await getSessionUser();
  if (!user) return { error: "Your session expired. Sign in again." };
  const app = String(form.get("app") ?? "");
  const h = await headers();
  const origin = process.env.NEXT_PUBLIC_WEB_URL ?? `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;
  let url: string | undefined;
  try {
    const r = await connectApp(user, app, { reconnect: form.get("reconnect") === "1", callbackUrl: `${origin}/account?connected=${encodeURIComponent(app)}#apps` });
    url = r.redirectUrl;
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Couldn't connect the app." };
  }
  if (url) redirect(url);
  revalidatePath("/account");
  return { ok: true, message: "Connected." };
}

export async function disconnectAppAction(_prev: AddState, form: FormData): Promise<AddState> {
  const user = await getSessionUser();
  if (!user) return { error: "Your session expired. Sign in again." };
  try {
    await disconnectApp(user, String(form.get("app") ?? ""));
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Couldn't disconnect the app." };
  }
  revalidatePath("/account");
  return { ok: true, message: "Disconnected." };
}
