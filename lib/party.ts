import { createClient } from "@/lib/supabase/server";

export type PartyRoomRow = {
  id: string;
  host_user_id: string;
  status: "open" | "matching" | "matched" | "closed";
  created_at?: string;
  updated_at?: string;
};

export type PartyMemberRow = {
  id: string;
  party_id: string;
  user_id: string;
  role: "host" | "member";
  status: string;
  joined_at?: string;
};

async function attachProfilesToMembers(members: PartyMemberRow[]) {
  const supabase = await createClient();

  const userIds = [...new Set(members.map((member) => member.user_id))];

  if (userIds.length === 0) {
    return [];
  }

  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("id, country, language")
    .in("id", userIds);

  if (error) {
    throw new Error(error.message);
  }

  const profileMap = new Map(
    (profiles || []).map((profile) => [profile.id, profile]),
  );

  return members.map((member) => ({
    ...member,
    profile: profileMap.get(member.user_id) || null,
  }));
}

async function getRoomById(partyId: string): Promise<PartyRoomRow | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("party_rooms")
    .select("id, host_user_id, status, created_at, updated_at")
    .eq("id", partyId)
    .maybeSingle();

  if (error) throw new Error(error.message);

  return data as PartyRoomRow | null;
}

async function getJoinedMembers(partyId: string): Promise<PartyMemberRow[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("party_members")
    .select("id, party_id, user_id, role, status, joined_at")
    .eq("party_id", partyId)
    .eq("status", "joined")
    .order("joined_at", { ascending: true });

  if (error) throw new Error(error.message);

  return (data || []) as PartyMemberRow[];
}

async function getCurrentJoinedMemberships(
  userId: string,
): Promise<PartyMemberRow[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("party_members")
    .select("id, party_id, user_id, role, status, joined_at")
    .eq("user_id", userId)
    .eq("status", "joined")
    .order("joined_at", { ascending: false });

  if (error) throw new Error(error.message);

  return (data || []) as PartyMemberRow[];
}

async function leaveOtherActiveParties(userId: string, keepPartyId?: string) {
  const supabase = await createClient();

  let query = supabase
    .from("party_members")
    .update({ status: "left" })
    .eq("user_id", userId)
    .eq("status", "joined");

  if (keepPartyId) {
    query = query.neq("party_id", keepPartyId);
  }

  const { error } = await query;
  if (error) throw new Error(error.message);
}

async function repairSoloParty(userId: string, partyId: string) {
  const supabase = await createClient();

  const { error: roomError } = await supabase
    .from("party_rooms")
    .update({
      host_user_id: userId,
      status: "open",
      updated_at: new Date().toISOString(),
    })
    .eq("id", partyId);

  if (roomError) throw new Error(roomError.message);

  const { error: memberError } = await supabase
    .from("party_members")
    .update({
      role: "host",
      status: "joined",
    })
    .eq("party_id", partyId)
    .eq("user_id", userId);

  if (memberError) throw new Error(memberError.message);
}

async function closePartyCompletely(partyId: string) {
  const supabase = await createClient();

  await supabase.from("webrtc_signals").delete().eq("session_id", partyId);

  await supabase
    .from("party_invites")
    .update({
      status: "declined",
      responded_at: new Date().toISOString(),
    })
    .eq("party_id", partyId)
    .eq("status", "pending");

  await supabase
    .from("party_members")
    .update({
      status: "left",
    })
    .eq("party_id", partyId)
    .eq("status", "joined");

  await supabase
    .from("party_rooms")
    .update({
      status: "closed",
      updated_at: new Date().toISOString(),
    })
    .eq("id", partyId);
}

async function createSoloHostParty(userId: string): Promise<PartyRoomRow> {
  const supabase = await createClient();

  await leaveOtherActiveParties(userId);

  const { data: room, error: roomError } = await supabase
    .from("party_rooms")
    .insert({
      host_user_id: userId,
      status: "open",
    })
    .select("id, host_user_id, status, created_at, updated_at")
    .single();

  if (roomError || !room) {
    throw new Error(roomError?.message || "Unable to create team.");
  }

  const { error: memberError } = await supabase.from("party_members").insert({
    party_id: room.id,
    user_id: userId,
    role: "host",
    status: "joined",
  });

  if (memberError) {
    await supabase
      .from("party_rooms")
      .update({
        status: "closed",
        updated_at: new Date().toISOString(),
      })
      .eq("id", room.id);

    throw new Error(memberError.message);
  }

  return room as PartyRoomRow;
}

export async function getCurrentPartyStatus(userId: string) {
  const supabase = await createClient();

  const memberships = await getCurrentJoinedMemberships(userId);
  const membership = memberships[0];

  if (!membership) {
    return {
      room: null,
      members: [],
    };
  }

  await leaveOtherActiveParties(userId, membership.party_id);

  const room = await getRoomById(membership.party_id);

  if (!room || !["open", "matching"].includes(room.status)) {
    await supabase
      .from("party_members")
      .update({ status: "left" })
      .eq("id", membership.id);

    return {
      room: null,
      members: [],
    };
  }

  const { data: plainMembers, error: membersError } = await supabase
    .from("party_members")
    .select("id, party_id, user_id, role, status, joined_at")
    .eq("party_id", membership.party_id)
    .eq("status", "joined")
    .order("joined_at", { ascending: true });

  if (membersError) {
    throw new Error(membersError.message);
  }

  const joinedMembers = await attachProfilesToMembers(
    (plainMembers || []) as PartyMemberRow[],
  );

  if (joinedMembers.length === 1 && joinedMembers[0].user_id === userId) {
    await repairSoloParty(userId, membership.party_id);

    return {
      room: {
        ...room,
        host_user_id: userId,
        status: "open",
      },
      members: joinedMembers.map((member) => ({
        ...member,
        role: "host",
      })),
    };
  }

  return {
    room,
    members: joinedMembers,
  };
}

export async function getOrCreateOpenParty(userId: string) {
  const status = await getCurrentPartyStatus(userId);

  if (
    status.room &&
    ["open", "matching"].includes(status.room.status as string)
  ) {
    return status.room as PartyRoomRow;
  }

  return createSoloHostParty(userId);
}

export async function getInvitableFriends(userId: string, partyId: string) {
  const supabase = await createClient();

  const { data: friends, error: friendsError } = await supabase
    .from("friends")
    .select("id, user_1_id, user_2_id, created_at")
    .or(`user_1_id.eq.${userId},user_2_id.eq.${userId}`);

  if (friendsError) {
    throw new Error(friendsError.message);
  }

  const friendIds = [
    ...new Set(
      (friends || []).map((friend) =>
        friend.user_1_id === userId ? friend.user_2_id : friend.user_1_id,
      ),
    ),
  ];

  if (friendIds.length === 0) {
    return [];
  }

  const { data: existingMembers, error: existingMembersError } = await supabase
    .from("party_members")
    .select("user_id")
    .eq("party_id", partyId)
    .eq("status", "joined");

  if (existingMembersError) {
    throw new Error(existingMembersError.message);
  }

  const existingMemberIds = new Set(
    (existingMembers || []).map((member) => member.user_id),
  );

  const { data: blockedRows, error: blockedError } = await supabase
    .from("blocked_users")
    .select("blocker_id, blocked_user_id")
    .or(`blocker_id.eq.${userId},blocked_user_id.eq.${userId}`);

  if (blockedError) {
    throw new Error(blockedError.message);
  }

  const blockedIds = new Set<string>();

  for (const row of blockedRows || []) {
    if (row.blocker_id === userId) blockedIds.add(row.blocked_user_id);
    if (row.blocked_user_id === userId) blockedIds.add(row.blocker_id);
  }

  const eligibleFriendIds = friendIds.filter(
    (friendId) => !existingMemberIds.has(friendId) && !blockedIds.has(friendId),
  );

  if (eligibleFriendIds.length === 0) {
    return [];
  }

  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("id, country, language")
    .in("id", eligibleFriendIds);

  if (profilesError) {
    throw new Error(profilesError.message);
  }

  const profileMap = new Map(
    (profiles || []).map((profile) => [profile.id, profile]),
  );

  return eligibleFriendIds.map((friendId) => ({
    friend_id: friendId,
    profile: profileMap.get(friendId) || null,
  }));
}

export async function sendPartyInvite({
  senderId,
  receiverId,
}: {
  senderId: string;
  receiverId: string;
}) {
  if (senderId === receiverId) {
    throw new Error("You cannot invite yourself.");
  }

  const supabase = await createClient();

  const room = await getOrCreateOpenParty(senderId);

  const { data: blockRows } = await supabase
    .from("blocked_users")
    .select("id")
    .or(
      `and(blocker_id.eq.${senderId},blocked_user_id.eq.${receiverId}),and(blocker_id.eq.${receiverId},blocked_user_id.eq.${senderId})`,
    );

  if ((blockRows || []).length > 0) {
    throw new Error("You cannot invite this user.");
  }

  await supabase
    .from("party_invites")
    .update({
      status: "declined",
      responded_at: new Date().toISOString(),
    })
    .eq("receiver_id", receiverId)
    .eq("status", "pending");

  await supabase
    .from("notifications")
    .update({
      is_read: true,
      read_at: new Date().toISOString(),
    })
    .eq("user_id", receiverId)
    .eq("type", "team_invite")
    .eq("is_read", false);

  const { data: invite, error: inviteError } = await supabase
    .from("party_invites")
    .insert({
      party_id: room.id,
      sender_id: senderId,
      receiver_id: receiverId,
      status: "pending",
      responded_at: null,
    })
    .select("*")
    .single();

  if (inviteError || !invite) {
    throw new Error(inviteError?.message || "Unable to send invite.");
  }

  await supabase.rpc("create_user_notification", {
    p_user_id: receiverId,
    p_actor_id: senderId,
    p_type: "team_invite",
    p_title: "Team invite",
    p_body: "A friend invited you to join their match team.",
    p_link_path: "/messages?tab=requests",
  });

  return invite;
}

export async function respondPartyInvite({
  userId,
  inviteId,
  action,
}: {
  userId: string;
  inviteId: string;
  action: "accepted" | "declined";
}) {
  const supabase = await createClient();

  const { data: invite, error: inviteError } = await supabase
    .from("party_invites")
    .select("*")
    .eq("id", inviteId)
    .eq("receiver_id", userId)
    .eq("status", "pending")
    .single();

  if (inviteError || !invite) {
    throw new Error("Invite not found or already handled.");
  }

  const room = await getRoomById(invite.party_id);

  if (!room || !["open", "matching"].includes(room.status)) {
    await supabase
      .from("party_invites")
      .update({
        status: "declined",
        responded_at: new Date().toISOString(),
      })
      .eq("id", inviteId);

    throw new Error(
      "This team invite expired. Ask your friend to send a new invite.",
    );
  }

  const members = await getJoinedMembers(invite.party_id);
  const hostStillJoined = members.some(
    (member) => member.user_id === room.host_user_id,
  );

  if (!hostStillJoined) {
    await supabase
      .from("party_invites")
      .update({
        status: "declined",
        responded_at: new Date().toISOString(),
      })
      .eq("id", inviteId);

    throw new Error(
      "This team invite expired. Ask your friend to send a new invite.",
    );
  }

  const { error: inviteUpdateError } = await supabase
    .from("party_invites")
    .update({
      status: action,
      responded_at: new Date().toISOString(),
    })
    .eq("id", inviteId)
    .eq("receiver_id", userId);

  if (inviteUpdateError) throw new Error(inviteUpdateError.message);

  await supabase
    .from("notifications")
    .update({
      is_read: true,
      read_at: new Date().toISOString(),
    })
    .eq("user_id", userId)
    .eq("type", "team_invite")
    .eq("is_read", false);

  if (action === "accepted") {
    await leaveOtherActiveParties(userId, invite.party_id);

    const { error: memberError } = await supabase.from("party_members").upsert(
      {
        party_id: invite.party_id,
        user_id: userId,
        role: "member",
        status: "joined",
      },
      {
        onConflict: "party_id,user_id",
      },
    );

    if (memberError) throw new Error(memberError.message);

    await supabase.rpc("create_user_notification", {
      p_user_id: invite.sender_id,
      p_actor_id: userId,
      p_type: "team_invite_accepted",
      p_title: "Team invite accepted",
      p_body: "Your friend joined your match team.",
      p_link_path: "/match",
    });
  }

  return { ok: true };
}

export async function leaveCurrentParty(userId: string) {
  const supabase = await createClient();

  const memberships = await getCurrentJoinedMemberships(userId);
  const membership = memberships[0];

  if (!membership) {
    return {
      ok: true,
      left: false,
    };
  }

  const room = await getRoomById(membership.party_id);

  await supabase
    .from("webrtc_signals")
    .delete()
    .eq("session_id", membership.party_id)
    .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`);

  if (room?.host_user_id === userId) {
    await closePartyCompletely(membership.party_id);
  } else {
    await supabase
      .from("party_members")
      .update({ status: "left" })
      .eq("party_id", membership.party_id)
      .eq("user_id", userId);
  }

  return {
    ok: true,
    left: true,
  };
}

export async function setPartyMatchingState({
  userId,
  isMatching,
}: {
  userId: string;
  isMatching: boolean;
}) {
  const supabase = await createClient();

  const party = isMatching
    ? await getOrCreateOpenParty(userId)
    : (await getCurrentPartyStatus(userId)).room;

  if (!party) {
    return { room: null };
  }

  if (party.host_user_id !== userId) {
    throw new Error("Only the team leader can start or stop matching.");
  }

  const nextStatus = isMatching ? "matching" : "open";

  const { data, error } = await supabase
    .from("party_rooms")
    .update({
      status: nextStatus,
      updated_at: new Date().toISOString(),
    })
    .eq("id", party.id)
    .eq("host_user_id", userId)
    .select("id, host_user_id, status, created_at, updated_at")
    .single();

  if (error) throw new Error(error.message);

  return {
    room: data,
  };
}