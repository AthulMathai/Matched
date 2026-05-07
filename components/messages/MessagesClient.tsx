"use client";

import { useEffect, useMemo, useState } from "react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import CountryBadge from "@/components/ui/CountryBadge";
import { createClient } from "@/lib/supabase/client";

type RequestRow = {
  id: string;
  sender_id: string;
  receiver_id: string;
  status: string;
  message: string | null;
  created_at: string;
  sender_profile?: {
    country?: string | null;
  } | null;
};

type PartyInviteRow = {
  id: string;
  party_id: string;
  sender_id: string;
  receiver_id: string;
  status: string;
  created_at: string;
  sender_profile?: {
    id: string;
    country?: string | null;
    language?: string | null;
  } | null;
};

type FriendRow = {
  id: string;
  user_1_id: string;
  user_2_id: string;
  created_at: string;
  friend_id: string;
  friend_profile?: {
    id: string;
    country?: string | null;
    language?: string | null;
  } | null;
};

type DirectMessageRow = {
  id: string;
  sender_id: string;
  receiver_id: string;
  body: string;
  created_at: string;
};

type MessagesClientProps = {
  currentUserId: string;
  initialTab: string;
  requests: RequestRow[];
  friends: FriendRow[];
  directMessages: DirectMessageRow[];
  partyInvites: PartyInviteRow[];
};

export default function MessagesClient({
  currentUserId,
  initialTab,
  requests,
  friends,
  directMessages,
  partyInvites,
}: MessagesClientProps) {
  const supabase = useMemo(() => createClient(), []);

  const [tab, setTab] = useState(initialTab || "messages");
  const [requestRows, setRequestRows] = useState(
    requests.filter((request) => request.status === "pending"),
  );
  const [partyInviteRows, setPartyInviteRows] = useState(
    partyInvites.filter((invite) => invite.status === "pending"),
  );
  const [friendRows, setFriendRows] = useState(friends);
  const [selectedFriendId, setSelectedFriendId] = useState("");
  const [selectedFriendActionId, setSelectedFriendActionId] = useState("");
  const [messages, setMessages] = useState(directMessages);
  const [messageInput, setMessageInput] = useState("");
  const [busyFriendId, setBusyFriendId] = useState("");
  const [busyInviteId, setBusyInviteId] = useState("");

  const selectedFriend = friendRows.find(
    (friend) => friend.friend_id === selectedFriendId,
  );

  const selectedMessages = useMemo(() => {
    if (!selectedFriendId) return [];

    return messages
      .filter(
        (message) =>
          (message.sender_id === currentUserId &&
            message.receiver_id === selectedFriendId) ||
          (message.sender_id === selectedFriendId &&
            message.receiver_id === currentUserId),
      )
      .sort(
        (a, b) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
      );
  }, [messages, selectedFriendId, currentUserId]);

  async function fetchLatestDirectMessages() {
    const response = await fetch("/api/direct-messages/list", {
      cache: "no-store",
    });

    if (!response.ok) return;

    const result = await response.json();

    if (!Array.isArray(result.messages)) return;

    setMessages((current) => {
      const optimisticMessages = current.filter(
        (message) =>
          message.id.length > 25 &&
          !result.messages.some(
            (row: DirectMessageRow) => row.id === message.id,
          ),
      );

      const merged = [...result.messages];

      for (const optimistic of optimisticMessages) {
        const exists = merged.some(
          (message) =>
            message.body === optimistic.body &&
            message.sender_id === optimistic.sender_id &&
            message.receiver_id === optimistic.receiver_id,
        );

        if (!exists) merged.push(optimistic);
      }

      return merged;
    });
  }

  async function fetchLatestPartyInvites() {
    const response = await fetch("/api/notifications/list", {
      cache: "no-store",
    });

    if (!response.ok) return;

    const result = await response.json();

    if (Array.isArray(result.partyInvites)) {
      const senderIds = [
        ...new Set(
          result.partyInvites.map((invite: PartyInviteRow) => invite.sender_id),
        ),
      ];

      let profiles: Array<{
        id: string;
        country?: string | null;
        language?: string | null;
      }> = [];

      if (senderIds.length > 0) {
        const { data } = await supabase
          .from("profiles")
          .select("id, country, language")
          .in("id", senderIds);

        profiles = data || [];
      }

      const profileMap = new Map(
        profiles.map((profile) => [profile.id, profile]),
      );

      setPartyInviteRows(
        result.partyInvites
          .filter((invite: PartyInviteRow) => invite.status === "pending")
          .map((invite: PartyInviteRow) => ({
            ...invite,
            sender_profile: profileMap.get(invite.sender_id) || null,
          })),
      );
    }

    if (Array.isArray(result.connectionRequests)) {
      setRequestRows((current) => {
        const latestIds = new Set(
          result.connectionRequests.map((request: RequestRow) => request.id),
        );

        return current.filter((request) => latestIds.has(request.id));
      });
    }
  }

  useEffect(() => {
    fetchLatestDirectMessages();
    fetchLatestPartyInvites();

    const pollTimer = window.setInterval(() => {
      fetchLatestDirectMessages();
      fetchLatestPartyInvites();
    }, 1500);

    const channel = supabase
      .channel(`live-messages-${currentUserId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "direct_messages",
        },
        () => fetchLatestDirectMessages(),
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "party_invites",
          filter: `receiver_id=eq.${currentUserId}`,
        },
        () => fetchLatestPartyInvites(),
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "connection_requests",
          filter: `receiver_id=eq.${currentUserId}`,
        },
        () => fetchLatestPartyInvites(),
      )
      .subscribe();

    return () => {
      window.clearInterval(pollTimer);
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUserId, supabase]);

  async function respondRequest(
    requestId: string,
    action: "accepted" | "declined",
  ) {
    const response = await fetch("/api/requests/respond", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ requestId, action }),
    });

    if (response.ok) {
      setRequestRows((current) =>
        current.filter((request) => request.id !== requestId),
      );

      if (action === "accepted") {
        window.location.href = "/messages";
      }

      return;
    }

    const result = await response.json().catch(() => ({}));
    alert(result.error || "Unable to respond to request.");
  }

  async function respondPartyInvite(
    inviteId: string,
    action: "accepted" | "declined",
  ) {
    setBusyInviteId(inviteId);

    const response = await fetch("/api/party/respond", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        inviteId,
        action,
      }),
    });

    setBusyInviteId("");

    if (response.ok) {
      setPartyInviteRows((current) =>
        current.filter((invite) => invite.id !== inviteId),
      );

      if (action === "accepted") {
        window.location.href = "/match";
      }

      return;
    }

    const result = await response.json().catch(() => ({}));
    alert(result.error || "Unable to respond to invite.");
  }

  async function sendDirectMessage() {
    const body = messageInput.trim();
    if (!body || !selectedFriendId) return;

    const tempMessage: DirectMessageRow = {
      id: crypto.randomUUID(),
      sender_id: currentUserId,
      receiver_id: selectedFriendId,
      body,
      created_at: new Date().toISOString(),
    };

    setMessages((current) => [...current, tempMessage]);
    setMessageInput("");

    const response = await fetch("/api/direct-messages/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        receiverId: selectedFriendId,
        body,
      }),
    });

    if (!response.ok) {
      setMessages((current) =>
        current.filter((message) => message.id !== tempMessage.id),
      );
      setMessageInput(body);
    }
  }

  async function unfriend(friendId: string) {
    const confirmed = window.confirm(
      "Remove this friend and delete the chat history?",
    );

    if (!confirmed) return;

    setBusyFriendId(friendId);

    const response = await fetch("/api/friends/remove", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ friendId }),
    });

    setBusyFriendId("");

    if (response.ok) {
      setFriendRows((current) =>
        current.filter((friend) => friend.friend_id !== friendId),
      );

      setMessages((current) =>
        current.filter(
          (message) =>
            message.sender_id !== friendId && message.receiver_id !== friendId,
        ),
      );

      if (selectedFriendId === friendId) {
        setSelectedFriendId("");
      }

      if (selectedFriendActionId === friendId) {
        setSelectedFriendActionId("");
      }

      setTab("friends");
      return;
    }

    const result = await response.json().catch(() => ({}));
    alert(result.error || "Unable to remove friend.");
  }

  async function blockFriend(friendId: string) {
    const confirmed = window.confirm(
      "Block this friend? This will delete the chat and prevent matching again.",
    );

    if (!confirmed) return;

    setBusyFriendId(friendId);

    const response = await fetch("/api/block", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        blockedUserId: friendId,
        reason: "Blocked from friends",
      }),
    });

    setBusyFriendId("");

    if (response.ok) {
      setFriendRows((current) =>
        current.filter((friend) => friend.friend_id !== friendId),
      );

      setMessages((current) =>
        current.filter(
          (message) =>
            message.sender_id !== friendId && message.receiver_id !== friendId,
        ),
      );

      if (selectedFriendId === friendId) {
        setSelectedFriendId("");
      }

      if (selectedFriendActionId === friendId) {
        setSelectedFriendActionId("");
      }

      setTab("friends");
      return;
    }

    const result = await response.json().catch(() => ({}));
    alert(result.error || "Unable to block friend.");
  }

  function openMessage(friendId: string) {
    setTab("messages");
    setSelectedFriendId(friendId);
    setSelectedFriendActionId("");
  }

  function getLastMessage(friendId: string) {
    const friendMessages = messages
      .filter(
        (message) =>
          (message.sender_id === currentUserId &&
            message.receiver_id === friendId) ||
          (message.sender_id === friendId &&
            message.receiver_id === currentUserId),
      )
      .sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );

    return friendMessages[0]?.body || "Tap to message";
  }

  const tabs = [
    { key: "messages", label: "Messages" },
    { key: "requests", label: "Requests" },
    { key: "friends", label: "Friends" },
  ];

  const teamInviteCards =
    partyInviteRows.length > 0 ? (
      <div className="mb-4 space-y-3">
        {partyInviteRows.map((invite) => (
          <Card key={invite.id} className="p-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="font-black">Team invite</p>
                <p className="mt-1 text-sm text-slate-500">
                  Your friend invited you to join their match team.
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  <CountryBadge country={invite.sender_profile?.country || ""} />
                </p>
              </div>

              <div className="flex gap-2">
                <Button
                  type="button"
                  onClick={() => respondPartyInvite(invite.id, "accepted")}
                  disabled={busyInviteId === invite.id}
                >
                  {busyInviteId === invite.id ? "Accepting..." : "Accept"}
                </Button>

                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => respondPartyInvite(invite.id, "declined")}
                  disabled={busyInviteId === invite.id}
                >
                  Decline
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    ) : null;

  const friendList = (
    <div className="divide-y divide-slate-200 dark:divide-slate-700">
      {friendRows.map((friend) => (
        <button
          key={friend.id}
          type="button"
          onClick={() => setSelectedFriendId(friend.friend_id)}
          className={`flex w-full items-center gap-3 p-4 text-left ${
            selectedFriendId === friend.friend_id
              ? "bg-cyan-400/20"
              : "hover:bg-slate-100 dark:hover:bg-slate-800"
          }`}
        >
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-cyan-400 font-black text-slate-950">
            M
          </div>

          <div className="min-w-0 flex-1">
            <p className="truncate font-black">Matched Friend</p>
            <p className="truncate text-xs text-slate-500 dark:text-slate-400">
              <CountryBadge country={friend.friend_profile?.country || ""} /> ·{" "}
              {getLastMessage(friend.friend_id)}
            </p>
          </div>
        </button>
      ))}
    </div>
  );

  const chatPanel = selectedFriend ? (
    <div className="flex h-full min-h-0 flex-col bg-white dark:bg-slate-950">
      <div className="flex shrink-0 items-center gap-3 border-b border-slate-200 p-3 dark:border-slate-700">
        <button
          type="button"
          onClick={() => setSelectedFriendId("")}
          className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-black dark:border-slate-700 md:hidden"
        >
          ←
        </button>

        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-cyan-400 font-black text-slate-950">
          M
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate font-black">Matched Friend</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            <CountryBadge
              country={selectedFriend.friend_profile?.country || ""}
            />
          </p>
        </div>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto bg-white p-4 dark:bg-slate-950">
        {selectedMessages.length === 0 ? (
          <p className="text-center text-sm text-slate-500">No messages yet.</p>
        ) : (
          selectedMessages.map((message) => (
            <div
              key={message.id}
              className={`flex ${
                message.sender_id === currentUserId
                  ? "justify-end"
                  : "justify-start"
              }`}
            >
              <div
                className={`max-w-[78%] rounded-2xl px-4 py-3 text-sm ${
                  message.sender_id === currentUserId
                    ? "bg-cyan-400 text-slate-950"
                    : "bg-slate-200 text-slate-900 dark:bg-slate-800 dark:text-white"
                }`}
              >
                {message.body}
              </div>
            </div>
          ))
        )}
      </div>

      <div className="shrink-0 border-t border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-950">
        <div className="flex gap-2">
          <input
            className="min-h-11 flex-1 rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none placeholder:text-slate-400 focus:border-cyan-400 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            value={messageInput}
            onChange={(event) => setMessageInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                sendDirectMessage();
              }
            }}
            placeholder="Message..."
          />

          <Button
            type="button"
            onClick={sendDirectMessage}
            disabled={!messageInput.trim() || !selectedFriendId}
          >
            Send
          </Button>
        </div>
      </div>
    </div>
  ) : null;

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col px-5 py-8 md:min-h-[calc(100dvh-170px)]">
      <div className="mb-6 shrink-0">
        <h1 className="text-3xl font-black">Messages</h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          Text friends after both users accept a request.
        </p>
      </div>

      <div className="mb-6 flex shrink-0 flex-wrap gap-2">
        {tabs.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => {
              setTab(item.key);
              setSelectedFriendId("");
              setSelectedFriendActionId("");
            }}
            className={`rounded-2xl px-4 py-2 text-sm font-black transition ${
              tab === item.key
                ? "bg-cyan-400 text-slate-950"
                : "border border-slate-200 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === "messages" ? (
        <>
          {teamInviteCards}

          <Card className="min-h-0 flex-1 overflow-hidden">
            {friendRows.length === 0 ? (
              <div className="p-6">
                <p className="font-bold">No friends yet.</p>
                <p className="mt-2 text-sm text-slate-500">
                  Accepted friends will appear here for direct messaging.
                </p>
              </div>
            ) : (
              <>
                <div className="md:hidden">
                  {!selectedFriendId ? (
                    <>
                      <div className="border-b border-slate-200 p-4 dark:border-slate-700">
                        <p className="font-black">Chats</p>
                      </div>
                      {friendList}
                    </>
                  ) : (
                    <div className="h-[calc(100dvh-245px)] min-h-[520px]">
                      {chatPanel}
                    </div>
                  )}
                </div>

                <div className="hidden h-[650px] min-h-0 md:grid md:grid-cols-[320px_1fr]">
                  <div className="border-r border-slate-200 dark:border-slate-700">
                    <div className="border-b border-slate-200 p-4 dark:border-slate-700">
                      <p className="font-black">Chats</p>
                    </div>
                    {friendList}
                  </div>

                  {selectedFriendId ? (
                    chatPanel
                  ) : (
                    <div className="flex items-center justify-center p-8 text-center">
                      <div>
                        <p className="text-xl font-black">Select a chat</p>
                        <p className="mt-2 text-sm text-slate-500">
                          Choose a friend to start messaging.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </Card>
        </>
      ) : null}

      {tab === "requests" ? (
        <div className="space-y-3">
          {requestRows.length === 0 && partyInviteRows.length === 0 ? (
            <Card className="p-6">
              <p className="font-bold">No pending requests.</p>
            </Card>
          ) : (
            <>
              {partyInviteRows.map((invite) => (
                <Card key={invite.id} className="p-5">
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="font-black">Team invite</p>
                      <p className="mt-1 text-sm text-slate-500">
                        <CountryBadge
                          country={invite.sender_profile?.country || ""}
                        />
                      </p>
                      <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
                        Your friend invited you to join their match team.
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        type="button"
                        onClick={() =>
                          respondPartyInvite(invite.id, "accepted")
                        }
                        disabled={busyInviteId === invite.id}
                      >
                        {busyInviteId === invite.id ? "Accepting..." : "Accept"}
                      </Button>

                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() =>
                          respondPartyInvite(invite.id, "declined")
                        }
                        disabled={busyInviteId === invite.id}
                      >
                        Decline
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}

              {requestRows.map((request) => (
                <Card key={request.id} className="p-5">
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="font-black">Connection request</p>
                      <p className="mt-1 text-sm text-slate-500">
                        <CountryBadge
                          country={request.sender_profile?.country || ""}
                        />
                      </p>
                      {request.message ? (
                        <p className="mt-3 text-sm">{request.message}</p>
                      ) : null}
                    </div>

                    <div className="flex gap-2">
                      <Button
                        type="button"
                        onClick={() =>
                          respondRequest(request.id, "accepted")
                        }
                      >
                        Accept
                      </Button>

                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() =>
                          respondRequest(request.id, "declined")
                        }
                      >
                        Decline
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </>
          )}
        </div>
      ) : null}

      {tab === "friends" ? (
        <div className="grid gap-4 md:grid-cols-2">
          {friendRows.length === 0 ? (
            <Card className="p-6 md:col-span-2">
              <p className="font-bold">No friends yet.</p>
            </Card>
          ) : (
            friendRows.map((friend) => {
              const isOpen = selectedFriendActionId === friend.friend_id;

              return (
                <Card key={friend.id} className="p-5">
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedFriendActionId((current) =>
                        current === friend.friend_id ? "" : friend.friend_id,
                      )
                    }
                    className="flex w-full items-center gap-3 text-left"
                  >
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-cyan-400 text-xl font-black text-slate-950">
                      M
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="font-black">Matched Friend</p>
                      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                        <CountryBadge
                          country={friend.friend_profile?.country || ""}
                        />
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        Added: {new Date(friend.created_at).toLocaleString()}
                      </p>
                    </div>

                    <div className="text-xl font-black text-slate-400">
                      {isOpen ? "−" : "+"}
                    </div>
                  </button>

                  {isOpen ? (
                    <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-200 pt-4 dark:border-slate-700">
                      <Button
                        type="button"
                        onClick={() => openMessage(friend.friend_id)}
                      >
                        Message
                      </Button>

                      <button
                        type="button"
                        onClick={() => unfriend(friend.friend_id)}
                        disabled={busyFriendId === friend.friend_id}
                        className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-700 hover:bg-slate-100 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:hover:bg-slate-800"
                      >
                        {busyFriendId === friend.friend_id
                          ? "Removing..."
                          : "Unfriend"}
                      </button>

                      <button
                        type="button"
                        onClick={() => blockFriend(friend.friend_id)}
                        disabled={busyFriendId === friend.friend_id}
                        className="rounded-2xl bg-red-500 px-4 py-2 text-sm font-black text-white hover:bg-red-600 disabled:opacity-50"
                      >
                        {busyFriendId === friend.friend_id
                          ? "Blocking..."
                          : "Block"}
                      </button>
                    </div>
                  ) : null}
                </Card>
              );
            })
          )}
        </div>
      ) : null}
    </main>
  );
}