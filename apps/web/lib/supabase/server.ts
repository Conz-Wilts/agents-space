import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { store, type User } from "@agents-space/core";

export const supabaseConfigured = () =>
  !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);

/** Supabase client bound to the request cookies (Server Components, Server Actions, Route Handlers). */
export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll(toSet) {
        // Server Components can't set cookies; proxy.ts refreshes the session instead.
        try {
          for (const { name, value, options } of toSet) cookieStore.set(name, value, options);
        } catch {}
      },
    },
  });
}

/** The signed-in Agents Space user (verified JWT), creating the account row on first sign-in.
 *  `name` and `avatarUrl` are the Google name and profile picture from the sign-in metadata (not stored). */
export async function getSessionUser(): Promise<(User & { name?: string; avatarUrl?: string }) | undefined> {
  if (!supabaseConfigured()) return undefined;
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const c = data?.claims;
  if (!c?.sub) return undefined;
  const meta = (c.user_metadata ?? {}) as { full_name?: string; name?: string; avatar_url?: string; picture?: string };
  // Some Google accounts report "Name (Name)"; keep one copy.
  const name = (meta.full_name ?? meta.name)?.replace(/^(.+?)\s*\(\1\)$/, "$1");
  const user = await store.userForAuth({ authId: c.sub, email: c.email, name });
  return { ...user, name, avatarUrl: meta.avatar_url ?? meta.picture };
}
