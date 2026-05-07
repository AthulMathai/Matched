import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const supabase = await createClient();
    const body = await request.json();

    const receiverId = String(body.receiverId || body.friendId || "");

    if (!receiverId) {
      return NextResponse.json(
        { ok: false, error: "Friend ID is required." },
        { status: 400 },
      );
    }

    if (receiverId === user.id) {
      return NextResponse.json(
        { ok: false, error: "You cannot invite yourself." },
        { status: 400 },
      );
    }

    const { data: friend } = await supabase
      .from("friends")
      .select("id")
      .or(
        `and(user_1_id.eq.${user.id},user_2_id.eq.${receiverId}),and(user_1_id.eq.${receiverId},user_2_id.eq.${user.id})`,
      )
      .maybeSingle();

    if (!friend) {
      return NextResponse.json(
        { ok: false, error: "This user is not in your friends list." },
        { status: 403 },
      );
    }

    await supabase
      .from("party_invites")
      .update({ status: "expired" })
      .eq("sender_id", user.id)
      .eq("receiver_id", receiverId)
      .eq("status", "pending");

    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", receiverId)
      .eq("title", "Team invite");

    const { data: oldMemberships } = await supabase
      .from("party_members")
      .select("party_id")
      .eq("user_id", user.id)
      .eq("status", "joined");

    for (const oldMembership of oldMemberships || []) {
      await supabase
        .from("party_webrtc_signals")
        .delete()
        .eq("party_id", oldMembership.party_id);

      await supabase
        .from("match_queue")
        .delete()
        .or(`user_id.eq.${user.id},party_id.eq.${oldMembership.party_id}`);

      await supabase
        .from("party_members")
        .update({ status: "left" })
        .eq("party_id", oldMembership.party_id)
        .eq("user_id", user.id);

      const { data: oldMembers } = await supabase
        .from("party_members")
        .select("id")
        .eq("party_id", oldMembership.party_id)
        .eq("status", "joined");

      if (!oldMembers || oldMembers.length <= 1) {
        await supabase
          .from("party_rooms")
          .update({
            status: "closed",
            updated_at: new Date().toISOString(),
          })
          .eq("id", oldMembership.party_id);
      }
    }

    const { data: room, error: roomError } = await supabase
      .from("party_rooms")
      .insert({
        host_user_id: user.id,
        status: "open",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (roomError) {
      throw new Error(roomError.message);
    }

    const { error: memberError } = await supabase.from("party_members").insert({
      party_id: room.id,
      user_id: user.id,
      role: "host",
      status: "joined",
      joined_at: new Date().toISOString(),
    });

    if (memberError) {
      throw new Error(memberError.message);
    }

    const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();

    const { data: invite, error: inviteError } = await supabase
      .from("party_invites")
      .insert({
        party_id: room.id,
        sender_id: user.id,
        receiver_id: receiverId,
        status: "pending",
        expires_at: expiresAt,
        created_at: new Date().toISOString(),
      })
      .select("id, party_id, sender_id, receiver_id, status, created_at, expires_at")
      .single();

    if (inviteError) {
      throw new Error(inviteError.message);
    }

    await supabase.from("notifications").insert({
      user_id: receiverId,
      title: "Team invite",
      body: "A friend invited you to join their match team.",
      link_path: "/messages?tab=requests",
      is_read: false,
      created_at: new Date().toISOString(),
    });

    return NextResponse.json({
      ok: true,
      invite,
      partyId: room.id,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error ? error.message : "Unable to send team invite.",
      },
      { status: 500 },
    );
  }
}