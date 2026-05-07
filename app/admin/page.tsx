import Link from "next/link";
import Sidebar from "@/components/layout/Sidebar";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export default async function AdminPage() {
  await requireUser();

  const supabase = await createClient();

  const [
    { count: usersCount },
    { count: reportsCount },
    { count: activeSessionsCount },
    { count: totalSessionsCount },
  ] = await Promise.all([
    supabase.from("profiles").select("*", { count: "exact", head: true }),
    supabase
      .from("reports")
      .select("*", { count: "exact", head: true })
      .eq("status", "open"),
    supabase
      .from("chat_sessions")
      .select("*", { count: "exact", head: true })
      .eq("status", "active"),
    supabase.from("chat_sessions").select("*", { count: "exact", head: true }),
  ]);

  const stats = [
    {
      label: "Users",
      value: usersCount || 0,
    },
    {
      label: "Open Reports",
      value: reportsCount || 0,
    },
    {
      label: "Active Sessions",
      value: activeSessionsCount || 0,
    },
    {
      label: "Total Sessions",
      value: totalSessionsCount || 0,
    },
  ];

  return (
    <main className="page-shell">
      <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[240px_1fr]">
        <Sidebar />

        <section>
          <div className="mb-6">
            <h1 className="text-3xl font-black">Admin Dashboard</h1>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              Monitor Matched users, reports, and video chat activity.
            </p>
          </div>

          <div className="mb-6 grid gap-4 md:grid-cols-4">
            {stats.map((stat) => (
              <Card key={stat.label} className="p-5">
                <p className="text-sm text-slate-400">{stat.label}</p>
                <p className="mt-2 text-3xl font-black">{stat.value}</p>
              </Card>
            ))}
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <Card className="p-5">
              <h2 className="text-xl font-black">Reports</h2>
              <p className="mt-2 min-h-12 text-sm leading-6 text-slate-400">
                Review safety reports submitted by users.
              </p>
              <Link className="mt-5 inline-block" href="/admin/reports">
                <Button type="button" variant="secondary">
                  Open Reports
                </Button>
              </Link>
            </Card>

            <Card className="p-5">
              <h2 className="text-xl font-black">Users</h2>
              <p className="mt-2 min-h-12 text-sm leading-6 text-slate-400">
                View users and basic moderation status.
              </p>
              <Link className="mt-5 inline-block" href="/admin/users">
                <Button type="button" variant="secondary">
                  View Users
                </Button>
              </Link>
            </Card>

            <Card className="p-5">
              <h2 className="text-xl font-black">Sessions</h2>
              <p className="mt-2 min-h-12 text-sm leading-6 text-slate-400">
                Audit recent chat sessions and end reasons.
              </p>
              <Link className="mt-5 inline-block" href="/admin/sessions">
                <Button type="button" variant="secondary">
                  View Sessions
                </Button>
              </Link>
            </Card>
          </div>
        </section>
      </div>
    </main>
  );
}