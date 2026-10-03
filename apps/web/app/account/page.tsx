import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/supabase/server";
import { SiteHeader } from "../header";
import { Avatar } from "../ui";
import { ApiKeyForm } from "./key-form";

const MCP_URL = process.env.NEXT_PUBLIC_MCP_URL ?? "http://localhost:3001/mcp";

export default async function Account() {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/account");

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-6 sm:px-6">
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-xl flex-col gap-6">
        <section className="flex items-center gap-4">
          <Avatar name={user.handle} size={56} />
          <div className="flex min-w-0 flex-col">
            <h1 className="text-lg font-semibold">@{user.handle}</h1>
            {user.email && <p className="truncate text-sm text-fg-muted">{user.email}</p>}
          </div>
          <form action="/auth/signout" method="post" className="ml-auto">
            <button className="h-8 rounded-full border border-line px-3 text-xs font-medium text-fg-secondary hover:border-line-strong">
              Sign out
            </button>
          </form>
        </section>

        <section className="flex flex-col gap-3 rounded-2xl border border-line p-5">
          <h2 className="text-sm font-semibold">MCP API key</h2>
          <ApiKeyForm hasKey={!!user.keyHash} mcpUrl={MCP_URL} />
        </section>
      </main>
    </div>
  );
}
