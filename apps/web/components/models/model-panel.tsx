import { store, DEFAULT_MODEL, PROVIDERS, modelProblem, type Agent, type Model } from "@agents-space/core";
import { AddModelForm, ModelKeyForm, ModelPicker, TestModelButton, type ProviderOption } from "./model-forms";

const providerOptions: ProviderOption[] = Object.entries(PROVIDERS).map(([id, p]) => ({ id, ...p }));

/** One model as a card. Owners get the key row and a test button; nobody ever sees the key. */
export function ModelCard({ model: m, owner }: { model: Model; owner?: boolean }) {
  const problem = modelProblem(m);
  return (
    <div className="flex flex-col divide-y divide-edge overflow-hidden rounded-[14px] bg-white outline outline-1 -outline-offset-1 outline-edge">
      <div className="flex flex-col gap-1 px-4 py-3">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h3 className="text-[19px] font-medium tracking-[-0.4px] text-ink">{m.title}</h3>
          <span className="font-mono text-[12px] uppercase tracking-[1px] text-muted">{PROVIDERS[m.provider].label}</span>
        </div>
        <code className="font-mono text-[13px] break-all text-muted">{m.model}</code>
        {owner && m.baseUrl && <code className="font-mono text-[12px] break-all text-muted">{m.baseUrl}</code>}
      </div>
      {owner && (
        <div className="flex flex-col gap-3 bg-panel/60 px-4 py-3">
          {PROVIDERS[m.provider].needsKey && <ModelKeyForm model={m.name} isSet={m.hasKey} />}
          {!problem && <TestModelButton model={m.name} />}
        </div>
      )}
    </div>
  );
}

/** The agent's current model, plus (for its owner) switching and adding models. */
export async function ModelPanel({ agent, owner }: { agent: Agent; owner: boolean }) {
  const [current, mine] = await Promise.all([
    agent.model ? store.getModel(agent.model) : undefined,
    owner && agent.ownerId ? store.listModels(agent.ownerId) : [],
  ]);
  return (
    <div className="flex flex-col gap-6">
      <p className="text-[15px] leading-[23px] text-muted">
        {agent.mode === "scheduled"
          ? "The model that runs this agent on its schedule."
          : "People's agents bring their own model when they call this skill. This one is used when Agents Space runs the agent itself."}
      </p>
      {owner && (
        <ModelPicker
          agentId={agent.id}
          current={agent.model}
          defaultLabel={DEFAULT_MODEL}
          models={mine.map((m) => ({ name: m.name, label: `${m.title} · ${PROVIDERS[m.provider].label}` }))}
        />
      )}
      {current ? (
        <ModelCard model={current} owner={owner} />
      ) : (
        <div className="rounded-[14px] bg-white px-4 py-3 outline outline-1 -outline-offset-1 outline-edge">
          <h3 className="text-[17px] font-medium text-ink">Platform default</h3>
          <code className="font-mono text-[13px] text-muted">{DEFAULT_MODEL}</code>
        </div>
      )}
    </div>
  );
}

export function AddModelPanel({ agentId }: { agentId: string }) {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-[15px] leading-[23px] text-muted">
        Add a model from OpenAI, Anthropic, Google, OpenRouter (any model it lists), an OpenAI-compatible API, or the Vercel AI Gateway. It becomes this agent&apos;s model and stays in your list for other agents.
      </p>
      <AddModelForm agentId={agentId} providers={providerOptions} />
    </div>
  );
}
