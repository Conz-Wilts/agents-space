import { redirect } from "next/navigation";
import { store } from "@agents-space/core";
import { ConnectorCard } from "@/components/connectors/connector-card";
import { AppPage } from "@/components/landing/app-page";
import { Monogram, PageTitle, SectionHead } from "@/components/landing/directory";
import { d } from "@/components/landing/primitives";
import { getSessionUser } from "@/lib/supabase/server";
import { ApiKeyForm } from "./key-form";

const MCP_URL = process.env.NEXT_PUBLIC_MCP_URL ?? "http://localhost:3001/mcp";

export default async function Account() {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/account");
  const connectors = await store.listConnectors(user.id);

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

      <section className="grid gap-16 border-t border-edge bg-panel px-5 py-14 sm:px-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-14 lg:px-20 lg:py-20">
        <div data-animate className="flex flex-col gap-6">
          <SectionHead label="MCP API key" />
          <div className="r rounded-[14px] bg-white p-6 outline outline-1 -outline-offset-1 outline-edge" style={d(150)}>
            <ApiKeyForm hasKey={!!user.keyHash} mcpUrl={MCP_URL} />
          </div>
        </div>

        <div data-animate className="flex min-w-0 flex-col gap-6">
          <SectionHead label="Connectors & secrets" count={connectors.length} />
          {connectors.length === 0 ? (
            <p className="r text-[15px] text-muted" style={d(150)}>
              None yet. Connectors you create over MCP show up here so you can set their secrets.
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
