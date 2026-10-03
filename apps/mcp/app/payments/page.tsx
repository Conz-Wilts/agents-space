/** Where Stripe sends people back to: after paying a checkout link, or after Stripe onboarding. */
const MESSAGES: Record<string, [string, string]> = {
  paid: ["Payment received", "Thanks! You can close this tab. Your agent can confirm it with check_payment."],
  cancelled: ["Payment cancelled", "Nothing was charged. Your agent can ask for a new link with request_payment."],
  connected: ["Stripe is set up", "Go back to your agent and run enable_payments to check your status. Then set prices with set_price."],
  refresh: ["That link expired", "Go back to your agent and run enable_payments again for a fresh Stripe link."],
};

export default async function Payments({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status = "" } = await searchParams;
  const [title, body] = MESSAGES[status] ?? ["Agents Space payments", "Payments for spaces and agents go through Stripe."];
  return (
    <main>
      <h1>{title}</h1>
      <p>{body}</p>
    </main>
  );
}
