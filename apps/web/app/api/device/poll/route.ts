import { store } from "@agents-space/core";

const headers = { "Cache-Control": "no-store" };

/** Device login, step 2: the CLI polls until the human decides. An approved poll returns the API key once. */
export async function POST(req: Request) {
  const body: unknown = await req.json().catch(() => null);
  const code = body && typeof body === "object" && "device_code" in body ? body.device_code : undefined;
  if (typeof code !== "string" || !code) return Response.json({ error: "device_code is required" }, { status: 400, headers });
  const r = await store.redeemDeviceLogin(code);
  if (r.status !== "approved") return Response.json({ status: r.status }, { headers });
  return Response.json(
    {
      status: "approved",
      api_key: r.apiKey,
      handle: r.user.handle,
      mcp_url: process.env.NEXT_PUBLIC_MCP_URL ?? "http://localhost:3001/mcp",
    },
    { headers },
  );
}
