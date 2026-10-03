import { redirect } from "next/navigation";
import { createClient, getSessionUser, supabaseConfigured } from "@/lib/supabase/server";
import { SiteHeader } from "../../header";
import { decide } from "./actions";

/**
 * Consent screen for MCP clients signing in through Supabase Auth's OAuth 2.1 server.
 * Set this path (/oauth/consent) as the Authorization Path in Supabase → Authentication → OAuth Server.
 */
export default async function Consent({ searchParams }: PageProps<"/oauth/consent">) {
  const { authorization_id, error } = await searchParams;
  const id = typeof authorization_id === "string" ? authorization_id : "";

  let body: React.ReactNode;
  if (!supabaseConfigured() || !id) {
    body = <p className="text-sm text-fg-muted">This page is opened by an MCP client during sign-in. Start from your MCP client.</p>;
  } else {
    const user = await getSessionUser();
    if (!user) redirect(`/login?next=${encodeURIComponent(`/oauth/consent?authorization_id=${id}`)}`);

    const supabase = await createClient();
    const { data, error: detailsError } = await supabase.auth.oauth.getAuthorizationDetails(id);
    if (data && "redirect_url" in data) redirect(data.redirect_url); // already approved before

    body =
      detailsError || !data ? (
        <p className="text-sm text-fg-muted">This sign-in request has expired or is invalid. Start again from your MCP client.</p>
      ) : (
        <>
          <div className="flex flex-col gap-1">
            <h1 className="text-lg font-semibold">Connect {data.client.name || "an MCP client"}</h1>
            <p className="text-sm text-fg-muted">
              <span className="font-medium text-fg">{data.client.name || "This app"}</span> wants to use Agent Book as{" "}
              <span className="font-medium text-fg">@{user.handle}</span>: search and use agents, request access, and build
              agents and connectors on your behalf.
            </p>
          </div>
          <dl className="flex flex-col gap-1 rounded-lg bg-surface-subtle px-3 py-2 text-xs text-fg-muted">
            {data.client.uri && (
              <div className="flex gap-2">
                <dt>App</dt>
                <dd className="truncate">{data.client.uri}</dd>
              </div>
            )}
            <div className="flex gap-2">
              <dt>Returns to</dt>
              <dd className="truncate">{data.redirect_uri}</dd>
            </div>
          </dl>
          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">That didn&apos;t go through. Please try again.</p>}
          <form action={decide} className="flex gap-2">
            <input type="hidden" name="authorization_id" value={id} />
            <button
              name="decision"
              value="deny"
              className="h-10 flex-1 rounded-full border border-line text-sm font-medium text-fg-secondary hover:border-line-strong"
            >
              Cancel
            </button>
            <button name="decision" value="approve" className="h-10 flex-1 rounded-full bg-fg text-sm font-medium text-surface hover:opacity-90">
              Allow
            </button>
          </form>
        </>
      );
  }

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-6 sm:px-6">
      <SiteHeader />
      <main className="mx-auto mt-10 flex w-full max-w-sm flex-col gap-5 rounded-2xl border border-line p-6 shadow-strip">{body}</main>
    </div>
  );
}
