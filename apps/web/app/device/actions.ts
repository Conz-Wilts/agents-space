"use server";

import { redirect } from "next/navigation";
import { store } from "@agents-space/core";
import { getSessionUser } from "@/lib/supabase/server";

/** Approve or cancel a CLI sign-in. Re-checks the session; the page check alone is not trusted. */
export async function decide(formData: FormData) {
  const code = String(formData.get("code") ?? "");
  const decision = formData.get("decision") === "approve" ? "approved" : "denied";
  const user = await getSessionUser();
  const ok = user ? await store.decideDeviceLogin(code, user.id, decision) : false;
  redirect(`/device?code=${encodeURIComponent(code)}&done=${ok ? decision : "error"}`);
}
