import Link from "next/link";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";

export default function HomePage() {
  return (
    <main className="page-shell flex items-center justify-center">
      <section className="mx-auto grid w-full max-w-7xl gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="flex flex-col justify-center">
          <div className="mb-6 inline-flex w-fit items-center rounded-full border border-cyan-400/30 bg-cyan-400/10 px-4 py-2 text-sm font-bold text-cyan-700 dark:text-cyan-200">
            18+ moderated global video chat
          </div>

          <h1 className="max-w-4xl text-5xl font-black tracking-tight text-slate-950 dark:text-white md:text-7xl">
            Meet people worldwide through shared interests.
          </h1>

          <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600 dark:text-slate-300">
            Matched helps adults connect through live video, country filters,
            language preferences, and shared interest tags.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href="/login">
              <Button type="button">Start Matching</Button>
            </Link>

            <Link href="/rules">
              <Button type="button" variant="secondary">
                View Safety Rules
              </Button>
            </Link>
          </div>

          <div className="mt-8 flex flex-wrap gap-2">
            <span className="badge">18+ only</span>
            <span className="badge">Country filters</span>
            <span className="badge">Interest tags</span>
            <span className="badge">Block & report</span>
            <span className="badge">Face visibility checks</span>
          </div>
        </div>

        <Card className="overflow-hidden p-5">
          <div className="rounded-[2rem] bg-slate-950 p-4 text-white">
            <div className="grid gap-4">
              <div className="aspect-video rounded-3xl bg-gradient-to-br from-cyan-400/30 via-blue-500/20 to-purple-500/30 p-5">
                <div className="flex h-full flex-col justify-between">
                  <div className="flex justify-between">
                    <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-bold">
                      Live Match Preview
                    </span>
                    <span className="rounded-full bg-emerald-400 px-3 py-1 text-xs font-black text-slate-950">
                      Online
                    </span>
                  </div>

                  <div>
                    <p className="text-sm text-slate-300">Matching by tag</p>
                    <p className="mt-1 text-3xl font-black">
                      Travel + Gaming
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
                  <p className="text-sm text-slate-400">Country</p>
                  <p className="mt-1 text-xl font-black">Global</p>
                </div>

                <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
                  <p className="text-sm text-slate-400">History</p>
                  <p className="mt-1 text-xl font-black">10+ min</p>
                </div>
              </div>

              <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
                <p className="font-black">Safety first</p>
                <p className="mt-2 text-sm leading-6 text-slate-400">
                  Users can skip, report, block, and reconnect only from saved
                  history after longer conversations.
                </p>
              </div>
            </div>
          </div>
        </Card>
      </section>
    </main>
  );
}