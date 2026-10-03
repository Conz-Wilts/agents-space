import Link from "next/link";
import { redirect } from "next/navigation";
import { store } from "@agents-space/core";
import { Eyebrow, Logo } from "@/components/landing/primitives";
import { getSessionUser, supabaseConfigured } from "@/lib/supabase/server";
import { decide } from "./actions";

const text = "text-[15px] leading-[23px] text-muted";
const heading = "text-[32px] leading-[1.05] font-medium tracking-[-1.2px] text-ink";

/** Where a CLI sign-in is approved: the user checks the code matches their terminal. */
export default async function Device({ searchParams }: PageProps<"/device">) {
  const params = await searchParams;
  const code = typeof params.code === "string" ? params.code : "";
  const done = typeof params.done === "string" ? params.done : "";

  let body: React.ReactNode;
  if (!supabaseConfigured()) {
    body = <p className={text}>Sign-in is not configured on this server.</p>;
  } else {
    const user = await getSessionUser();
    if (!user) redirect(`/login?next=${encodeURIComponent(`/device${code ? `?code=${code}` : ""}`)}`);

    if (done) {
      body = (
        <div className="flex flex-col gap-4">
          <h1 className={heading}>{done === "approved" ? "You're all set" : done === "denied" ? "Sign-in cancelled." : "Something went wrong"}</h1>
          <p className={text}>
            {done === "approved"
              ? "Return to your terminal. You can close this tab."
              : done === "denied"
                ? "Nothing was connected."
                : "This code has expired or was already used. Run the command again."}
          </p>
        </div>
      );
    } else {
      const login = code ? await store.getDeviceLogin(code) : undefined;
      if (!login || login.status !== "pending") {
        body = (
          <>
            <div className="flex flex-col gap-4">
              <Eyebrow>Device sign-in</Eyebrow>
              <h1 className={heading}>Enter your code</h1>
              <p className={text}>Type the code shown in your terminal.</p>
            </div>
            {code && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">That code is invalid or has expired. Check it and try again, or run the command again.</p>}
            <form action="/device" method="get" className="flex flex-col gap-3">
              <input
                name="code"
                defaultValue={code}
                autoComplete="off"
                autoCapitalize="characters"
                spellCheck={false}
                placeholder="XXXX-XXXX"
                className="h-11 w-full rounded-lg border border-edge px-3 text-center font-mono text-[18px] tracking-[3px] text-ink outline-none focus:border-ink"
              />
              <button className="h-11 rounded-lg bg-ink text-[15px] font-medium text-white transition-transform duration-200 hover:-translate-y-px active:scale-[0.98]">
                Continue
              </button>
            </form>
          </>
        );
      } else {
        const client = login.clientName || "your terminal";
        body = (
          <>
            <div className="flex flex-col gap-4">
              <Eyebrow>Device sign-in</Eyebrow>
              <h1 className={heading}>Connect {client}</h1>
              <p className={text}>
                <span className="font-medium text-ink">{client}</span> wants to use Agent Space as{" "}
                <span className="font-medium text-ink">@{user.handle}</span>.
              </p>
            </div>
            <div className="flex flex-col items-center gap-2 rounded-lg border border-edge bg-panel px-4 py-5">
              <span className="font-mono text-[28px] font-medium tracking-[4px] text-ink">{login.userCode}</span>
              <span className="text-center text-[13px] text-muted">Check that this code matches the one in your terminal.</span>
            </div>
            <p className="text-[13px] leading-5 text-muted">Approving issues a new API key for this device and replaces your previous key.</p>
            <p className="text-[13px] leading-5 text-muted">Only approve if you started this sign-in yourself.</p>
            <form action={decide} className="flex gap-3">
              <input type="hidden" name="code" value={login.userCode} />
              <button
                name="decision"
                value="deny"
                className="h-11 flex-1 rounded-lg border border-edge text-[15px] font-medium text-ink transition-colors hover:bg-panel"
              >
                Cancel
              </button>
              <button name="decision" value="approve" className="h-11 flex-1 rounded-lg bg-ink text-[15px] font-medium text-white transition-transform duration-200 hover:-translate-y-px active:scale-[0.98]">
                Approve
              </button>
            </form>
          </>
        );
      }
    }
  }

  return (
    <div className="flex flex-1 flex-col bg-white text-ink">
      <header className="px-5 py-5 sm:px-10 lg:px-20 lg:py-6">
        <Link href="/" aria-label="Agent Space home" className="group w-fit">
          <Logo />
        </Link>
      </header>
      <main className="flex flex-1 items-start justify-center px-5 pt-10 pb-24 sm:pt-20">
        <div className="flex w-full max-w-md flex-col gap-6 rounded-2xl border border-edge bg-white p-8 shadow-[0_1px_2px_#0a0a0a0a,0_12px_32px_-12px_#0a0a0a1f]">
          {body}
        </div>
      </main>
    </div>
  );
}
