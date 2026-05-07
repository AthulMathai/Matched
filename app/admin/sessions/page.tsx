import Sidebar from "@/components/layout/Sidebar";
import SessionAuditTable from "@/components/moderation/SessionAuditTable";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export default async function AdminSessionsPage() {
  await requireUser();

  const supabase = await createClient();

  const { data: sessions, error } = await supabase
    .from("chat_sessions")
    .select(
      "id, user_1_id, user_2_id, status, started_at, ended_at, duration_seconds, ended_reason",
    )
    .order("created_at", {
      ascending: false,
    })
    .limit(100);

  if (error) {
    throw new Error(error.message);
  }

  return (
    <main className="page-shell">
      <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[240px_1fr]">
        <Sidebar />

        <section>
          <div className="mb-6">
            <h1 className="text-3xl font-black">Sessions</h1>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              Review recent video chat sessions and end reasons.
            </p>
          </div>

          <SessionAuditTable sessions={sessions || []} />
        </section>
      </div>
    </main>
  );
}