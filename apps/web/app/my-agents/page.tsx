import { redirect } from "next/navigation";
import { store, type Agent } from "@agents-space/core";
import { getSessionUser } from "@/lib/supabase/server";
import { SiteHeader } from "../header";
import { AgentCard } from "../ui";

export default async function MyAgents() {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/my-agents");

  const mine = (await store.listAgents({ viewerId: user.id })).filter((a) => a.ownerId === user.id);
  const drafts = mine.filter((a) => a.status === "draft");
  const published = mine.filter((a) => a.status === "published");

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-6 sm:px-6">
      <SiteHeader />
      <h1 className="text-lg font-semibold">My agents</h1>

      {mine.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-line p-10 text-center text-sm text-fg-muted">
          No agents yet. Build one from your MCP client with the <code>build_agent</code> prompt.
        </p>
      ) : (
        <>
          <AgentGrid title="Drafts" agents={drafts} empty="No drafts." badge="Draft" />
          <AgentGrid title="Published" agents={published} empty="Nothing published yet." />
        </>
      )}
    </div>
  );
}

function AgentGrid({ title, agents, empty, badge }: { title: string; agents: Agent[]; empty: string; badge?: string }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-sm font-semibold text-fg-secondary">
        {title} <span className="font-normal text-fg-muted">{agents.length}</span>
      </h2>
      {agents.length === 0 ? (
        <p className="text-sm text-fg-muted">{empty}</p>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {agents.map((a) => (
            <li key={a.id} className="relative">
              <AgentCard agent={a} />
              {badge && (
                <span className="pointer-events-none absolute left-2 top-2 z-20 rounded-full border border-line bg-surface px-2 py-0.5 text-[11px] font-medium text-fg-secondary">
                  {badge}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
