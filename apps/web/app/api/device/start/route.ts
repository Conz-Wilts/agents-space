import { store } from "@agents-space/core";

const headers = { "Cache-Control": "no-store" };

/** Device login, step 1: the CLI gets a device code to poll with and a user code to show the human. */
export async function POST(req: Request) {
  const body: unknown = await req.json().catch(() => null);
  const name = body && typeof body === "object" && "client_name" in body ? body.client_name : undefined;
  const { deviceCode, userCode } = await store.startDeviceLogin(typeof name === "string" ? name : undefined);
  const origin = process.env.NEXT_PUBLIC_WEB_URL ?? new URL(req.url).origin;
  return Response.json(
    {
      device_code: deviceCode,
      user_code: userCode,
      verification_uri: `${origin}/device`,
      verification_uri_complete: `${origin}/device?code=${userCode}`,
      expires_in: 600,
      interval: 2,
    },
    { headers },
  );
}
