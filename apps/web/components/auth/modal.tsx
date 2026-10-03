"use client";

import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";

/** Popup over the current page; closing goes back, so the URL returns to where the user was. */
export function Modal({ children }: { children: ReactNode }) {
  const router = useRouter();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && router.back();
    document.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [router]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-ink/40 px-5 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && router.back()}
    >
      <div className="relative w-full max-w-md rounded-2xl border border-edge bg-white p-8 text-ink shadow-[0_24px_64px_-16px_#0a0a0a40]">
        <button
          type="button"
          aria-label="Close"
          onClick={() => router.back()}
          className="absolute top-4 right-4 flex size-8 items-center justify-center rounded-lg text-muted transition-colors hover:bg-panel hover:text-ink"
        >
          <svg viewBox="0 0 16 16" className="size-4" aria-hidden>
            <path d="m4 4 8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
          </svg>
        </button>
        {children}
      </div>
    </div>
  );
}
