import Card from "@/components/ui/Card";
import CountryBadge from "@/components/ui/CountryBadge";
import HistoryActions from "@/components/history/HistoryActions";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

type HistoryRow = {
  id: string;
  session_id: string;
  user_id: string;
  other_user_id: string;
  duration_seconds: number;
  created_at: string;
  expires_at: string;
  other_profile?: any;
  messages?: any[];
  request_state?: "none" | "incoming" | "outgoing" | "friends";
  request_id?: string | null;
};

function formatDuration(seconds: number) {
  if (seconds < 60) return `${seconds}s`;

  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;

  return `${mins}m ${secs}s`;
}

export default async function HistoryPage() {
  const user = await requireUser();
  const supabase = await createClient();

  try {
    await supabase.rpc("cleanup_expired_history");
  } catch {}

  const { data: historyRows } = await supabase
    .from("chat_history")
    .select(
      `
      id,
      session_id,
      user_id,
      other_user_id,
      duration_seconds,
      created_at,
      expires_at
    `,
    )
    .eq("user_id", user.id)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false });

  const allRows = (historyRows || []) as HistoryRow[];

  const otherUserIds = [...new Set(allRows.map((row) => row.other_user_id))];

  const { data: friends } =
    otherUserIds.length > 0
      ? await supabase
          .from("friends")
          .select("id, user_1_id, user_2_id")
          .or(`user_1_id.eq.${user.id},user_2_id.eq.${user.id}`)
      : { data: [] };

  const friendIds = new Set(
    (friends || []).map((friend) =>
      friend.user_1_id === user.id ? friend.user_2_id : friend.user_1_id,
    ),
  );

  const notFriendRows = allRows.filter((row) => !friendIds.has(row.other_user_id));

  const latestByUser = new Map<string, HistoryRow>();

  for (const row of notFriendRows) {
    if (!latestByUser.has(row.other_user_id)) {
      latestByUser.set(row.other_user_id, row);
    }
  }

  const rows = Array.from(latestByUser.values());
  const filteredOtherUserIds = [...new Set(rows.map((row) => row.other_user_id))];
  const sessionIds = [...new Set(rows.map((row) => row.session_id))];

  const { data: profiles } =
    filteredOtherUserIds.length > 0
      ? await supabase
          .from("profiles")
          .select("id, country, language")
          .in("id", filteredOtherUserIds)
      : { data: [] };

  const { data: tagRows } =
    filteredOtherUserIds.length > 0
      ? await supabase
          .from("user_tags")
          .select("user_id, tags(name)")
          .in("user_id", filteredOtherUserIds)
      : { data: [] };

  const { data: messageRows } =
    sessionIds.length > 0
      ? await supabase
          .from("chat_messages")
          .select("id, session_id, sender_id, receiver_id, body, created_at")
          .in("session_id", sessionIds)
          .order("created_at", { ascending: true })
      : { data: [] };

  const { data: requestRows } =
    filteredOtherUserIds.length > 0
      ? await supabase
          .from("connection_requests")
          .select("id, sender_id, receiver_id, status")
          .or(
            `and(sender_id.eq.${user.id},receiver_id.in.(${filteredOtherUserIds.join(
              ",",
            )})),and(receiver_id.eq.${user.id},sender_id.in.(${filteredOtherUserIds.join(
              ",",
            )}))`,
          )
      : { data: [] };

  const profileMap = new Map<string, any>();

  for (const profile of profiles || []) {
    profileMap.set(profile.id, { ...profile, tags: [] });
  }

  for (const tagRow of tagRows || []) {
    const profile = profileMap.get(tagRow.user_id);

    if (profile && tagRow.tags) {
      profile.tags.push(tagRow.tags);
    }
  }

  const messageMap = new Map<string, any[]>();

  for (const message of messageRows || []) {
    const current = messageMap.get(message.session_id) || [];
    current.push(message);
    messageMap.set(message.session_id, current);
  }

  function getRequestInfo(otherUserId: string) {
    const request = (requestRows || []).find(
      (item) =>
        item.status === "pending" &&
        ((item.sender_id === user.id && item.receiver_id === otherUserId) ||
          (item.receiver_id === user.id && item.sender_id === otherUserId)),
    );

    if (!request) {
      return {
        request_state: "none" as const,
        request_id: null,
      };
    }

    if (request.receiver_id === user.id) {
      return {
        request_state: "incoming" as const,
        request_id: request.id,
      };
    }

    return {
      request_state: "outgoing" as const,
      request_id: request.id,
    };
  }

  const enrichedRows = rows.map((row) => ({
    ...row,
    other_profile: profileMap.get(row.other_user_id) || null,
    messages: messageMap.get(row.session_id) || [],
    ...getRequestInfo(row.other_user_id),
  }));

  return (
    <main className="mx-auto w-full max-w-6xl px-5 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-black">History</h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          Recent matched users are saved for 24 hours. Friends are removed from
          history.
        </p>
      </div>

      {enrichedRows.length === 0 ? (
        <Card className="p-6">
          <p className="font-bold">No recent history.</p>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            People you match with will appear here.
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {enrichedRows.map((row) => {
            const profile = row.other_profile;
            const tags = profile?.tags || [];
            const expiresAt = new Date(row.expires_at);

            return (
              <Card key={row.id} className="p-5">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="text-lg font-black">Matched user</p>

                    <div className="mt-2 flex flex-wrap gap-2 text-sm text-slate-500 dark:text-slate-400">
                      <span>
                        Country:{" "}
                        <CountryBadge country={profile?.country || ""} />
                      </span>

                      {profile?.language ? (
                        <span>Language: {profile.language}</span>
                      ) : null}

                      <span>Duration: {formatDuration(row.duration_seconds)}</span>
                    </div>

                    {tags.length > 0 ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {tags.map((tag: any, index: number) => (
                          <span key={`${tag.name}-${index}`} className="badge">
                            {tag.name}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
                        No tags found.
                      </p>
                    )}
                  </div>

                  <div className="text-sm text-slate-500 dark:text-slate-400">
                    Expires: {expiresAt.toLocaleString()}
                  </div>
                </div>

                <div className="mt-5 rounded-3xl border border-slate-200 p-4 dark:border-slate-700">
                  <p className="mb-3 font-black">Messages</p>

                  {row.messages && row.messages.length > 0 ? (
                    <div className="space-y-2">
                      {row.messages.map((message) => (
                        <div
                          key={message.id}
                          className={`flex ${
                            message.sender_id === user.id
                              ? "justify-end"
                              : "justify-start"
                          }`}
                        >
                          <div
                            className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${
                              message.sender_id === user.id
                                ? "bg-cyan-400 text-slate-950"
                                : "bg-slate-200 text-slate-900 dark:bg-slate-800 dark:text-white"
                            }`}
                          >
                            {message.body}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      No messages were sent in this chat.
                    </p>
                  )}
                </div>

                <HistoryActions
                  otherUserId={row.other_user_id}
                  sessionId={row.session_id}
                  requestState={row.request_state || "none"}
                  requestId={row.request_id || null}
                />
              </Card>
            );
          })}
        </div>
      )}
    </main>
  );
}