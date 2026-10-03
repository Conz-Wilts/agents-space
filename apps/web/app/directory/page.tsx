import Link from "next/link";
import { store } from "@agents-space/core";

const MCP_URL = process.env.NEXT_PUBLIC_MCP_URL ?? "http://localhost:3001/mcp";

export default async function Home({ searchParams }: PageProps<"/directory">) {
  const { q } = await searchParams;
  const query = typeof q === "string" ? q : undefined;
  const [agents, bottlenecks] = await Promise.all([store.listAgents({ query }), store.listBottlenecks()]);

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-12 sm:px-6">
      <header className="mb-10">
        <p className="font-mono text-xs uppercase tracking-widest text-zinc-500">Agents Space</p>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight sm:text-5xl">Stop being the bottleneck.</h1>
        <p className="mt-4 max-w-2xl text-lg text-zinc-600 dark:text-zinc-400">
          The public directory for agents. Tell our MCP where work waits on you and which tools you use — it
          finds the agents that take it off your plate.
        </p>
        <div className="mt-6 rounded-lg border border-zinc-200 bg-zinc-50 p-4 font-mono text-sm dark:border-zinc-800 dark:bg-zinc-900">
          <span className="text-zinc-500">Connect your MCP client →</span> {MCP_URL}
        </div>
      </header>

      <form className="mb-8 flex gap-2">
        <input
          name="q"
          defaultValue={query}
          placeholder="What's waiting on you? e.g. chasing invoices in Stripe"
          className="flex-1 rounded-md border border-zinc-300 bg-transparent px-3 py-2 dark:border-zinc-700"
        />
        <button className="rounded-md bg-foreground px-4 py-2 text-background">Search</button>
        {query && (
          <Link href="/directory" className="self-center px-2 text-sm text-zinc-500 underline">
            clear
          </Link>
        )}
      </form>

      <section>
        <h2 className="mb-4 text-sm font-medium uppercase tracking-wide text-zinc-500">
          {query ? `Agents for “${query}”` : "Agent directory"} · {agents.length}
        </h2>
        <ul className="grid gap-4 sm:grid-cols-2">
          {agents.map((a) => (
            <li key={a.id} className="rounded-xl border border-zinc-200 p-5 dark:border-zinc-800">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-semibold">{a.name}</h3>
                <span className="rounded bg-zinc-100 px-2 py-0.5 font-mono text-xs dark:bg-zinc-800">{a.protocol}</span>
              </div>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{a.tagline}</p>
              <div className="mt-3 flex flex-wrap gap-1">
                {a.tools.map((t) => (
                  <span key={t} className="rounded-full border border-zinc-200 px-2 py-0.5 text-xs dark:border-zinc-700">
                    {t}
                  </span>
                ))}
              </div>
              <p className="mt-3 text-xs text-zinc-500">
                {a.category} · {a.pricing}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-12">
        <h2 className="mb-4 text-sm font-medium uppercase tracking-wide text-zinc-500">Recent bottlenecks</h2>
        {bottlenecks.length === 0 ? (
          <p className="text-sm text-zinc-500">
            None yet. Call <code className="font-mono">describe_bottleneck</code> from your MCP client.
          </p>
        ) : (
          <ul className="space-y-3">
            {bottlenecks.slice(0, 10).map((b) => (
              <li key={b.id} className="rounded-lg border border-zinc-200 p-4 text-sm dark:border-zinc-800">
                <p className="font-medium">{b.role}</p>
                <p className="text-zinc-600 dark:text-zinc-400">{b.description}</p>
                <p className="mt-1 text-xs text-zinc-500">
                  {b.tools.join(", ")} · {b.matchedAgentIds.length} matches
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
