import { redirect } from "next/navigation";
import { store, type Agent } from "@agents-space/core";
import { getSessionUser } from "@/lib/supabase/server";
import { SiteHeader } from "../header";
import { decideRequest } from "@/components/agent/actions";
import { AgentCard, Avatar } from "../ui";

export default async function MyAgents() {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/my-agents");

  const mine = (await store.listAgents({ viewerId: user.id })).filter((a) => a.ownerId === user.id);
  const drafts = mine.filter((a) => a.status === "draft");
  const published = mine.filter((a) => a.status === "published");
  const requests = await Promise.all(
    (await store.listAccessRequests({ ownerId: user.id }))
      .filter((r) => r.status === "pending")
      .map(async (r) => ({ ...r, handle: (await store.getUser(r.requesterId))?.handle ?? "unknown", agent: mine.find((a) => a.id === r.agentId) })),
  );

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-6 sm:px-6">
      <SiteHeader />
      <h1 className="text-lg font-semibold">My agents</h1>

      {requests.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-fg-secondary">
            Requests <span className="font-normal text-fg-muted">{requests.length}</span>
          </h2>
          <ul className="flex max-w-2xl flex-col divide-y divide-line rounded-xl border border-line">
            {requests.map((r) => (
              <li key={r.id} className="flex items-center gap-3 px-4 py-3">
                <Avatar name={r.handle} size={28} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm">
                    <span className="font-medium">@{r.handle}</span>
                    <span className="text-fg-muted"> → {r.agent?.name ?? r.agentId}</span>
                  </p>
                  {r.message && <p className="truncate text-xs text-fg-muted">{r.message}</p>}
                </div>
                <form action={decideRequest.bind(null, r.id, "denied")}>
                  <button className="h-8 rounded-full px-3 text-xs text-fg-secondary hover:bg-surface-subtle">Deny</button>
                </form>
                <form action={decideRequest.bind(null, r.id, "approved")}>
                  <button className="h-8 rounded-full bg-brand px-3 text-xs font-medium text-white hover:bg-brand-fg">Approve</button>
                </form>
              </li>
            ))}
          </ul>
        </section>
      )}

      {mine.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-line p-10 text-center text-sm text-fg-muted">
          No agents yet. Build one from your MCP client with the <code>build_agent</code> prompt.
        </p>
      ) : (
        <>
          <AgentGrid title="Drafts" agents={drafts} empty="No drafts." />
          <AgentGrid title="Published" agents={published} empty="Nothing published yet." />
        </>
      )}
    </div>
  );
}

function AgentGrid({ title, agents, empty }: { title: string; agents: Agent[]; empty: string }) {
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
              {(a.status === "draft" || a.visibility === "private") && (
                <span className="pointer-events-none absolute left-2 top-2 z-20 rounded-full border border-line bg-surface px-2 py-0.5 text-[11px] font-medium text-fg-secondary">
                  {a.status === "draft" ? "Draft" : "Private"}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
