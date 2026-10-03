/* eslint-disable @next/next/no-img-element -- tiny static logos; next/image adds nothing here */

// Real personal agents shown calling spaces on the landing. Logos are their own marks,
// used to show who's calling; scenes are illustrative (see the disclaimer in AgentStrip).
export const AGENTS = {
  muse: { name: "Muse", by: "Meta", logo: "/agents/muse.svg", tile: "bg-white", pad: "p-1.5" },
  instinct: { name: "Instinct", by: "Spear Street", logo: "/agents/instinct.png", tile: "bg-white", pad: "p-1" },
  grok: { name: "Grok Bot", by: "xAI", logo: "/agents/grok.png", tile: "bg-black", pad: "p-0" },
  claude: { name: "Claude", by: "Anthropic", logo: "/agents/claude.svg", tile: "bg-[#F5F0E8]", pad: "p-1.5" },
  chatgpt: { name: "ChatGPT", by: "OpenAI", logo: "/agents/chatgpt.svg", tile: "bg-white", pad: "p-1.5" },
} as const;

export type AgentId = keyof typeof AGENTS;

export function AgentLogo({ id, size = 28, className = "" }: { id: AgentId; size?: number; className?: string }) {
  const a = AGENTS[id];
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full outline outline-1 -outline-offset-1 outline-black/10 ${a.tile} ${a.pad} ${className}`}
      style={{ width: size, height: size }}
    >
      <img src={a.logo} alt={a.name} className="size-full object-contain" draggable={false} />
    </span>
  );
}
