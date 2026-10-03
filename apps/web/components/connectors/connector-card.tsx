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
        <h3 className="text-base font-semibold">{c.title}</h3>
        {c.description && <p className="text-sm text-fg-muted">{c.description}</p>}
      </div>

      <ul className="flex flex-col divide-y divide-line rounded-xl border border-line">
        {actions.map((a) => (
          <li key={a.name} className="px-3 py-2">
            <code className="font-mono text-xs font-medium">{a.name}</code>
            <p className="text-xs text-fg-muted">{a.description}</p>
          </li>
        ))}
        {owner && c.secrets.map((s) => <SecretForm key={s} connector={c.name} name={s} isSet={!!set[s]} />)}
      </ul>
    </div>
  );
}
