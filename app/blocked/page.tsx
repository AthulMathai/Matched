import Link from "next/link";
import BlockedUsersClient from "@/components/blocked/BlockedUsersClient";
import Button from "@/components/ui/Button";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

type BlockedRow = {
  id: string;
  blocker_id: string;
  blocked_user_id: string;
  reason: string | null;
  created_at: string;
};

type ProfileRow = {
  id: string;
  country: string | null;
  language: string | null;
};

function formatStableDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return date.toISOString().replace("T", " ").slice(0, 16);
}

export default async function BlockedPage() {
  const user = await requireUser();
  const supabase = await createClient();

  const { data: blockedRows, error } = await supabase
    .from("blocked_users")
    .select("id, blocker_id, blocked_user_id, reason, created_at")
    .eq("blocker_id", user.id)
    .order("created_at", {
      ascending: false,
    });

  if (error) {
    throw new Error(error.message);
  }

  const cleanBlockedRows = (blockedRows || []).filter(
    (row) => row.blocker_id === user.id,
  );

  const blockedUserIds = [
    ...new Set(cleanBlockedRows.map((row) => row.blocked_user_id)),
  ];

  const { data: profiles } =
    blockedUserIds.length > 0
      ? await supabase
          .from("profiles")
          .select("id, country, language")
          .in("id", blockedUserIds)
      : { data: [] };

  const profileMap = new Map(
    ((profiles || []) as ProfileRow[]).map((profile) => [profile.id, profile]),
  );

  const blockedUsers = (cleanBlockedRows as BlockedRow[]).map((row) => ({
    id: row.id,
    blockedUserId: row.blocked_user_id,
    reason: row.reason,
    createdAt: row.created_at,
    blockedAtText: formatStableDate(row.created_at),
    profile: profileMap.get(row.blocked_user_id) || null,
  }));

  return (
    <main className="mx-auto w-full max-w-5xl px-5 py-8 md:min-h-[calc(100dvh-170px)]">
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-black">Blocked Users</h1>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Users you blocked cannot message you or match with you again.
          </p>
        </div>

        <Link href="/match">
          <Button type="button">Start Matching</Button>
        </Link>
      </div>

      <BlockedUsersClient initialBlockedUsers={blockedUsers} />
    </main>
  );
}