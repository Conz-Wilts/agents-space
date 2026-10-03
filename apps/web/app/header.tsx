import Link from "next/link";
import { getSessionUser } from "@/lib/supabase/server";
import { UserMenu } from "./user-menu";

export async function SiteHeader() {
  const user = await getSessionUser();
  return (
    <header className="flex items-center justify-between gap-3">
      <Link href="/directory" className="flex items-center gap-2 text-xl font-semibold tracking-tight">
        <span className="size-7 rounded-lg bg-brand" aria-hidden />
        Agent Book
      </Link>
      <div className="flex items-center gap-2">
        {user ? (
          <UserMenu handle={user.handle} email={user.email} />
        ) : (
          <Link href="/login" className="flex h-8 items-center rounded-full border border-line px-3 text-xs font-medium hover:border-line-strong">
            Sign in
          </Link>
        )}
      </div>
    </header>
  );
}
