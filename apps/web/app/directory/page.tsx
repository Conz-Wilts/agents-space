import Link from "next/link";
import { store } from "@agents-space/core";
import { AppPage } from "@/components/landing/app-page";
import { AgentTile, EmptyState, Monogram, PageTitle, SectionHead, TileGrid } from "@/components/landing/directory";
import { d } from "@/components/landing/primitives";

export default async function Directory({ searchParams }: PageProps<"/directory">) {
  const { q } = await searchParams;
  const query = typeof q === "string" ? q : undefined;
  const agents = await store.listAgents({ query });

  // People = agent owners, most agents first.
  const people = [...agents.reduce((m, a) => m.set(a.owner, (m.get(a.owner) ?? 0) + 1), new Map<string, number>())].sort(
    (a, b) => b[1] - a[1],
  );

  return (
    <AppPage>
      <section data-animate className="flex flex-col gap-10 px-5 pt-10 pb-14 sm:px-10 lg:px-20 lg:pt-16 lg:pb-20">
        <PageTitle
          eyebrow="Directory"
          title="Agents you can call."
          aside={
            <p className="text-[17px] leading-[26px] text-muted">
              Every agent here takes a job off someone’s plate. Open one to see what it knows, or connect it to your
              own agent over MCP.
            </p>
          }
        />
        <form action="/directory" className="r relative w-full max-w-xl" style={d(450)}>
          <svg
            aria-hidden
            viewBox="0 0 20 20"
            className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted"
          >
            <path
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              d="m14 14 4 4M16 9A7 7 0 1 1 2 9a7 7 0 0 1 14 0Z"
            />
          </svg>
          <input
            name="q"
            type="search"
            defaultValue={query}
            placeholder="Search agents, tools, people"
            className="h-12 w-full rounded-lg bg-white pr-28 pl-11 text-[15px] text-ink outline outline-1 -outline-offset-1 outline-edge transition-[outline-color] placeholder:text-muted focus:outline-ink"
          />
          <button
            type="submit"
            className="absolute top-1.5 right-1.5 h-9 rounded-md bg-ink px-4 text-[14px] font-medium text-white transition-transform duration-200 hover:-translate-y-px active:scale-[0.98]"
          >
            Search
          </button>
        </form>
      </section>

      <section className="flex flex-col gap-16 border-t border-edge bg-panel px-5 py-16 sm:px-10 lg:px-20 lg:py-20">
        <div data-animate className="flex flex-col gap-6">
          <SectionHead label={query ? `Results for “${query}”` : "Agents"} count={agents.length} />
          {agents.length === 0 ? (
            <EmptyState>
              No matches.{" "}
              <Link href="/directory" className="text-ink underline underline-offset-4">
                Clear search
              </Link>
            </EmptyState>
          ) : (
            <TileGrid>
              {agents.map((a, i) => (
                <li key={a.id}>
                  <AgentTile agent={a} delay={150 + Math.min(i, 8) * 70} />
                </li>
              ))}
            </TileGrid>
          )}
        </div>

        {people.length > 0 && (
          <div data-animate className="flex flex-col gap-6">
            <SectionHead label="People" count={people.length} />
            <ul className="flex flex-wrap gap-3">
              {people.map(([name, count], i) => (
                <li
                  key={name}
                  className="r flex items-center gap-2.5 rounded-full bg-white py-1.5 pr-4 pl-1.5 outline outline-1 -outline-offset-1 outline-edge"
                  style={d(150 + Math.min(i, 10) * 50)}
                >
                  <Monogram name={name} size={28} />
                  <span className="text-[15px] text-ink">{name}</span>
                  <span className="font-mono text-[12px] text-muted">{count}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
    </AppPage>
  );
}
