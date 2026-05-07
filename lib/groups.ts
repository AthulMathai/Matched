import { randomBytes } from "crypto";
import { createClient } from "@/lib/supabase/server";

function createInviteCode() {
  return randomBytes(4).toString("hex").toUpperCase();
}

export async function createGroupRoom(userId: string) {
  const supabase = await createClient();

  let inviteCode = createInviteCode();

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const { data, error } = await supabase
      .from("group_rooms")
      .insert({
        host_user_id: userId,
        invite_code: inviteCode,
        status: "waiting",
      })
      .select("*")
      .single();

    if (!error && data) {
      const { error: memberError } = await supabase
        .from("group_members")
        .insert({
          group_id: data.id,
          user_id: userId,
          role: "host",
          status: "joined",
        });

      if (memberError) {
        throw new Error(memberError.message);
      }

      return data;
    }

    inviteCode = createInviteCode();
  }

  throw new Error("Unable to create invite code.");
}

export async function joinGroupByInviteCode(userId: string, inviteCode: string) {
  const supabase = await createClient();

  const normalizedCode = inviteCode.trim().toUpperCase();

  const { data: room, error: roomError } = await supabase
    .from("group_rooms")
    .select("*")
    .eq("invite_code", normalizedCode)
    .in("status", ["waiting", "matching"])
    .single();

  if (roomError || !room) {
    throw new Error("Group invite not found or expired.");
  }

  const { error: memberError } = await supabase.from("group_members").upsert(
    {
      group_id: room.id,
      user_id: userId,
      role: room.host_user_id === userId ? "host" : "member",
      status: "joined",
    },
    {
      onConflict: "group_id,user_id",
    },
  );

  if (memberError) {
    throw new Error(memberError.message);
  }

  return room;
}

export async function leaveGroupRoom(userId: string, groupId: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("group_members")
    .update({
      status: "left",
    })
    .eq("group_id", groupId)
    .eq("user_id", userId);

  if (error) {
    throw new Error(error.message);
  }

  return true;
}

export async function getGroupRoomStatus(userId: string, groupId: string) {
  const supabase = await createClient();

  const { data: room, error: roomError } = await supabase
    .from("group_rooms")
    .select("*")
    .eq("id", groupId)
    .single();

  if (roomError || !room) {
    throw new Error("Group room not found.");
  }

  const { data: ownMember } = await supabase
    .from("group_members")
    .select("id")
    .eq("group_id", groupId)
    .eq("user_id", userId)
    .eq("status", "joined")
    .maybeSingle();

  if (!ownMember && room.host_user_id !== userId) {
    throw new Error("You are not in this group.");
  }

  const { data: members, error: membersError } = await supabase
    .from("group_members")
    .select("id, party_id, user_id, role, status, joined_at")
    .eq("group_id", groupId)
    .eq("status", "joined")
    .order("joined_at", {
      ascending: true,
    });

  if (membersError) {
    throw new Error(membersError.message);
  }

  return {
    room,
    members: members || [],
  };
}

export async function startGroupMatching(userId: string, groupId: string) {
  const supabase = await createClient();

  const { data: room, error: roomError } = await supabase
    .from("group_rooms")
    .select("*")
    .eq("id", groupId)
    .eq("host_user_id", userId)
    .single();

  if (roomError || !room) {
    throw new Error("Only the group host can start matching.");
  }

  const { error: roomUpdateError } = await supabase
    .from("group_rooms")
    .update({
      status: "matching",
      updated_at: new Date().toISOString(),
    })
    .eq("id", groupId)
    .eq("host_user_id", userId);

  if (roomUpdateError) {
    throw new Error(roomUpdateError.message);
  }

  const { error: queueError } = await supabase.from("group_match_queue").upsert(
    {
      group_id: groupId,
      host_user_id: userId,
      status: "waiting",
      updated_at: new Date().toISOString(),
    },
    {
      onConflict: "group_id",
    },
  );

  if (queueError) {
    throw new Error(queueError.message);
  }

  return {
    ok: true,
  };
}

export async function stopGroupMatching(userId: string, groupId: string) {
  const supabase = await createClient();

  const { data: room, error: roomError } = await supabase
    .from("group_rooms")
    .select("*")
    .eq("id", groupId)
    .eq("host_user_id", userId)
    .single();

  if (roomError || !room) {
    throw new Error("Only the group host can stop matching.");
  }

  await supabase
    .from("group_match_queue")
    .update({
      status: "cancelled",
      updated_at: new Date().toISOString(),
    })
    .eq("group_id", groupId)
    .eq("host_user_id", userId);

  const { error } = await supabase
    .from("group_rooms")
    .update({
      status: "waiting",
      updated_at: new Date().toISOString(),
    })
    .eq("id", groupId)
    .eq("host_user_id", userId);

  if (error) {
    throw new Error(error.message);
  }

  return {
    ok: true,
  };
}