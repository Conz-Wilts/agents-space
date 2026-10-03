import { AgentStrip, Hero, Nav, Problem } from "@/components/landing/hero";
import { LandingMotion } from "@/components/landing/motion";
import { Network } from "@/components/landing/network";
import { FinalCta, Footer, HowItWorks, Rules, Stories } from "@/components/landing/sections";

// Landing page, coded from the "Agent Space — Landing" frame in AgentSpace.pen.
// Light-only by design: the root pins its own colors so the body's dark-mode flip doesn't leak in.
export default function Landing() {
  return (
    <div className="flex-1 overflow-x-clip bg-white text-ink">
      <Nav />
      <main>
        <Hero />
        <AgentStrip />
        <Problem />
        <Network />
        <Stories />
        <Rules />
        <HowItWorks />
        <FinalCta />
      </main>
      <Footer />
      <LandingMotion />
    </div>
  );
}
