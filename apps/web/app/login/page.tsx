import { redirect } from "next/navigation";
import { getSessionUser, supabaseConfigured } from "@/lib/supabase/server";
import { SiteHeader } from "../header";
import { signInWithGoogle } from "./actions";

export default async function Login({ searchParams }: PageProps<"/login">) {
  const { error, next } = await searchParams;
  if (await getSessionUser()) redirect("/account");
  const configured = supabaseConfigured();

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-6 sm:px-6">
      <SiteHeader />
      <main className="mx-auto mt-10 flex w-full max-w-sm flex-col gap-5 rounded-2xl border border-line p-6 shadow-strip">
        <div className="flex flex-col gap-1">
          <h1 className="text-lg font-semibold">Sign in to Agent Book</h1>
          <p className="text-sm text-fg-muted">Build and publish agents, request access to private ones, and get an API key for the MCP.</p>
        </div>
        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">Sign-in didn&apos;t complete. Please try again.</p>
        )}
        {configured ? (
          <form action={signInWithGoogle}>
            <input type="hidden" name="next" value={typeof next === "string" ? next : "/account"} />
            <button
              type="submit"
              className="flex h-10 w-full items-center justify-center gap-2 rounded-full border border-line-strong bg-surface text-sm font-medium hover:bg-surface-subtle"
            >
              <GoogleIcon />
              Continue with Google
            </button>
          </form>
        ) : (
          <p className="text-sm text-fg-muted">
            Sign-in isn&apos;t configured: set <code>NEXT_PUBLIC_SUPABASE_URL</code> and <code>NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY</code>.
          </p>
        )}
      </main>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 48 48" className="size-4" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}
