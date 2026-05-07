"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type NotificationRow = {
  id: string;
  user_id: string;
  actor_id: string | null;
  type: string;
  title: string;
  body: string | null;
  link_path: string | null;
  is_read: boolean;
  created_at: string;
};

type ConnectionRequestRow = {
  id: string;
  sender_id: string;
  receiver_id: string;
  status: string;
  message: string | null;
  created_at: string;
};

type PartyInviteRow = {
  id: string;
  party_id: string;
  sender_id: string;
  receiver_id: string;
  status: string;
  created_at: string;
};

export default function NotificationBell() {
  const supabase = useMemo(() => createClient(), []);

  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [connectionRequests, setConnectionRequests] = useState<
    ConnectionRequestRow[]
  >([]);
  const [partyInvites, setPartyInvites] = useState<PartyInviteRow[]>([]);
  const [busyId, setBusyId] = useState("");

  const unreadCount =
    notifications.length + connectionRequests.length + partyInvites.length;

  async function loadNotifications() {
    const response = await fetch("/api/notifications/list", {
      cache: "no-store",
    });

    if (!response.ok) return;

    const result = await response.json();

    setNotifications(
      Array.isArray(result.notifications) ? result.notifications : [],
    );
    setConnectionRequests(
      Array.isArray(result.connectionRequests) ? result.connectionRequests : [],
    );
    setPartyInvites(
      Array.isArray(result.partyInvites) ? result.partyInvites : [],
    );
  }

  async function closeNotification(notificationId: string) {
    setNotifications((current) =>
      current.filter((notification) => notification.id !== notificationId),
    );

    await fetch("/api/notifications/read", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ notificationId }),
    });
  }

  async function respondConnectionRequest(
    requestId: string,
    action: "accepted" | "declined",
  ) {
    setBusyId(requestId);

    const response = await fetch("/api/requests/respond", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ requestId, action }),
    });

    setBusyId("");

    if (response.ok) {
      setConnectionRequests((current) =>
        current.filter((request) => request.id !== requestId),
      );
      await loadNotifications();
      return;
    }

    const result = await response.json().catch(() => ({}));
    alert(result.error || "Unable to respond to request.");
  }

  async function respondPartyInvite(
    inviteId: string,
    action: "accepted" | "declined",
  ) {
    setBusyId(inviteId);

    const response = await fetch("/api/party/respond", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ inviteId, action }),
    });

    setBusyId("");

    if (response.ok) {
      setPartyInvites((current) =>
        current.filter((invite) => invite.id !== inviteId),
      );
      await loadNotifications();

      if (action === "accepted") {
        window.location.href = "/match";
      }

      return;
    }

    const result = await response.json().catch(() => ({}));
    alert(result.error || "Unable to respond to invite.");
  }

  useEffect(() => {
    loadNotifications();

    const pollTimer = window.setInterval(loadNotifications, 2000);

    const channel = supabase
      .channel("notification-bell-live")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
        },
        () => loadNotifications(),
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "connection_requests",
        },
        () => loadNotifications(),
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "party_invites",
        },
        () => loadNotifications(),
      )
      .subscribe();

    return () => {
      window.clearInterval(pollTimer);
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="relative flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white font-black shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800"
        aria-label="Notifications"
      >
        🔔

        {unreadCount > 0 ? (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-xs font-black text-white">
            {unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <>
          <button
            type="button"
            aria-label="Close notifications"
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-[250] bg-transparent"
          />

          <div className="fixed left-3 right-3 top-[76px] z-[300] max-h-[calc(100dvh-96px)] overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-950 sm:absolute sm:left-auto sm:right-0 sm:top-14 sm:w-96 sm:max-w-[calc(100vw-24px)]">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-800">
              <div>
                <p className="font-black">Notifications</p>
                <p className="text-xs text-slate-500">
                  {unreadCount > 0
                    ? `${unreadCount} unread`
                    : "No unread notifications"}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-xl border border-slate-200 px-3 py-1 text-sm font-black hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-900"
              >
                Close
              </button>
            </div>

            <div className="max-h-[calc(100dvh-170px)] space-y-3 overflow-y-auto p-3 sm:max-h-[460px]">
              {connectionRequests.map((request) => (
                <div
                  key={request.id}
                  className="rounded-2xl border border-slate-200 p-3 dark:border-slate-700"
                >
                  <p className="font-black">Friend request</p>
                  <p className="mt-1 text-sm text-slate-500">
                    Someone sent you a friend request.
                  </p>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={busyId === request.id}
                      onClick={() =>
                        respondConnectionRequest(request.id, "accepted")
                      }
                      className="rounded-xl bg-cyan-400 px-3 py-2 text-sm font-black text-slate-950 disabled:opacity-50"
                    >
                      {busyId === request.id ? "Accepting..." : "Accept"}
                    </button>

                    <button
                      type="button"
                      disabled={busyId === request.id}
                      onClick={() =>
                        respondConnectionRequest(request.id, "declined")
                      }
                      className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-black disabled:opacity-50 dark:border-slate-700"
                    >
                      Decline
                    </button>
                  </div>
                </div>
              ))}

              {partyInvites.map((invite) => (
                <div
                  key={invite.id}
                  className="rounded-2xl border border-slate-200 p-3 dark:border-slate-700"
                >
                  <p className="font-black">Team invite</p>
                  <p className="mt-1 text-sm text-slate-500">
                    A friend invited you to join their match team.
                  </p>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={busyId === invite.id}
                      onClick={() => respondPartyInvite(invite.id, "accepted")}
                      className="rounded-xl bg-cyan-400 px-3 py-2 text-sm font-black text-slate-950 disabled:opacity-50"
                    >
                      {busyId === invite.id ? "Accepting..." : "Accept"}
                    </button>

                    <button
                      type="button"
                      disabled={busyId === invite.id}
                      onClick={() => respondPartyInvite(invite.id, "declined")}
                      className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-black disabled:opacity-50 dark:border-slate-700"
                    >
                      Decline
                    </button>
                  </div>
                </div>
              ))}

              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className="rounded-2xl border border-slate-200 p-3 dark:border-slate-700"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="break-words font-black">
                        {notification.title}
                      </p>

                      {notification.body ? (
                        <p className="mt-1 break-words text-sm text-slate-500">
                          {notification.body}
                        </p>
                      ) : null}
                    </div>

                    <button
                      type="button"
                      onClick={() => closeNotification(notification.id)}
                      className="shrink-0 rounded-xl border border-slate-200 px-2 py-1 text-xs font-black hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-900"
                    >
                      ✕
                    </button>
                  </div>

                  {notification.link_path ? (
                    <a
                      href={notification.link_path}
                      onClick={() => setOpen(false)}
                      className="mt-3 inline-block rounded-xl bg-cyan-400 px-3 py-2 text-sm font-black text-slate-950"
                    >
                      Open
                    </a>
                  ) : null}
                </div>
              ))}

              {unreadCount === 0 ? (
                <div className="rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-500 dark:bg-slate-900">
                  No notifications.
                </div>
              ) : null}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}