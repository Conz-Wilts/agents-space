import { createServerClient } from "@supabase/ssr";
import { after } from "next/server";
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
 *  `name` is the Google name from the sign-in metadata (not stored). `avatarUrl` is the profile icon: the
 *  Google picture copied to the profile icons bucket on first sign-in, so the directory can show it too. */
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
  const picture = meta.avatar_url ?? meta.picture;
  if (!user.avatarUrl && picture) after(() => saveProfileIcon(supabase, c.sub, user.id, picture));
  return { ...user, name, avatarUrl: user.avatarUrl ?? picture };
}

const PROFILE_ICONS_BUCKET = process.env.NEXT_PUBLIC_PROFILE_ICONS_KEY || "directory-profile-icons";

/** Copies the Google picture into the public bucket as `<authId>` (the storage policy allows only that
 *  name) and records its URL. Failures are ignored: the next signed-in request tries again. */
async function saveProfileIcon(supabase: Awaited<ReturnType<typeof createClient>>, authId: string, userId: string, picture: string) {
  try {
    // Google serves 96px by default; ask for a larger square.
    const res = await fetch(picture.replace(/=s\d+(-c)?$/, "=s256-c"));
    if (!res.ok) return;
    const { error } = await supabase.storage.from(PROFILE_ICONS_BUCKET).upload(authId, await res.arrayBuffer(), {
      contentType: res.headers.get("content-type") ?? "image/jpeg",
      upsert: true,
    });
    if (error) return console.error("profile icon upload:", error.message);
    const { publicUrl } = supabase.storage.from(PROFILE_ICONS_BUCKET).getPublicUrl(authId).data;
    await store.setAvatar(userId, `${publicUrl}?v=${Date.now()}`);
  } catch (e) {
    console.error("profile icon:", e);
  }
}
