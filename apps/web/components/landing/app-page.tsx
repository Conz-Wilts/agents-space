import type { ReactNode } from "react";
import { Nav } from "./hero";
import { LandingMotion } from "./motion";
import { Footer } from "./sections";

/** Shell for app pages in the landing design: sticky landing nav, footer and reveal motion. */
export function AppPage({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-1 flex-col overflow-x-clip bg-white text-ink">
      <Nav />
      <main className="flex-1">{children}</main>
      <Footer />
      <LandingMotion />
    </div>
  );
}
