import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { store, type AccessRequest, type Agent } from "@agents-space/core";
import { getSessionUser } from "@/lib/supabase/server";
import { decideRequest } from "@/components/agent/actions";
import { AppPage } from "@/components/landing/app-page";
import { AgentTile, EmptyState, Monogram, PageTitle, TileGrid, type Creator } from "@/components/landing/directory";
import { Tabs } from "@/components/landing/tabs";
import { d } from "@/components/landing/primitives";
import { VISIBILITY_BADGE } from "@/components/agent/visibility";

export default async function MyAgents() {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/my-agents");

  const mine = (await store.listAgents({ viewerId: user.id })).filter((a) => a.ownerId === user.id);
  const creator = user.name ? { name: user.name, avatarUrl: user.avatarUrl } : undefined;
  const drafts = mine.filter((a) => a.status === "draft");
  const published = mine.filter((a) => a.status === "published");
  const requests = await Promise.all(
    (await store.listAccessRequests({ ownerId: user.id }))
      .filter((r) => r.status === "pending")
      .map(async (r) => ({ ...r, handle: (await store.getUser(r.requesterId))?.handle ?? "unknown", agent: mine.find((a) => a.id === r.agentId) })),
  );

  return (
    <AppPage>
      <section data-animate className="px-5 pt-10 pb-14 sm:px-10 lg:px-20 lg:pt-16 lg:pb-20">
        <PageTitle
          eyebrow={`My agents · @${user.handle}`}
          title="What you’ve built."
          aside={
            <dl className="grid grid-cols-3 gap-px overflow-hidden rounded-[14px] bg-edge outline outline-1 -outline-offset-1 outline-edge">
              {[
                ["Published", published.length],
                ["Drafts", drafts.length],
                ["Requests", requests.length],
              ].map(([label, n]) => (
                <div key={label} className="flex flex-col gap-1 bg-white px-4 py-4">
                  <dt className="font-mono text-[11px] uppercase tracking-[1px] text-muted">{label}</dt>
                  <dd className="text-[32px] leading-9 font-medium tracking-[-1.2px] text-ink">{n}</dd>
                </div>
              ))}
            </dl>
          }
        />
      </section>

      <section className="border-t border-edge bg-panel px-5 py-16 sm:px-10 lg:px-20 lg:py-20">
        {mine.length === 0 && requests.length === 0 ? (
          <div data-animate>
            <EmptyState>
              No agents yet. Build one from your MCP client with the{" "}
              <code className="rounded bg-panel px-1.5 py-0.5 font-mono text-[13px] text-ink">build_agent</code> prompt.
            </EmptyState>
          </div>
        ) : (
          <Tabs
            initial={requests.length > 0 ? "requests" : published.length > 0 ? "published" : "drafts"}
            tabs={[
              {
                key: "published",
                label: "Published",
                count: published.length,
                panel: <AgentGrid agents={published} creator={creator} empty="Nothing published yet." />,
              },
              {
                key: "drafts",
                label: "Drafts",
                count: drafts.length,
                panel: <AgentGrid agents={drafts} creator={creator} empty="No drafts." />,
              },
              {
                key: "requests",
                label: "Requests",
                count: requests.length,
                panel: requests.length === 0 ? <Empty>No one is waiting on you.</Empty> : <RequestList requests={requests} />,
              },
            ]}
          />
        )}
      </section>
    </AppPage>
  );
}

type Request = AccessRequest & { handle: string; agent?: Agent };

function RequestList({ requests }: { requests: Request[] }) {
  return (
    <div data-animate>
      <ul className="flex max-w-3xl flex-col overflow-hidden rounded-[14px] bg-white outline outline-1 -outline-offset-1 outline-edge">
        {requests.map((r, i) => (
          <li
            key={r.id}
            className={`r waiting-row flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center ${i > 0 ? "border-t border-edge" : ""}`}
            style={d(i * 90)}
          >
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <Monogram name={r.handle} size={32} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] text-ink">
                  <span className="font-medium">@{r.handle}</span>
                  <span className="text-muted"> wants {r.agent?.name ?? r.agentId}</span>
                </p>
                {r.message && <p className="truncate text-[14px] text-muted">“{r.message}”</p>}
              </div>
            </div>
            <div className="flex gap-2 sm:shrink-0">
              <form action={decideRequest.bind(null, r.id, "denied")}>
                <button className="h-9 rounded-lg px-4 text-[14px] text-muted outline outline-1 -outline-offset-1 outline-edge transition-colors hover:text-ink">
                  Deny
                </button>
              </form>
              <form action={decideRequest.bind(null, r.id, "approved")}>
                <button className="h-9 rounded-lg bg-ink px-4 text-[14px] font-medium text-white transition-transform duration-200 hover:-translate-y-px active:scale-[0.98]">
                  Approve
                </button>
              </form>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Empty({ children }: { children: ReactNode }) {
  return (
    <div data-animate>
      <p className="r text-[15px] text-muted">{children}</p>
    </div>
  );
}

function AgentGrid({ agents, creator, empty }: { agents: Agent[]; creator?: Creator; empty: string }) {
  if (agents.length === 0) return <Empty>{empty}</Empty>;
  return (
    <div data-animate>
      <TileGrid>
        {agents.map((a, i) => (
          <li key={a.id}>
            <AgentTile
              agent={a}
              creator={creator}
              badge={a.status === "draft" ? "Draft" : VISIBILITY_BADGE[a.visibility]}
              delay={Math.min(i, 8) * 70}
            />
          </li>
        ))}
      </TileGrid>
    </div>
  );
}
