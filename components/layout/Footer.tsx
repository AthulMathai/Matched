import Link from "next/link";

export default function Footer() {
  return (
    <footer className="mt-auto border-t border-slate-800/10 bg-white/80 dark:border-slate-800/80 dark:bg-slate-950/80">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-5 py-6 text-sm text-slate-500 md:flex-row md:items-center md:justify-between">
        <p>© 2026 Matched. All rights reserved.</p>

        <div className="flex gap-5">
          <Link href="/rules" className="hover:text-slate-950 dark:hover:text-white">
            Rules
          </Link>
          <Link href="/privacy" className="hover:text-slate-950 dark:hover:text-white">
            Privacy
          </Link>
          <Link href="/terms" className="hover:text-slate-950 dark:hover:text-white">
            Terms
          </Link>
        </div>
      </div>
    </footer>
  );
}