import { runDueSchedules } from "@agents-space/core";

// LLM runs take a while; give the batch room.
export const maxDuration = 300;

/**
 * Vercel Cron hits this every minute (apps/mcp/vercel.json) and runs scheduled agents that are
 * due. Vercel sends `Authorization: Bearer $CRON_SECRET`; without CRON_SECRET it only runs locally.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret ? req.headers.get("authorization") !== `Bearer ${secret}` : process.env.NODE_ENV === "production")
    return Response.json({ error: "unauthorized" }, { status: 401 });
  const runs = await runDueSchedules();
  return Response.json({ ran: runs.length, runs: runs.map(({ id, status, steps }) => ({ id, status, steps })) });
}
