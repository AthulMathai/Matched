import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const user = await requireUser();
    const supabase = await createClient();

    const { data: member, error: memberError } = await supabase
      .from("party_members")
      .select("id, party_id, user_id, role, status, joined_at")
      .eq("user_id", user.id)
      .eq("status", "joined")
      .order("joined_at", { ascending: false })
      .maybeSingle();

    if (memberError) {
      throw new Error(memberError.message);
    }

    if (!member?.party_id) {
      return NextResponse.json({
        ok: true,
        room: null,
        members: [],
        pendingInvites: [],
      });
    }

    const { data: room, error: roomError } = await supabase
      .from("party_rooms")
      .select("id, host_user_id, status, created_at, updated_at")
      .eq("id", member.party_id)
      .neq("status", "closed")
      .maybeSingle();

    if (roomError) {
      throw new Error(roomError.message);
    }

    if (!room) {
      await supabase
        .from("party_members")
        .update({ status: "left" })
        .eq("party_id", member.party_id)
        .eq("user_id", user.id);

      return NextResponse.json({
        ok: true,
        room: null,
        members: [],
        pendingInvites: [],
      });
    }

    const { data: members, error: membersError } = await supabase
      .from("party_members")
      .select("id, party_id, user_id, role, status, joined_at")
      .eq("party_id", room.id)
      .eq("status", "joined")
      .order("joined_at", { ascending: true });

    if (membersError) {
      throw new Error(membersError.message);
    }

    const activeMembers = members || [];

    const nowIso = new Date().toISOString();

    const { data: pendingInvites, error: invitesError } = await supabase
      .from("party_invites")
      .select(
        "id, party_id, sender_id, receiver_id, status, created_at, expires_at",
      )
      .eq("party_id", room.id)
      .eq("status", "pending")
      .gt("expires_at", nowIso);

    if (invitesError) {
      throw new Error(invitesError.message);
    }

    const hasPendingInvites = (pendingInvites || []).length > 0;

    // Close solo party only when there is no pending invite.
    // This stops the invite from expiring immediately while the host waits.
    if (activeMembers.length <= 1 && !hasPendingInvites) {
      await supabase.from("party_webrtc_signals").delete().eq("party_id", room.id);

      await supabase
        .from("match_queue")
        .delete()
        .or(`user_id.eq.${user.id},party_id.eq.${room.id}`);

      await supabase
        .from("party_members")
        .update({ status: "left" })
        .eq("party_id", room.id);

      await supabase
        .from("party_rooms")
        .update({
          status: "closed",
          updated_at: new Date().toISOString(),
        })
        .eq("id", room.id);

      return NextResponse.json({
        ok: true,
        room: null,
        members: [],
        pendingInvites: [],
      });
    }

    const memberUserIds = activeMembers.map((item) => item.user_id);

    const { data: profiles } =
      memberUserIds.length > 0
        ? await supabase
            .from("profiles")
            .select("id, country, language")
            .in("id", memberUserIds)
        : { data: [] };

    const profileMap = new Map(
      (profiles || []).map((profile) => [profile.id, profile]),
    );

    const membersWithProfiles = activeMembers.map((item) => ({
      ...item,
      profile: profileMap.get(item.user_id) || null,
    }));

    return NextResponse.json({
      ok: true,
      room,
      members: membersWithProfiles,
      pendingInvites: pendingInvites || [],
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to load party status.",
        room: null,
        members: [],
        pendingInvites: [],
      },
      { status: 500 },
    );
  }
}