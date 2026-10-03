"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function signInWithGoogle(formData: FormData) {
  const h = await headers();
  const origin = process.env.NEXT_PUBLIC_WEB_URL ?? `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;
  const next = String(formData.get("next") ?? "/account");
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}` },
  });
  if (error || !data.url) redirect("/login?error=oauth");
  redirect(data.url);
}
