import { store, RESERVED_HANDLES, SPACE_CATEGORY } from "./store";
import type { Agent, User } from "./schema";

/**
 * A space is a person's or business's own hosted agent, reached at `/<handle>/mcp`: what they
 * share (context notes, connector actions) plus their rules (instructions). Its id is the owner's
 * handle, so one handle = one address. Claiming needs a verified (Google) sign-in, and locks the
 * handle: addresses never change once given out.
 */

const HANDLE = /^[a-z0-9][a-z0-9-]{0,30}[a-z0-9]$/;

const STARTER_RULES = `You answer on behalf of the owner of this space. Use only the context and actions shared here.

- Answer on your own: questions the shared context covers.
- Ask the owner first: anything not covered here, anything that commits them to something.
- Never: share anything that isn't in this space.`;

/** Why `handle` can't be claimed (by `userId`, if given), or undefined when it can. */
export async function handleProblem(handle: string, userId?: string): Promise<string | undefined> {
  if (!HANDLE.test(handle)) return "Use 2–32 lowercase letters, numbers or dashes (not at the start or end).";
  if (RESERVED_HANDLES.has(handle)) return `"${handle}" is reserved.`;
  const [owner, agent] = await Promise.all([store.userByHandle(handle), store.getAgent(handle)]);
  if ((owner && owner.id !== userId) || (agent && agent.ownerId !== userId)) return `"${handle}" is taken.`;
  if (agent) return `You already have an agent called "${handle}". Pick another handle.`;
  return undefined;
}

/** The user's space, if they claimed one. */
export async function getSpace(user: User): Promise<Agent | undefined> {
  const a = await store.getAgent(user.handle);
  return a && a.ownerId === user.id && a.kind === "hosted" && a.category === SPACE_CATEGORY ? a : undefined;
}

/**
 * Claim `handle` for a signed-in user and create their space (restricted: only people they
 * approve can see or call it). Idempotent for the handle they already claimed.
 */
export async function claimSpace(user: User, handle: string, endpointFor: (id: string) => string): Promise<{ user: User; space: Agent; created: boolean }> {
  if (!user.authId) throw new Error("Sign in with Google to claim a space. Accounts made with only an API key can't claim one.");
  const existing = await getSpace(user);
  if (existing) {
    if (existing.id === handle) return { user, space: existing, created: false };
    throw new Error(`You already have a space at ${existing.endpoint ?? existing.id}. Handles are locked once claimed.`);
  }
  const problem = await handleProblem(handle, user.id);
  if (problem) throw new Error(problem);

  const owner = user.handle === handle ? user : await store.setHandle(user.id, handle);
  const space = await store
    .addAgent(
      {
        name: `@${handle}`,
        tagline: `${handle}'s space`,
        description: "",
        solves: [],
        tools: [],
        category: SPACE_CATEGORY,
        endpoint: endpointFor(handle),
        protocol: "mcp",
        owner: `@${handle}`,
        ownerId: owner.id,
        pricing: "free",
        kind: "hosted",
        visibility: "restricted",
        status: "published",
        instructions: STARTER_RULES,
      },
      { id: handle },
    )
    .catch(async (e) => {
      // Lost a race for the agent id: give the old handle back so the user isn't stuck without a space.
      if (owner.handle !== user.handle) await store.setHandle(user.id, user.handle);
      throw e;
    });
  return { user: owner, space, created: true };
}
