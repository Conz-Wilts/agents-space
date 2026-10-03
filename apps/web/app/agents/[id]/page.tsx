import Link from "next/link";
import { notFound } from "next/navigation";
import { agentTables, describeSchedule, missingSecrets, modelProblem, store } from "@agents-space/core";
import { getSessionUser } from "@/lib/supabase/server";
import { AgentDocs } from "@/components/agent/agent-docs";
import { skillTree } from "@/components/agent/skill-tree";
import { AddModelPanel, ModelPanel } from "@/components/models/model-panel";
import { OwnerControls } from "@/components/agent/owner-controls";
import { RequestAccess } from "@/components/agent/request-access";
import { ConnectorCard } from "@/components/connectors/connector-card";
import { AppPage } from "@/components/landing/app-page";
import { Avatar } from "@/components/landing/directory";
import { Eyebrow, Label, d } from "@/components/landing/primitives";
import { VISIBILITY_LABELS } from "@/components/agent/visibility";

export default async function AgentPage({ params }: PageProps<"/agents/[id]">) {
  const { id } = await params;
  const [agent, user] = await Promise.all([store.getAgent(id), getSessionUser()]);
  const isOwner = !!user && agent?.ownerId === user.id;
  // Drafts and private agents don't exist for anyone but the owner.
  if (!agent || (!isOwner && (agent.status === "draft" || agent.visibility === "private"))) notFound();
  // A restricted agent shows only its name (and the request button) to people who are not approved.
  const info = await store.canSeeInfo(agent.id, user?.id);
  const creator = isOwner && user.name ? { name: user.name, avatarUrl: user.avatarUrl } : { name: agent.owner };

  // Instructions, notes and tools are the agent's skill: only for people who may use it.
  const access = agent.kind === "hosted" && (await store.hasAccess(agent.id, user?.id));
  const currentModel = access && agent.model ? await store.getModel(agent.model) : undefined;
  const [notes, connectors, tables, schedules] = access
    ? await Promise.all([
        store.listNotes(agent.id),
        Promise.all(agent.connectors.map(async (s) => ({ scope: s, connector: await store.getConnector(s.connector) }))),
        agentTables(agent).then((ts) => ts.filter((t) => isOwner || t.callerAccess !== "none")),
        isOwner ? store.listSchedules(agent.id) : [],
      ])
    : [[], [], [], []];
  // Latest request by this viewer, for the request-access button on agents that need approval.
  const myRequest =
    !access && user && agent.kind === "hosted"
      ? (await store.listAccessRequests({ requesterId: user.id })).find((r) => r.agentId === agent.id)
      : undefined;
  // Connectors the owner still has to finish (missing, or secrets unset): red dots in the tree.
  const needsSetupFor = new Set(
    isOwner
      ? (await Promise.all(connectors.map(async ({ scope, connector: c }) => (!c || (await missingSecrets(c)).length > 0 ? scope.connector : "")))).filter(Boolean)
      : [],
  );
  const status = agent.status === "draft" ? "Draft" : VISIBILITY_LABELS[agent.visibility].replace(" (info only)", "");

  return (
    <AppPage>
      <section data-animate className="flex flex-col gap-10 px-5 pt-10 pb-14 sm:px-10 lg:px-20 lg:pt-16 lg:pb-20">
        <Link
          href={isOwner ? "/my-agents" : "/directory"}
          className="r w-fit font-mono text-[13px] uppercase tracking-[1px] text-muted transition-colors hover:text-ink"
        >
          ← {isOwner ? "My agents" : "Directory"}
        </Link>
        <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex min-w-0 flex-col gap-6 lg:max-w-[820px]">
            {info && (
              <Eyebrow className="r">
                {[agent.category, agent.protocol, agent.kind === "hosted" ? "Hosted" : "External"].filter(Boolean).join(" · ")}
              </Eyebrow>
            )}
            <h1
              className="r-mask text-[40px] leading-[1.02] font-medium tracking-[-1.6px] break-words text-ink sm:text-[52px] lg:text-[64px] lg:leading-[64px] lg:tracking-[-2.6px]"
              style={d(100)}
            >
              <span>
                <span>{agent.name}</span>
              </span>
            </h1>
            {info && (
              <>
                <p className="r text-[17px] leading-[26px] text-muted sm:text-[19px] sm:leading-[28px]" style={d(250)}>
                  {agent.tagline}
                </p>
                <div className="r flex flex-wrap items-center gap-3" style={d(350)}>
                  <span className="flex items-center gap-2">
                    <Avatar creator={creator} size={28} />
                    <span className="text-[15px] text-ink">{creator.name}</span>
                  </span>
                  <span className="rounded-full px-2.5 py-1 font-mono text-[11px] uppercase tracking-[1px] text-ink outline outline-1 -outline-offset-1 outline-edge">
                    {status}
                  </span>
                </div>
              </>
            )}
          </div>
          {isOwner && (
            <div className="r lg:shrink-0" style={d(450)}>
              <OwnerControls agentId={agent.id} visibility={agent.visibility} endpoint={agent.endpoint} draft={agent.status === "draft"} />
            </div>
          )}
        </div>
      </section>

      <section data-animate className="border-t border-edge bg-panel px-5 py-14 sm:px-10 lg:px-20 lg:py-20">
        {access ? (
          <div className="r rounded-[14px] bg-white p-5 outline outline-1 -outline-offset-1 outline-edge sm:p-8">
            <AgentDocs
              tree={skillTree({
                instructions: agent.instructions,
                notes,
                tables,
                schedules: schedules.map((x) => ({ id: x.id, label: x.task, body: describeSchedule(x) })),
                tools: connectors.map(({ scope, connector }) => ({
                  id: scope.connector,
                  label: connector?.title ?? scope.connector,
                  alert: isOwner && needsSetupFor.has(scope.connector),
                  panel: connector ? (
                    <ConnectorCard connector={connector} only={scope.actions} owner={isOwner && connector.ownerId === user?.id} />
                  ) : (
                    <p className="text-[15px] text-red-700">
                      <code className="font-mono">{scope.connector}</code> no longer exists.
                    </p>
                  ),
                })),
                models: {
                  current: { label: currentModel?.title ?? "Default model", alert: isOwner && !!currentModel && !!modelProblem(currentModel), panel: <ModelPanel agent={agent} owner={isOwner} /> },
                  add: isOwner ? <AddModelPanel agentId={agent.id} /> : undefined,
                },
              })}
            />
          </div>
        ) : (
          <div className="flex max-w-2xl flex-col gap-6">
            <Label className="r text-ink">{info ? "About" : "Access"}</Label>
            {!info && <p className="r text-[17px] leading-[27px] text-muted">The owner shares this agent with specific people. Request access to see and use it.</p>}
            {info && agent.description && (
              <p className="r text-[17px] leading-[27px] whitespace-pre-wrap text-ink" style={d(100)}>
                {agent.description}
              </p>
            )}
            {info && agent.tools.length > 0 && (
              <ul className="r flex flex-wrap gap-1.5" style={d(200)}>
                {agent.tools.map((t) => (
                  <li key={t} className="rounded-md bg-white px-2 py-1 text-[13px] text-ink outline outline-1 -outline-offset-1 outline-edge">
                    {t}
                  </li>
                ))}
              </ul>
            )}
            <div className="r" style={d(300)}>
              {agent.kind === "external" ? (
                info && <p className="text-[15px] text-muted">Runs on its owner&apos;s servers, so there&apos;s nothing more to show here.</p>
              ) : user ? (
                <RequestAccess agentId={agent.id} status={myRequest?.status === "approved" ? undefined : myRequest?.status} />
              ) : (
                <Link
                  href={`/login?next=/agents/${agent.id}`}
                  className="inline-flex h-11 items-center rounded-lg bg-ink px-5 text-[15px] font-medium text-white transition-transform duration-200 hover:-translate-y-px active:scale-[0.98]"
                >
                  Sign in to request access
                </Link>
              )}
            </div>
          </div>
        )}
      </section>
    </AppPage>
  );
}
