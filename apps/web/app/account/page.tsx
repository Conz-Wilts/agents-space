import { redirect } from "next/navigation";
import { appConnectorName, composioEnabled, listApps, myConnections, store, type AppConnection, type ComposioApp } from "@agents-space/core";
import { AddConnector } from "@/components/connectors/add-connector";
import { AppCard } from "@/components/connectors/app-card";
import { ConnectorCard } from "@/components/connectors/connector-card";
import { AppPage } from "@/components/landing/app-page";
import { Monogram, PageTitle, SectionHead } from "@/components/landing/directory";
import { d } from "@/components/landing/primitives";
import { getSessionUser } from "@/lib/supabase/server";
import { ApiKeyForm } from "./key-form";

const MCP_URL = process.env.NEXT_PUBLIC_MCP_URL ?? "http://localhost:3001/mcp";

export default async function Account({ searchParams }: { searchParams: Promise<{ apps?: string; connected?: string }> }) {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/account");
  const { apps: search, connected } = await searchParams;
  const connectors = (await store.listConnectors(user.id)).filter((c) => !c.actions.some((a) => a.type === "composio"));

  // Composio apps: the user's connections plus the catalog (search or most used).
  let apps: ComposioApp[] = [];
  let connections: AppConnection[] = [];
  let appsError: string | undefined;
  if (composioEnabled()) {
    try {
      [apps, connections] = await Promise.all([listApps({ search, limit: 24 }), myConnections(user)]);
    } catch (e) {
      appsError = e instanceof Error ? e.message : "Couldn't load apps.";
    }
  }
  const statusOf = new Map<string, string>();
  for (const c of connections) if (!statusOf.has(c.toolkit) || c.status === "ACTIVE") statusOf.set(c.toolkit, c.status);
  // Connected apps first, even when they aren't in this page of the catalog.
  const shown = [...apps.filter((a) => statusOf.has(a.slug)), ...apps.filter((a) => !statusOf.has(a.slug))];
  const missing = [...statusOf.keys()].filter((k) => !apps.some((a) => a.slug === k));

  return (
    <AppPage>
      <section data-animate className="px-5 pt-10 pb-14 sm:px-10 lg:px-20 lg:pt-16 lg:pb-20">
        <PageTitle
          eyebrow="Account"
          title="Your account."
          aside={
            <div className="flex items-center gap-3 rounded-[14px] bg-white p-4 outline outline-1 -outline-offset-1 outline-edge">
              <Monogram name={user.handle} size={40} dark />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] font-medium text-ink">@{user.handle}</p>
                {user.email && <p className="truncate text-[14px] text-muted">{user.email}</p>}
              </div>
              <form action="/auth/signout" method="post">
                <button className="h-9 rounded-lg px-3.5 text-[14px] text-ink outline outline-1 -outline-offset-1 outline-edge transition-colors hover:bg-panel">
                  Sign out
                </button>
              </form>
            </div>
          }
        />
      </section>

      {composioEnabled() && (
        <section id="apps" className="border-t border-edge px-5 py-14 sm:px-10 lg:px-20 lg:py-20">
          <div data-animate className="flex flex-col gap-6">
            <SectionHead label="Apps" count={statusOf.size} />
            <div className="r flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between" style={d(120)}>
              <p className="max-w-2xl text-[15px] leading-[23px] text-muted">
                Connect Gmail, Slack, GitHub, Notion and 1000+ more apps. You sign in to the app itself; your agents act on your account, and callers only
                get the actions you attach to an agent (<code className="font-mono text-[13px] text-ink">attach_connector</code>).
              </p>
              <form className="flex w-full gap-2 sm:w-auto" action="/account#apps">
                <input
                  name="apps"
                  defaultValue={search}
                  placeholder="Search apps"
                  aria-label="Search apps"
                  className="h-10 w-full min-w-0 rounded-lg bg-white px-3 text-[14px] text-ink outline outline-1 -outline-offset-1 outline-edge placeholder:text-muted focus:outline-ink sm:w-64"
                />
                <button className="h-10 shrink-0 rounded-lg bg-ink px-4 text-[14px] font-medium text-white">Search</button>
              </form>
            </div>
            {connected && (
              <p className="r text-[14px] text-emerald-700" style={d(150)}>
                {statusOf.get(connected) === "ACTIVE" ? `${connected} is connected.` : `Finishing ${connected}… refresh in a moment if it isn't connected yet.`}
              </p>
            )}
            {appsError ? (
              <p className="r text-[14px] text-red-700" style={d(150)}>
                {appsError}
              </p>
            ) : (
              <ul className="r grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" style={d(180)}>
                {missing.map((slug) => (
                  <AppCard key={slug} slug={slug} name={slug} description="" status={statusOf.get(slug)} connector={appConnectorName(user, slug)} />
                ))}
                {shown.map((a) => (
                  <AppCard
                    key={a.slug}
                    slug={a.slug}
                    name={a.name}
                    description={a.description}
                    logo={a.logo}
                    toolsCount={a.toolsCount}
                    status={statusOf.get(a.slug)}
                    connector={appConnectorName(user, a.slug)}
                  />
                ))}
                {!shown.length && !missing.length && <li className="text-[14px] text-muted">No apps match “{search}”.</li>}
              </ul>
            )}
          </div>
        </section>
      )}

      <section className="grid gap-16 border-t border-edge bg-panel px-5 py-14 sm:px-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-14 lg:px-20 lg:py-20">
        <div data-animate className="flex flex-col gap-6">
          <SectionHead label="MCP API key" />
          <div className="r rounded-[14px] bg-white p-6 outline outline-1 -outline-offset-1 outline-edge" style={d(150)}>
            <ApiKeyForm hasKey={!!user.keyHash} mcpUrl={MCP_URL} />
          </div>
        </div>

        <div data-animate className="flex min-w-0 flex-col gap-6">
          <SectionHead label="Connectors & secrets" count={connectors.length} />
          <div className="r" style={d(120)}>
            <AddConnector />
          </div>
          {connectors.length === 0 ? (
            <p className="r text-[15px] text-muted" style={d(150)}>
              None yet. Add one above, or create one over MCP; then set its secrets here.
            </p>
          ) : (
            <div className="flex flex-col gap-10">
              {connectors.map((c, i) => (
                <div key={c.name} className="r" style={d(150 + Math.min(i, 6) * 90)}>
                  <ConnectorCard connector={c} owner />
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </AppPage>
  );
}
