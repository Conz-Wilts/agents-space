"use server";

import { store } from "@agents-space/core";
import { getSessionUser } from "@/lib/supabase/server";

export type KeyState = { apiKey?: string; error?: string };

/** Issues a new MCP API key for the signed-in user (revokes the old one). Returned once, never stored. */
export async function generateApiKey(_prev: KeyState): Promise<KeyState> {
  const user = await getSessionUser();
  if (!user) return { error: "Your session expired. Sign in again." };
  return { apiKey: await store.rotateApiKey(user.id) };
}
