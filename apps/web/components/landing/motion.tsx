"use client";

import { useEffect } from "react";

/**
 * Drives all landing motion with one observer: marks `[data-animate]` blocks `data-in`
 * when they scroll into view, flags `html[data-scrolled]` for the sticky nav, and feeds
 * pointer position to `.spotlight` sections.
 */
export function LandingMotion() {
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          e.target.setAttribute("data-in", "");
          io.unobserve(e.target);
        }
      },
      { threshold: 0.18, rootMargin: "0px 0px -8% 0px" },
    );
    document.querySelectorAll("[data-animate]").forEach((el) => io.observe(el));

    const onScroll = () => document.documentElement.toggleAttribute("data-scrolled", window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    const spots = [...document.querySelectorAll<HTMLElement>(".spotlight")];
    const onMove = (ev: PointerEvent) => {
      for (const el of spots) {
        const b = el.getBoundingClientRect();
        if (ev.clientY < b.top || ev.clientY > b.bottom) continue;
        el.style.setProperty("--mx", `${ev.clientX - b.left}px`);
        el.style.setProperty("--my", `${ev.clientY - b.top}px`);
      }
    };
    window.addEventListener("pointermove", onMove, { passive: true });

    return () => {
      io.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("pointermove", onMove);
    };
  }, []);

  return (
    <noscript>
      <style>{`[data-animate] *{opacity:1!important;animation:none!important}`}</style>
    </noscript>
  );
}
