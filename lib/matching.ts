import { createClient } from "@/lib/supabase/server";

type MatchResult =
  | {
      status: "matched";
      sessionId: string;
    }
  | {
      status: "waiting";
      sessionId: null;
    };

async function getRecentActiveSession(userId: string) {
  const supabase = await createClient();

  const cutoff = new Date(Date.now() - 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from("chat_sessions")
    .select("id, created_at, started_at, status")
    .eq("status", "active")
    .or(`user_1_id.eq.${userId},user_2_id.eq.${userId}`)
    .gte("created_at", cutoff)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data?.id || null;
}

async function getPartyMemberIds(partyId: string | null) {
  if (!partyId) return [];

  const supabase = await createClient();

  const { data } = await supabase
    .from("party_members")
    .select("user_id")
    .eq("party_id", partyId)
    .eq("status", "joined");

  return (data || []).map((row) => row.user_id as string);
}

async function hasBlockConflict(
  myUserId: string,
  myPartyId: string | null,
  otherUserId: string,
  otherPartyId: string | null,
) {
  const myUsers = myPartyId ? await getPartyMemberIds(myPartyId) : [myUserId];

  const otherUsers = otherPartyId
    ? await getPartyMemberIds(otherPartyId)
    : [otherUserId];

  const allUsers = [...new Set([...myUsers, ...otherUsers])];

  if (allUsers.length === 0) return false;

  const supabase = await createClient();

  const { data } = await supabase
    .from("blocked_users")
    .select("blocker_user_id, blocked_user_id")
    .or(
      `blocker_user_id.in.(${allUsers.join(",")}),blocked_user_id.in.(${allUsers.join(",")})`,
    );

  for (const block of data || []) {
    const blocker = block.blocker_user_id as string;
    const blocked = block.blocked_user_id as string;

    const mySideBlocksOther =
      myUsers.includes(blocker) && otherUsers.includes(blocked);

    const otherSideBlocksMine =
      otherUsers.includes(blocker) && myUsers.includes(blocked);

    if (mySideBlocksOther || otherSideBlocksMine) {
      return true;
    }
  }

  return false;
}

export async function leaveMatchQueue(userId: string) {
  const supabase = await createClient();

  await supabase.from("match_queue").delete().eq("user_id", userId);
}

export async function enterMatchQueue(
  userId: string,
  partyId: string | null = null,
): Promise<MatchResult> {
  const supabase = await createClient();

  // Important:
  // If another user already matched with this user, return that session.
  // This fixes the second browser staying on "Matching stopped".
  const existingSessionId = await getRecentActiveSession(userId);

  if (existingSessionId) {
    await leaveMatchQueue(userId);

    return {
      status: "matched",
      sessionId: existingSessionId,
    };
  }

  await leaveMatchQueue(userId);

  const { data: candidates, error: candidatesError } = await supabase
    .from("match_queue")
    .select("id, user_id, party_id, created_at")
    .neq("user_id", userId)
    .order("created_at", { ascending: true })
    .limit(25);

  if (candidatesError) {
    throw new Error(candidatesError.message);
  }

  for (const candidate of candidates || []) {
    const otherUserId = candidate.user_id as string;
    const otherPartyId = (candidate.party_id as string | null) || null;

    if (partyId && otherPartyId && partyId === otherPartyId) {
      continue;
    }

    const blockConflict = await hasBlockConflict(
      userId,
      partyId,
      otherUserId,
      otherPartyId,
    );

    if (blockConflict) {
      continue;
    }

    const { data: session, error: sessionError } = await supabase
      .from("chat_sessions")
      .insert({
        user_1_id: userId,
        user_2_id: otherUserId,
        status: "active",
        started_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (sessionError) {
      throw new Error(sessionError.message);
    }

    await supabase
      .from("match_queue")
      .delete()
      .or(`user_id.eq.${userId},user_id.eq.${otherUserId}`);

    if (partyId) {
      await supabase
        .from("party_rooms")
        .update({
          status: "matched",
          updated_at: new Date().toISOString(),
        })
        .eq("id", partyId);
    }

    if (otherPartyId) {
      await supabase
        .from("party_rooms")
        .update({
          status: "matched",
          updated_at: new Date().toISOString(),
        })
        .eq("id", otherPartyId);
    }

    return {
      status: "matched",
      sessionId: session.id,
    };
  }

  const { error: insertError } = await supabase.from("match_queue").insert({
    user_id: userId,
    party_id: partyId,
    created_at: new Date().toISOString(),
  });

  if (insertError) {
    throw new Error(insertError.message);
  }

  return {
    status: "waiting",
    sessionId: null,
  };
}