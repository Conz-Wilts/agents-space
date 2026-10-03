"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function signInWithGoogle(formData: FormData) {
  const h = await headers();
  const origin = process.env.NEXT_PUBLIC_WEB_URL ?? `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;
  const next = String(formData.get("next") ?? "/directory");
  // Carry `next` in a cookie so redirectTo is the bare callback URL: Supabase matches it exactly
  // against its Redirect URLs allowlist, and falls back to the Site URL (production) on a miss.
  (await cookies()).set("auth_next", next, { httpOnly: true, sameSite: "lax", path: "/auth/callback", maxAge: 600 });
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${origin}/auth/callback` },
  });
  if (error || !data.url) redirect("/login?error=oauth");
  redirect(data.url);
}
