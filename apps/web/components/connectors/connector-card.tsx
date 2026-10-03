import { store, type Connector } from "@agents-space/core";
import { SecretForm } from "./secret-form";

/**
 * A connector as callers see it: title, description and what each action does. Nothing about how it
 * connects (URLs, hosts, headers, secret names) is rendered unless `owner`, which adds the secret rows.
 */
export async function ConnectorCard({ connector: c, only, owner }: { connector: Connector; only?: string[]; owner?: boolean }) {
  const actions = only?.length ? c.actions.filter((a) => only.includes(a.name)) : c.actions;
  const set = owner ? await store.getSecrets(c.name) : {};

  return (
    <div className="flex flex-col gap-3">
      <div>
        <h3 className="text-[19px] font-medium tracking-[-0.4px] text-ink">{c.title}</h3>
        {c.description && <p className="mt-1 text-[15px] leading-[23px] text-muted">{c.description}</p>}
      </div>

      <ul className="flex flex-col divide-y divide-edge overflow-hidden rounded-[14px] bg-white outline outline-1 -outline-offset-1 outline-edge">
        {actions.map((a) => (
          <li key={a.name} className="flex flex-col gap-1 px-4 py-3">
            <code className="font-mono text-[13px] text-ink">{a.name}</code>
            <p className="text-[14px] leading-[21px] text-muted">{a.description}</p>
          </li>
        ))}
        {owner && c.secrets.map((s) => <SecretForm key={s} connector={c.name} name={s} isSet={!!set[s]} />)}
      </ul>
    </div>
  );
}
