import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { enterMatchQueue, leaveMatchQueue } from "@/lib/matching";

async function getActiveTeamParty(userId: string) {
  const supabase = await createClient();

  const { data: member } = await supabase
    .from("party_members")
    .select("party_id")
    .eq("user_id", userId)
    .eq("status", "joined")
    .order("joined_at", { ascending: false })
    .maybeSingle();

  if (!member?.party_id) return null;

  const { data: members } = await supabase
    .from("party_members")
    .select("user_id")
    .eq("party_id", member.party_id)
    .eq("status", "joined");

  if (!members || members.length <= 1) {
    await supabase
      .from("party_webrtc_signals")
      .delete()
      .eq("party_id", member.party_id);

    await supabase
      .from("match_queue")
      .delete()
      .or(`user_id.eq.${userId},party_id.eq.${member.party_id}`);

    await supabase
      .from("party_members")
      .update({ status: "left" })
      .eq("party_id", member.party_id);

    await supabase
      .from("party_rooms")
      .update({
        status: "closed",
        updated_at: new Date().toISOString(),
      })
      .eq("id", member.party_id);

    return null;
  }

  const { data: room } = await supabase
    .from("party_rooms")
    .select("id, host_user_id, status")
    .eq("id", member.party_id)
    .neq("status", "closed")
    .maybeSingle();

  if (!room) return null;

  return {
    room,
    members,
  };
}

export async function POST() {
  try {
    const user = await requireUser();

    const activeParty = await getActiveTeamParty(user.id);

    if (activeParty && activeParty.room.host_user_id !== user.id) {
      return NextResponse.json({
        status: "waiting",
        sessionId: null,
        message: "Only the team leader can start matching.",
      });
    }

    const result = await enterMatchQueue(user.id, activeParty?.room.id || null);

    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to enter match queue.";

    return NextResponse.json(
      {
        status: "error",
        message,
      },
      { status: 400 },
    );
  }
}

export async function DELETE() {
  try {
    const user = await requireUser();

    await leaveMatchQueue(user.id);

    return NextResponse.json({
      status: "cancelled",
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to leave match queue.";

    return NextResponse.json(
      {
        status: "error",
        message,
      },
      { status: 400 },
    );
  }
}