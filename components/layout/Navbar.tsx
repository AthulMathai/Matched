import Link from "next/link";
import NavAuthActions from "@/components/layout/NavAuthActions";
import ThemeToggle from "@/components/layout/ThemeToggle";
import NotificationBell from "@/components/layout/NotificationBell";
import MobileMenu from "@/components/layout/MobileMenu";
import { createClient } from "@/lib/supabase/server";

const navItems = [
  { label: "Match", href: "/match" },
  { label: "History", href: "/history" },
  { label: "Messages", href: "/messages" },
  { label: "Blocked", href: "/blocked" },
  { label: "Preferences", href: "/preferences" },
];

export default async function Navbar() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <header className="sticky top-0 z-40 border-b border-slate-800/10 bg-white/85 backdrop-blur-xl dark:border-slate-800/80 dark:bg-slate-950/85">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 md:px-5 md:py-4">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-cyan-400 text-lg font-black text-slate-950 md:h-11 md:w-11 md:text-xl">
            M
          </div>

          <div>
            <p className="text-base font-black leading-none md:text-lg">
              Matched
            </p>
            <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 md:text-xs">
              Global video chat
            </p>
          </div>
        </Link>

        <div className="flex items-center gap-2">
          <nav className="hidden items-center gap-2 md:flex">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-xl px-3 py-2 text-sm font-bold text-slate-600 hover:bg-slate-200 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {user ? <NotificationBell /> : null}

          <div className="hidden md:block">
            <ThemeToggle />
          </div>

          <div className="hidden md:block">
            <NavAuthActions />
          </div>

          <MobileMenu />
        </div>
      </div>
    </header>
  );
}