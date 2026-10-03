"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/** Approve or deny an MCP client's sign-in request; Supabase returns where to send the browser. */
export async function decide(formData: FormData) {
  const id = String(formData.get("authorization_id") ?? "");
  const approve = formData.get("decision") === "approve";
  const supabase = await createClient();
  const { data, error } = approve
    ? await supabase.auth.oauth.approveAuthorization(id, { skipBrowserRedirect: true })
    : await supabase.auth.oauth.denyAuthorization(id, { skipBrowserRedirect: true });
  if (error || !data?.redirect_url) redirect(`/oauth/consent?authorization_id=${encodeURIComponent(id)}&error=1`);
  redirect(data.redirect_url);
}
