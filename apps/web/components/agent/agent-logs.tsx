import { agentLogs, store, type Agent, type AgentLog } from "@agents-space/core";
import { Section, when } from "@/components/agent/table-rows";

/**
 * Calls to an agent, newest first, as a Logs leaf in the skill tree. `agentLogs` decides what the
 * viewer sees: the owner every call (or one `caller`'s), anyone else only their own.
 */
export async function AgentLogs({ agent, viewerId, caller }: { agent: Agent; viewerId: string; caller?: string }) {
  const owner = agent.ownerId === viewerId;
  const logs = await agentLogs(agent, viewerId, { caller });
  const handles = owner ? await callers(logs) : new Map<string, string>();
  const title = owner ? `Calls · ${logs.length}` : `Your calls · ${logs.length}`;

  if (!logs.length)
    return (
      <Section title={title}>
        <p className="text-[15px] text-muted">{owner ? "No calls yet." : "You haven't used this agent yet."}</p>
      </Section>
    );

  return (
    <Section title={title} note="Last 30 days, newest first">
      <ul className="max-h-[640px] overflow-auto rounded-lg outline outline-1 -outline-offset-1 outline-edge">
        {logs.map((l) => (
          <li key={l.id} className="border-b border-edge last:border-0">
            <details className="group">
              <summary className="flex cursor-pointer list-none flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2 text-[14px] text-ink hover:bg-panel/60 [&::-webkit-details-marker]:hidden">
                <span className={`size-2 shrink-0 rounded-full ${l.ok ? "bg-emerald-500" : "bg-red-500"}`} aria-label={l.ok ? "ok" : "error"} />
                <code className="min-w-0 font-mono text-[13px] break-all">{l.tool}</code>
                {owner && <span className="font-mono text-[12px] text-muted">{l.callerId ? handles.get(l.callerId) : "anonymous"}</span>}
                <span className="ml-auto font-mono text-[12px] whitespace-nowrap text-muted" title={l.createdAt}>
                  {when(l.createdAt)} · {l.durationMs} ms
                </span>
              </summary>
              <div className="flex flex-col gap-3 bg-panel/40 px-3 pt-1 pb-3">
                {l.args !== undefined && <Block label="Input" value={typeof l.args === "string" ? l.args : JSON.stringify(l.args, null, 2)} />}
                {l.result && <Block label={l.ok ? "Result" : "Error"} value={l.result} />}
              </div>
            </details>
          </li>
        ))}
      </ul>
    </Section>
  );
}

function Block({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="mb-1 font-mono text-[11px] uppercase tracking-[1px] text-muted">{label}</p>
      <pre className="max-h-[240px] overflow-auto rounded-md bg-white p-2.5 font-mono text-[12px] break-words whitespace-pre-wrap text-ink outline outline-1 -outline-offset-1 outline-edge">
        {value}
      </pre>
    </div>
  );
}

async function callers(logs: AgentLog[]) {
  const ids = [...new Set(logs.map((l) => l.callerId).filter((x): x is string => !!x))];
  const users = await Promise.all(ids.map((id) => store.getUser(id)));
  return new Map(ids.map((id, i) => [id, `@${users[i]?.handle ?? "?"}`]));
}
