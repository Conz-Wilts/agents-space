"use server";

import { revalidatePath } from "next/cache";
import { setConnectorSecret } from "@agents-space/core";
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
