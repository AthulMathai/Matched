"use client";

import Link from "next/link";
import { useState } from "react";
import ThemeToggle from "@/components/layout/ThemeToggle";
import NavAuthActions from "@/components/layout/NavAuthActions";

const navItems = [
  { label: "Match", href: "/match" },
  { label: "History", href: "/history" },
  { label: "Messages", href: "/messages" },
  { label: "Blocked", href: "/blocked" },
  { label: "Preferences", href: "/preferences" },
];

export default function MobileMenu() {
  const [open, setOpen] = useState(false);

  return (
    <div className="md:hidden">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-xl font-black text-slate-950 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-white"
        aria-label="Open menu"
      >
        ☰
      </button>

      {open ? (
        <div className="fixed inset-0 z-[200] bg-black/70">
          <button
            type="button"
            className="absolute inset-0 h-full w-full"
            onClick={() => setOpen(false)}
            aria-label="Close menu"
          />

          <aside className="absolute right-0 top-0 flex h-dvh w-[84%] max-w-sm flex-col bg-white p-5 shadow-2xl dark:bg-slate-950">
            <div className="mb-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-400 text-lg font-black text-slate-950">
                  M
                </div>
                <div>
                  <p className="text-xl font-black">Matched</p>
                  <p className="text-xs text-slate-500">Global video chat</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 text-lg font-black dark:border-slate-700"
              >
                ✕
              </button>
            </div>

            <nav className="flex flex-col gap-2">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="rounded-2xl border border-slate-200 px-4 py-4 font-black text-slate-950 dark:border-slate-700 dark:text-white"
                >
                  {item.label}
                </Link>
              ))}
            </nav>

            <div className="mt-auto space-y-3 border-t border-slate-200 pt-5 dark:border-slate-800">
              <ThemeToggle />
              <NavAuthActions />
            </div>
          </aside>
        </div>
      ) : null}
    </div>
  );
}