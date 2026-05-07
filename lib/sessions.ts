import { saveHistoryForBothUsers } from "./history";
import { createClient } from "./supabase/server";

export async function createChatSession(user1Id: string, user2Id: string) {
  if (user1Id === user2Id) {
    throw new Error("Cannot create a session with the same user.");
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("chat_sessions")
    .insert({
      user_1_id: user1Id,
      user_2_id: user2Id,
      status: "active",
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function getChatSession(sessionId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("chat_sessions")
    .select("*")
    .eq("id", sessionId)
    .single();

  if (error) return null;

  return data;
}

export async function userCanAccessSession(userId: string, sessionId: string) {
  const session = await getChatSession(sessionId);

  if (!session) return false;

  return session.user_1_id === userId || session.user_2_id === userId;
}

export async function endChatSession({
  sessionId,
  userId,
  reason,
}: {
  sessionId: string;
  userId: string;
  reason: string;
}) {
  const supabase = await createClient();

  const session = await getChatSession(sessionId);

  if (!session) {
    throw new Error("Session not found.");
  }

  if (session.user_1_id !== userId && session.user_2_id !== userId) {
    throw new Error("You do not have access to this session.");
  }

  const endedAt = new Date();
  const startedAt = new Date(session.started_at || session.created_at);
  const durationSeconds = Math.max(
    0,
    Math.floor((endedAt.getTime() - startedAt.getTime()) / 1000),
  );

  if (session.status === "active") {
    const { data, error } = await supabase
      .from("chat_sessions")
      .update({
        status: reason === "reported" ? "reported" : "ended",
        ended_at: endedAt.toISOString(),
        duration_seconds: durationSeconds,
        ended_reason: reason,
      })
      .eq("id", sessionId)
      .select("*")
      .single();

    if (error) {
      throw new Error(error.message);
    }

    await saveHistoryForBothUsers({
      sessionId,
      durationSeconds,
    });

    return data;
  }

  await saveHistoryForBothUsers({
    sessionId,
    durationSeconds: session.duration_seconds || durationSeconds,
  });

  return session;
}

export async function getActiveSessionForUser(userId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("chat_sessions")
    .select("*")
    .eq("status", "active")
    .or(`user_1_id.eq.${userId},user_2_id.eq.${userId}`)
    .order("created_at", {
      ascending: false,
    })
    .limit(1);

  if (error) {
    throw new Error(error.message);
  }

  return data?.[0] || null;
}

export function getOtherUserId(
  session: {
    user_1_id: string;
    user_2_id: string;
  },
  currentUserId: string,
) {
  if (session.user_1_id === currentUserId) return session.user_2_id;
  if (session.user_2_id === currentUserId) return session.user_1_id;

  return null;
}