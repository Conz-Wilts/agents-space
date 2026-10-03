"use server";

import { revalidatePath } from "next/cache";
import { store } from "@agents-space/core";
import { getSessionUser } from "@/lib/supabase/server";

async function ownedAgent(agentId: string) {
  const user = await getSessionUser();
  const agent = await store.getAgent(agentId);
  if (!user || !agent || agent.ownerId !== user.id) throw new Error("Not your agent.");
  return agent;
}

export async function setVisibility(agentId: string, visibility: "public" | "private") {
  await ownedAgent(agentId);
  await store.updateAgent(agentId, { visibility });
  revalidatePath(`/agents/${agentId}`);
  revalidatePath("/my-agents");
}

/** Approve or deny a request on one of the signed-in user's agents. */
export async function decideRequest(requestId: string, decision: "approved" | "denied") {
  const user = await getSessionUser();
  if (!user) throw new Error("Sign in again.");
  const r = (await store.listAccessRequests({ ownerId: user.id })).find((x) => x.id === requestId);
  if (!r) throw new Error("No such request on your agents.");
  await store.decideAccessRequest(r.id, decision);
  revalidatePath("/my-agents");
  revalidatePath(`/agents/${r.agentId}`);
}

export type RequestState = { ok?: boolean; error?: string };

export async function requestAccess(agentId: string, _prev: RequestState, form: FormData): Promise<RequestState> {
  const user = await getSessionUser();
  if (!user) return { error: "Sign in to request access." };
  const agent = await store.getAgent(agentId);
  if (!agent || agent.status !== "published") return { error: "This agent isn't published." };
  if (await store.hasAccess(agentId, user.id)) return { ok: true };
  await store.requestAccess(agentId, user.id, String(form.get("message") ?? "").slice(0, 500));
  revalidatePath(`/agents/${agentId}`);
  return { ok: true };
}
