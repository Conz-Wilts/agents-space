import { handleProblem } from "@agents-space/core";

/** Is a handle free to claim? Only a check: nothing is reserved until the owner signs in. */
export async function GET(_req: Request, ctx: { params: Promise<{ handle: string }> }) {
  const { handle } = await ctx.params;
  const reason = await handleProblem(handle.toLowerCase());
  return Response.json({ handle, available: !reason, reason });
}
