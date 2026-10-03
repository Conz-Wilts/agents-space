import { store, slug } from "./store";
import type { Agent, Payment, Price, User } from "./schema";

/**
 * Payments: an owner turns on Stripe Connect (an Express account under the platform's Stripe
 * account), sets prices on their space or agent, and callers' agents get a Stripe Checkout link
 * for one of those prices. Destination charges: the session lives on the platform and the money
 * is transferred to the owner's account. No webhook: check_payment asks Stripe for the status.
 */

const API = "https://api.stripe.com/v1";

export const paymentsEnabled = () => !!process.env.STRIPE_SECRET_KEY;

/** Stripe wants form encoding with bracketed keys: `a[b][c]=v`. */
function form(params: Record<string, unknown>, prefix = "", out = new URLSearchParams()) {
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null) continue;
    const key = prefix ? `${prefix}[${k}]` : k;
    if (typeof v === "object") form(v as Record<string, unknown>, key, out);
    else out.append(key, String(v));
  }
  return out;
}

type StripeObject = Record<string, any>;

async function stripe(method: "GET" | "POST", path: string, params: Record<string, unknown> = {}): Promise<StripeObject> {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("Payments aren't set up on this Agents Space deployment (no STRIPE_SECRET_KEY).");
  const body = form(params);
  const res = await fetch(method === "GET" && body.size ? `${API}${path}?${body}` : `${API}${path}`, {
    method,
    headers: { authorization: `Bearer ${key}`, ...(method === "POST" ? { "content-type": "application/x-www-form-urlencoded" } : {}) },
    body: method === "POST" ? body : undefined,
    signal: AbortSignal.timeout(20_000),
    cache: "no-store",
  });
  const json = (await res.json()) as StripeObject;
  if (!res.ok) throw new Error(`Stripe: ${json.error?.message ?? res.statusText}`);
  return json;
}

let platform: Promise<StripeObject> | undefined;
const platformAccount = () => (platform ??= stripe("GET", "/account").catch((e) => ((platform = undefined), Promise.reject(e))));

/** Currencies Stripe counts in whole units (no cents). */
const ZERO_DECIMAL = new Set(["bif", "clp", "djf", "gnf", "jpy", "kmf", "krw", "mga", "pyg", "rwf", "ugx", "vnd", "vuv", "xaf", "xof", "xpf"]);
const factor = (currency: string) => (ZERO_DECIMAL.has(currency) ? 1 : 100);

/** `800, "mxn"` → `80000` (centavos). */
export const toMinor = (amount: number, currency: string) => Math.round(amount * factor(currency));

/** `80000, "mxn"` → `MX$800.00`. */
export function money(minor: number, currency: string) {
  const major = minor / factor(currency);
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: currency.toUpperCase() }).format(major);
  } catch {
    return `${major} ${currency.toUpperCase()}`;
  }
}

export type PayoutStatus = {
  accountId?: string;
  /** Callers can pay: the account can receive transfers. */
  ready: boolean;
  payoutsEnabled: boolean;
  /** What Stripe still needs from the owner, if anything. */
  due: string[];
};

function statusOf(acct: StripeObject): PayoutStatus {
  return {
    accountId: acct.id,
    ready: acct.capabilities?.transfers === "active",
    payoutsEnabled: !!acct.payouts_enabled,
    due: [...(acct.requirements?.currently_due ?? []), ...(acct.requirements?.past_due ?? [])].filter((x, i, a) => a.indexOf(x) === i),
  };
}

/** Where the user's Stripe account stands (no account = not ready). */
export async function payoutStatus(user: User): Promise<PayoutStatus> {
  if (!user.stripeAccountId) return { ready: false, payoutsEnabled: false, due: [] };
  return statusOf(await stripe("GET", `/accounts/${user.stripeAccountId}`));
}

/**
 * Turn on payments for a user: create their Express account the first time (in `country`), then
 * return a fresh onboarding link while Stripe still needs details (links are single-use and short-lived).
 * Accounts outside the platform's country get the recipient agreement (transfers only), which is
 * what Stripe allows for cross-border payouts.
 */
export async function enablePayments(
  user: User,
  opts: { country?: string; returnUrl: string; refreshUrl: string },
): Promise<{ user: User; status: PayoutStatus; onboardingUrl?: string; created: boolean }> {
  let created = false;
  if (!user.stripeAccountId) {
    const country = (opts.country ?? (await platformAccount()).country).toUpperCase();
    const crossBorder = country !== (await platformAccount()).country;
    const acct = await stripe("POST", "/accounts", {
      type: "express",
      country,
      email: user.email,
      business_profile: { name: `@${user.handle}` },
      capabilities: crossBorder ? { transfers: { requested: true } } : { card_payments: { requested: true }, transfers: { requested: true } },
      ...(crossBorder ? { tos_acceptance: { service_agreement: "recipient" } } : {}),
      metadata: { agents_space_user: user.id, handle: user.handle },
    });
    user = await store.setStripeAccount(user.id, acct.id);
    created = true;
  }
  const status = await payoutStatus(user);
  if (status.ready && !status.due.length) return { user, status, created };
  const link = await stripe("POST", "/account_links", {
    account: user.stripeAccountId,
    type: "account_onboarding",
    return_url: opts.returnUrl,
    refresh_url: opts.refreshUrl,
  });
  return { user, status, onboardingUrl: link.url, created };
}

/** A one-time sign-in link to the owner's Stripe Express dashboard (payouts, payments). */
export async function stripeDashboardLink(user: User) {
  if (!user.stripeAccountId) throw new Error("You haven't turned on payments yet. Use enable_payments.");
  return (await stripe("POST", `/accounts/${user.stripeAccountId}/login_links`)).url as string;
}

/** Create or replace a price on an agent. `amount` is in major units (800 = MX$800.00). */
export async function setPrice(agent: Agent, p: { name: string; title: string; description?: string; amount: number; currency: string }) {
  const currency = p.currency.trim().toLowerCase();
  if (!/^[a-z]{3}$/.test(currency)) throw new Error(`Currency must be a 3-letter code like "mxn" or "usd" (got "${p.currency}").`);
  const amount = toMinor(p.amount, currency);
  if (!(amount > 0)) throw new Error("Amount must be more than 0.");
  const name = slug(p.name);
  if (!name) throw new Error("Give the price a short name, e.g. 'cleaning'.");
  return store.upsertPrice({ agentId: agent.id, name, title: p.title, description: p.description ?? "", amount, currency });
}

export const priceLine = (p: Price) => `${p.name}: ${p.title} — ${money(p.amount, p.currency)}${p.description ? ` (${p.description})` : ""}`;

/** Prices callers of this agent can pay, or [] when the owner can't take payments. */
export async function payablePrices(agent: Agent): Promise<Price[]> {
  if (!paymentsEnabled() || !agent.ownerId) return [];
  const [prices, owner] = await Promise.all([store.listPrices(agent.id), store.getUser(agent.ownerId)]);
  return prices.length && owner?.stripeAccountId ? prices : [];
}

/**
 * A Stripe Checkout link for one of the agent's prices. The caller's agent hands it to its human
 * (or pays it). `note` says what it's for ("Cleaning, Tue Oct 7 10:00") and shows on the checkout page.
 */
export async function requestPayment(
  agent: Agent,
  priceName: string,
  opts: { payer?: User; note?: string; successUrl: string; cancelUrl: string },
): Promise<Payment> {
  const price = (await store.listPrices(agent.id)).find((p) => p.name === slug(priceName));
  if (!price) {
    const all = await store.listPrices(agent.id);
    throw new Error(`${agent.name} has no price "${priceName}". ${all.length ? `Prices: ${all.map(priceLine).join("; ")}` : "It doesn't charge for anything."}`);
  }
  const owner = agent.ownerId ? await store.getUser(agent.ownerId) : undefined;
  const status = owner ? await payoutStatus(owner) : undefined;
  if (!owner?.stripeAccountId || !status?.ready)
    throw new Error(`${agent.name} can't take payments yet: the owner hasn't finished setting up Stripe (enable_payments).`);

  const note = opts.note?.trim().slice(0, 300) ?? "";
  const metadata = { agent_id: agent.id, price: price.name, payer_id: opts.payer?.id ?? "", note };
  const session = await stripe("POST", "/checkout/sessions", {
    mode: "payment",
    line_items: {
      0: {
        quantity: 1,
        price_data: {
          currency: price.currency,
          unit_amount: price.amount,
          product_data: { name: `${price.title} · ${agent.name}`, description: note || price.description || undefined },
        },
      },
    },
    payment_intent_data: { transfer_data: { destination: owner.stripeAccountId }, description: `${agent.name}: ${price.title}${note ? ` (${note})` : ""}`, metadata },
    metadata,
    success_url: opts.successUrl,
    cancel_url: opts.cancelUrl,
  });
  return store.addPayment({
    agentId: agent.id,
    price: price.name,
    payerId: opts.payer?.id,
    amount: price.amount,
    currency: price.currency,
    note,
    stripeSessionId: session.id,
    url: session.url,
  });
}

/**
 * The payment, refreshed from Stripe. Only the payer and the agent's owner may look (anonymous
 * payments: whoever holds the id).
 */
export async function checkPayment(id: string, viewer?: User): Promise<Payment> {
  const p = await store.getPayment(id);
  const agent = p ? await store.getAgent(p.agentId) : undefined;
  const isOwner = !!viewer && agent?.ownerId === viewer.id;
  if (!p || (p.payerId && p.payerId !== viewer?.id && !isOwner)) throw new Error(`No payment "${id}".`);
  if (p.status !== "open") return p;
  const s = await stripe("GET", `/checkout/sessions/${p.stripeSessionId}`);
  if (s.payment_status === "paid" || s.payment_status === "no_payment_required") return store.setPaymentStatus(p.id, "paid");
  if (s.status === "expired") return store.setPaymentStatus(p.id, "expired");
  return p;
}

export const paymentLine = (p: Payment) =>
  `${p.id} · ${p.price} · ${money(p.amount, p.currency)} · ${p.status}${p.paidAt ? ` (paid ${p.paidAt.slice(0, 16).replace("T", " ")} UTC)` : ""}${p.note ? ` · ${p.note}` : ""}`;
