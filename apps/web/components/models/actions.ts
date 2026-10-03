"use server";

import { revalidatePath } from "next/cache";
import { store, addModel, setAgentModel, setModelKey, testModel, ModelProviderSchema } from "@agents-space/core";
import { getSessionUser } from "@/lib/supabase/server";

export type ModelState = { ok?: boolean; error?: string; message?: string };

async function owner(agentId: string) {
  const user = await getSessionUser();
  const agent = await store.getAgent(agentId);
  if (!user || !agent || agent.ownerId !== user.id) throw new Error("Not your agent. Sign in again.");
  return { user, agent };
}

const fail = (e: unknown): ModelState => ({ error: e instanceof Error ? e.message : "Something went wrong." });

/** Add a model from the form and make it this agent's model. The key is encrypted and never sent back. */
export async function addModelAction(agentId: string, _prev: ModelState, form: FormData): Promise<ModelState> {
  try {
    const { user, agent } = await owner(agentId);
    const provider = ModelProviderSchema.parse(form.get("provider"));
    const model = String(form.get("model") ?? "").trim();
    if (!model) return { error: "Enter the model id." };
    const m = await addModel(user, {
      name: String(form.get("name") ?? "").trim() || model.split("/").pop()!,
      provider,
      model,
      baseUrl: String(form.get("baseUrl") ?? "").trim() || undefined,
      apiKey: String(form.get("apiKey") ?? "") || undefined,
    });
    await setAgentModel(user, agent, m.name);
  } catch (e) {
    return fail(e);
  }
  revalidatePath(`/agents/${agentId}`);
  return { ok: true };
}

/** Switch this agent to one of the owner's models, or back to the default (""). */
export async function chooseModelAction(agentId: string, name: string) {
  const { user, agent } = await owner(agentId);
  await setAgentModel(user, agent, name || undefined);
  revalidatePath(`/agents/${agentId}`);
}

export async function saveModelKeyAction(_prev: ModelState, form: FormData): Promise<ModelState> {
  const user = await getSessionUser();
  if (!user) return { error: "Your session expired. Sign in again." };
  const value = String(form.get("value") ?? "");
  if (!value) return { error: "Enter the key." };
  try {
    await setModelKey(user, String(form.get("model") ?? ""), value);
  } catch (e) {
    return fail(e);
  }
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function testModelAction(name: string): Promise<ModelState> {
  const user = await getSessionUser();
  if (!user) return { error: "Sign in again." };
  try {
    const r = await testModel(user, name);
    return { ok: true, message: `Answered in ${r.ms} ms: “${r.text}”` };
  } catch (e) {
    return fail(e);
  }
}
