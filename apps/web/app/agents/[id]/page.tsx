import Link from "next/link";
import { notFound } from "next/navigation";
import { missingSecrets, store } from "@agents-space/core";
import { getSessionUser } from "@/lib/supabase/server";
import { AgentDocs } from "@/components/agent/agent-docs";
import { OwnerControls } from "@/components/agent/owner-controls";
import { RequestAccess } from "@/components/agent/request-access";
import { ConnectorCard } from "@/components/connectors/connector-card";
import { SiteHeader } from "../../header";
import { Avatar } from "../../ui";

export default async function AgentPage({ params }: PageProps<"/agents/[id]">) {
  const { id } = await params;
  const [agent, user] = await Promise.all([store.getAgent(id), getSessionUser()]);
  const isOwner = !!user && agent?.ownerId === user.id;
  if (!agent || (agent.status === "draft" && !isOwner)) notFound();

  // Instructions, notes and tools are the agent's skill: only for people who may use it.
  const access = agent.kind === "hosted" && (await store.hasAccess(agent.id, user?.id));
  const [notes, connectors] = access
    ? await Promise.all([
        store.listNotes(agent.id),
        Promise.all(agent.connectors.map(async (s) => ({ scope: s, connector: await store.getConnector(s.connector) }))),
      ])
    : [[], []];
  // Latest request by this viewer, for the request-access button on private agents.
  const myRequest =
    !access && user && agent.kind === "hosted"
      ? (await store.listAccessRequests({ requesterId: user.id })).find((r) => r.agentId === agent.id)
      : undefined;
  const needsSetup =
    isOwner && (await Promise.all(connectors.map(async ({ connector: c }) => !c || (await missingSecrets(c)).length > 0))).some(Boolean);

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-6 sm:px-6">
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-10">
        <header className="flex flex-col gap-2">
          <Link href={isOwner ? "/my-agents" : "/directory"} className="text-sm text-fg-muted hover:text-fg">
            ← {isOwner ? "My agents" : "Directory"}
          </Link>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h1 className="text-3xl font-semibold">{agent.name}</h1>
            {isOwner && (
              <OwnerControls agentId={agent.id} visibility={agent.visibility} endpoint={agent.endpoint} draft={agent.status === "draft"} />
            )}
          </div>
          <p className="text-fg-secondary">{agent.tagline}</p>
          <p className="flex items-center gap-1.5 text-xs text-fg-muted">
            <Avatar name={agent.owner} size={16} />
            {agent.owner}
            <span aria-hidden>·</span>
            {agent.status === "draft" ? "Draft" : agent.visibility === "private" ? "Private" : "Public"}
          </p>
        </header>

        {access ? (
          <AgentDocs
            docs={[
              { id: "instructions", title: "Instructions", body: agent.instructions },
              ...notes.map((n) => ({ id: `note:${n.slug}`, title: n.title, body: n.body })),
            ]}
            toolsAlert={needsSetup}
            tools={
              <div className="flex flex-col gap-8">
                <h2 className="text-2xl font-semibold">Tools</h2>
                {connectors.length === 0 ? (
                  <p className="text-sm text-fg-muted">None. This agent is instructions only.</p>
                ) : (
                  connectors.map(({ scope, connector }) =>
                    connector ? (
                      <ConnectorCard
                        key={scope.connector}
                        connector={connector}
                        only={scope.actions}
                        owner={isOwner && connector.ownerId === user?.id}
                      />
                    ) : (
                      <p key={scope.connector} className="text-sm text-red-700">
                        <code className="font-mono">{scope.connector}</code> no longer exists.
                      </p>
                    ),
                  )
                )}
              </div>
            }
          />
        ) : (
          <div className="flex flex-col gap-4">
            {agent.description && <p className="max-w-xl whitespace-pre-wrap text-sm text-fg-secondary">{agent.description}</p>}
            {agent.kind === "external" ? (
              <p className="text-sm text-fg-muted">Runs on its owner&apos;s servers, so there&apos;s nothing more to show here.</p>
            ) : user ? (
              <RequestAccess agentId={agent.id} status={myRequest?.status === "approved" ? undefined : myRequest?.status} />
            ) : (
              <Link href={`/login?next=/agents/${agent.id}`} className="text-sm text-brand hover:underline">
                Sign in to request access
              </Link>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
