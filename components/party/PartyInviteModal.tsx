"use client";

import { useEffect, useState } from "react";
import CountryBadge from "@/components/ui/CountryBadge";

type FriendItem = {
  friend_id: string;
  profile: {
    id: string;
    country: string | null;
    language: string | null;
  } | null;
};

export default function PartyInviteModal({
  open,
  onClose,
  onInviteSent,
}: {
  open: boolean;
  onClose: () => void;
  onInviteSent?: () => void;
}) {
  const [friends, setFriends] = useState<FriendItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [sendingId, setSendingId] = useState("");
  const [error, setError] = useState("");

  async function loadFriends() {
    setLoading(true);
    setError("");

    const response = await fetch("/api/party/friends", {
      cache: "no-store",
    });

    const result = await response.json().catch(() => ({}));

    setLoading(false);

    if (!response.ok || !result.ok) {
      setError(result.error || "Unable to load friends.");
      return;
    }

    setFriends(result.friends || []);
    onInviteSent?.();
  }

  async function sendInvite(friendId: string) {
    setSendingId(friendId);
    setError("");

    const response = await fetch("/api/party/invite", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        receiverId: friendId,
      }),
    });

    const result = await response.json().catch(() => ({}));

    setSendingId("");

    if (!response.ok || !result.ok) {
      setError(result.error || "Unable to send invite.");
      return;
    }

    onInviteSent?.();
    onClose();
  }

  useEffect(() => {
    if (open) {
      loadFriends();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-3xl bg-white p-5 shadow-2xl dark:bg-slate-950">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-black">Invite Friend</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Invite a friend to join your match team.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-xl font-black hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
          >
            ×
          </button>
        </div>

        {error ? (
          <div className="mb-3 rounded-2xl border border-red-300 bg-red-50 p-3 text-sm font-bold text-red-700 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-200">
            {error}
          </div>
        ) : null}

        {loading ? (
          <div className="rounded-2xl bg-slate-100 p-4 text-sm font-bold text-slate-600 dark:bg-slate-900 dark:text-slate-300">
            Loading friends...
          </div>
        ) : friends.length === 0 ? (
          <div className="rounded-2xl bg-slate-100 p-4 text-sm font-bold text-slate-600 dark:bg-slate-900 dark:text-slate-300">
            No friends available to invite.
          </div>
        ) : (
          <div className="space-y-2">
            {friends.map((friend) => (
              <div
                key={friend.friend_id}
                className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 p-3 dark:border-slate-700"
              >
                <div>
                  <p className="font-black">Matched Friend</p>
                  <p className="text-sm text-slate-500">
                    <CountryBadge country={friend.profile?.country || ""} />
                  </p>
                </div>

                <button
                  type="button"
                  disabled={sendingId === friend.friend_id}
                  onClick={() => sendInvite(friend.friend_id)}
                  className="rounded-2xl bg-cyan-400 px-4 py-2 text-sm font-black text-slate-950 hover:bg-cyan-300 disabled:opacity-50"
                >
                  {sendingId === friend.friend_id ? "Sending..." : "Invite"}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}