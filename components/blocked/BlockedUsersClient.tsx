"use client";

import { useState } from "react";
import Card from "@/components/ui/Card";
import CountryBadge from "@/components/ui/CountryBadge";

type BlockedUser = {
  id: string;
  blockedUserId: string;
  reason: string | null;
  createdAt: string;
  blockedAtText: string;
  profile: {
    id: string;
    country: string | null;
    language: string | null;
  } | null;
};

type BlockedUsersClientProps = {
  initialBlockedUsers: BlockedUser[];
};

export default function BlockedUsersClient({
  initialBlockedUsers,
}: BlockedUsersClientProps) {
  const [blockedUsers, setBlockedUsers] = useState(initialBlockedUsers);
  const [busyId, setBusyId] = useState("");

  async function unblockUser(blockedUserId: string) {
    const confirmed = window.confirm("Unblock this user?");
    if (!confirmed) return;

    setBusyId(blockedUserId);

    const response = await fetch("/api/block/unblock", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ blockedUserId }),
    });

    setBusyId("");

    if (response.ok) {
      setBlockedUsers((current) =>
        current.filter((user) => user.blockedUserId !== blockedUserId),
      );
      return;
    }

    const result = await response.json().catch(() => ({}));
    alert(result.error || "Unable to unblock user.");
  }

  if (blockedUsers.length === 0) {
    return (
      <Card className="p-6">
        <p className="font-black">No blocked users.</p>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          People you block will appear here.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {blockedUsers.map((blockedUser) => (
        <Card key={blockedUser.id} className="p-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex min-w-0 items-center gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-cyan-400 text-xl font-black text-slate-950">
                M
              </div>

              <div className="min-w-0">
                <p className="truncate font-black">Blocked user</p>

                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  <CountryBadge country={blockedUser.profile?.country || ""} />
                </p>

                {blockedUser.reason ? (
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    Reason: {blockedUser.reason}
                  </p>
                ) : null}

                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Blocked: {blockedUser.blockedAtText}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => unblockUser(blockedUser.blockedUserId)}
              disabled={busyId === blockedUser.blockedUserId}
              className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-950 shadow-sm transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:hover:bg-slate-800"
            >
              {busyId === blockedUser.blockedUserId
                ? "Unblocking..."
                : "Unblock"}
            </button>
          </div>
        </Card>
      ))}
    </div>
  );
}