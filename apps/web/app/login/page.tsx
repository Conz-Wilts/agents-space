import Link from "next/link";
import { redirect } from "next/navigation";
import { LoginCard } from "@/components/auth/login-card";
import { Logo } from "@/components/landing/primitives";
import { getSessionUser } from "@/lib/supabase/server";

// Full page for direct visits and redirects (e.g. from /account or the OAuth consent screen).
export default async function Login({ searchParams }: PageProps<"/login">) {
  const { error, next } = await searchParams;
  if (await getSessionUser()) redirect(typeof next === "string" && next.startsWith("/") && !next.startsWith("//") ? next : "/directory");

  return (
    <div className="flex flex-1 flex-col bg-white text-ink">
      <header className="px-5 py-5 sm:px-10 lg:px-20 lg:py-6">
        <Link href="/" aria-label="Agent Space home" className="group w-fit">
          <Logo />
        </Link>
      </header>
      <main className="flex flex-1 items-start justify-center px-5 pt-10 pb-24 sm:pt-20">
        <div className="w-full max-w-md rounded-2xl border border-edge bg-white p-8 shadow-[0_1px_2px_#0a0a0a0a,0_12px_32px_-12px_#0a0a0a1f]">
          <LoginCard next={typeof next === "string" ? next : undefined} error={!!error} />
        </div>
      </main>
    </div>
  );
}
