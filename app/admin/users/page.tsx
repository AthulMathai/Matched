import Sidebar from "@/components/layout/Sidebar";
import UserModerationCard from "@/components/moderation/UserModerationCard";
import Card from "@/components/ui/Card";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export default async function AdminUsersPage() {
  await requireUser();

  const supabase = await createClient();

  const { data: users, error } = await supabase
    .from("profiles")
    .select(
      "id, display_name, country, language, avatar_url, age_verified, is_banned, created_at",
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
            <h1 className="text-3xl font-black">Users</h1>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              View recent users and moderation status.
            </p>
          </div>

          {!users || users.length === 0 ? (
            <Card className="p-8 text-center">
              <h2 className="text-2xl font-black">No users found</h2>
              <p className="mt-3 text-sm text-slate-400">
                User profiles will appear here.
              </p>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {users.map((user) => (
                <UserModerationCard key={user.id} user={user} />
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}