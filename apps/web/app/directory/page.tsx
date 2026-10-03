import Link from "next/link";
import { store } from "@agents-space/core";
import { SiteHeader } from "../header";
import { AgentCard, PersonIcon } from "../ui";

export default async function Home({ searchParams }: PageProps<"/directory">) {
  const { q } = await searchParams;
  const query = typeof q === "string" ? q : undefined;
  const agents = await store.listAgents({ query });

  // People = agent owners, most agents first.
  const people = [...agents.reduce((m, a) => m.set(a.owner, (m.get(a.owner) ?? 0) + 1), new Map<string, number>())].sort(
    (a, b) => b[1] - a[1],
  );

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-6 sm:px-6">
      <SiteHeader />

      <form action="/directory" className="relative max-w-xl">
        <svg
          aria-hidden
          viewBox="0 0 20 20"
          className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-fg-muted"
        >
          <path
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            d="m14 14 4 4M16 9A7 7 0 1 1 2 9a7 7 0 0 1 14 0Z"
          />
        </svg>
        <input
          name="q"
          type="search"
          defaultValue={query}
          placeholder="Search agents"
          className="h-11 w-full rounded-full border border-line bg-surface-subtle pl-11 pr-4 text-sm outline-none transition placeholder:text-fg-muted focus:border-brand focus:bg-surface"
        />
      </form>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-fg-secondary">Agents</h2>
        {agents.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-line p-10 text-center text-sm text-fg-muted">
            No matches.{" "}
            <Link href="/directory" className="text-brand hover:underline">
              Clear
            </Link>
          </p>
        ) : (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {agents.map((a) => (
              <li key={a.id}>
                <AgentCard agent={a} />
              </li>
            ))}
          </ul>
        )}
      </section>

      {people.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-fg-secondary">People</h2>
          <ul className="flex flex-wrap gap-5">
            {people.map(([name, count]) => (
              <PersonIcon key={name} name={name} count={count} />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
