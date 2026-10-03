import { store, publicAgent } from "@agents-space/core";

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q") ?? undefined;
  return Response.json((await store.listAgents({ query: q })).map(publicAgent));
}
