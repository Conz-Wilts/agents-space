import Link from "next/link";
import { redirect } from "next/navigation";
import { Eyebrow, Logo } from "@/components/landing/primitives";
import { createClient, getSessionUser, supabaseConfigured } from "@/lib/supabase/server";
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
    body = <p className="text-[15px] leading-[23px] text-muted">This page is opened by an MCP client during sign-in. Start from your MCP client.</p>;
  } else {
    const user = await getSessionUser();
    if (!user) redirect(`/login?next=${encodeURIComponent(`/oauth/consent?authorization_id=${id}`)}`);

    const supabase = await createClient();
    const { data, error: detailsError } = await supabase.auth.oauth.getAuthorizationDetails(id);
    if (data && "redirect_url" in data) redirect(data.redirect_url); // already approved before

    body =
      detailsError || !data ? (
        <p className="text-[15px] leading-[23px] text-muted">This sign-in request has expired or is invalid. Start again from your MCP client.</p>
      ) : (
        <>
          <div className="flex flex-col gap-4">
            <Eyebrow>Authorize access</Eyebrow>
            <h1 className="text-[32px] leading-[1.05] font-medium tracking-[-1.2px] text-ink">
              Connect {data.client.name || "an MCP client"}
            </h1>
            <p className="text-[15px] leading-[23px] text-muted">
              <span className="font-medium text-ink">{data.client.name || "This app"}</span> wants to use Agent Space as{" "}
              <span className="font-medium text-ink">@{user.handle}</span>: search and use agents, request access, and build
              agents and connectors on your behalf.
            </p>
          </div>
          <dl className="flex flex-col gap-2 rounded-lg border border-edge bg-panel px-4 py-3 font-mono text-[12px] text-muted">
            {data.client.uri && (
              <div className="flex gap-2">
                <dt className="shrink-0 uppercase tracking-[1px]">App</dt>
                <dd className="truncate text-ink">{data.client.uri}</dd>
              </div>
            )}
            <div className="flex gap-2">
              <dt className="shrink-0 uppercase tracking-[1px]">Returns to</dt>
              <dd className="truncate text-ink">{data.redirect_uri}</dd>
            </div>
          </dl>
          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">That didn&apos;t go through. Please try again.</p>}
          <form action={decide} className="flex gap-3">
            <input type="hidden" name="authorization_id" value={id} />
            <button
              name="decision"
              value="deny"
              className="h-11 flex-1 rounded-lg border border-edge text-[15px] font-medium text-ink transition-colors hover:bg-panel"
            >
              Cancel
            </button>
            <button name="decision" value="approve" className="h-11 flex-1 rounded-lg bg-ink text-[15px] font-medium text-white transition-transform duration-200 hover:-translate-y-px active:scale-[0.98]">
              Allow
            </button>
          </form>
        </>
      );
  }

  return (
    <div className="flex flex-1 flex-col bg-white text-ink">
      <header className="px-5 py-5 sm:px-10 lg:px-20 lg:py-6">
        <Link href="/" aria-label="Agent Space home" className="group w-fit">
          <Logo />
        </Link>
      </header>
      <main className="flex flex-1 items-start justify-center px-5 pt-10 pb-24 sm:pt-20">
        <div className="flex w-full max-w-md flex-col gap-6 rounded-2xl border border-edge bg-white p-8 shadow-[0_1px_2px_#0a0a0a0a,0_12px_32px_-12px_#0a0a0a1f]">
          {body}
        </div>
      </main>
    </div>
  );
}
