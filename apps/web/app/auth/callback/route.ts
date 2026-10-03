import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createClient, getSessionUser } from "@/lib/supabase/server";

/** Google OAuth lands here (via Supabase) with a PKCE code; swap it for a session cookie. */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const cookieStore = await cookies();
  const next = searchParams.get("next") ?? cookieStore.get("auth_next")?.value;
  cookieStore.delete({ name: "auth_next", path: "/auth/callback" });
  const dest = next?.startsWith("/") && !next.startsWith("//") ? next : "/directory";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      await getSessionUser(); // create the Agents Space account on first sign-in
      return NextResponse.redirect(`${origin}${dest}`);
    }
  }
  return NextResponse.redirect(`${origin}/login?error=auth`);
}
