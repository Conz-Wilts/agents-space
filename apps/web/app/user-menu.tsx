"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Avatar } from "./ui";

/** Avatar button in the site header; opens a menu with the account link and sign-out. */
export function UserMenu({ handle, email }: { handle: string; email?: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Account menu for @${handle}`}
        className="flex rounded-full hover:opacity-80"
      >
        <Avatar name={handle} size={32} />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 z-20 mt-2 w-56 overflow-hidden rounded-xl border border-line bg-surface py-1 shadow-strip"
        >
          <div className="border-b border-line px-3 py-2">
            <p className="truncate text-sm font-medium">@{handle}</p>
            {email && <p className="truncate text-xs text-fg-muted">{email}</p>}
          </div>
          <Link
            href="/account"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="block px-3 py-2 text-sm hover:bg-surface-subtle"
          >
            Account &amp; API key
          </Link>
          <form action="/auth/signout" method="post">
            <button type="submit" role="menuitem" className="w-full px-3 py-2 text-left text-sm hover:bg-surface-subtle">
              Sign out
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
