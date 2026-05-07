import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

function normalizeInviteAction(action: string) {
  const value = action.toLowerCase().trim();

  if (["accept", "accepted", "approve", "approved", "join"].includes(value)) {
    return "accept";
  }

  if (["decline", "declined", "reject", "rejected", "deny"].includes(value)) {
    return "decline";
  }

  return "";
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const supabase = await createClient();
    const body = await request.json();

    const inviteId = String(body.inviteId || body.id || "");
    const action = normalizeInviteAction(String(body.action || body.status || ""));

    if (!action) {
      return NextResponse.json(
        { ok: false, error: "Invalid invite action." },
        { status: 400 },
      );
    }

    let inviteQuery = supabase
      .from("party_invites")
      .select("id, party_id, sender_id, receiver_id, status, expires_at, created_at")
      .eq("receiver_id", user.id)
      .eq("status", "pending")
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1);

    if (inviteId) {
      const { data: clickedInvite } = await supabase
        .from("party_invites")
        .select("id, party_id, sender_id, receiver_id, status, expires_at, created_at")
        .eq("id", inviteId)
        .eq("receiver_id", user.id)
        .maybeSingle();

      if (
        clickedInvite &&
        clickedInvite.status === "pending" &&
        (!clickedInvite.expires_at ||
          new Date(clickedInvite.expires_at).getTime() > Date.now())
      ) {
        inviteQuery = supabase
          .from("party_invites")
          .select("id, party_id, sender_id, receiver_id, status, expires_at, created_at")
          .eq("id", clickedInvite.id)
          .limit(1);
      }
    }

    const { data: inviteRows, error: inviteError } = await inviteQuery;

    if (inviteError) {
      throw new Error(inviteError.message);
    }

    const invite = inviteRows?.[0];

    if (!invite) {
      return NextResponse.json(
        {
          ok: false,
          error: "This team invite expired. Ask your friend to send a new invite.",
        },
        { status: 400 },
      );
    }

    if (action === "decline") {
      await supabase
        .from("party_invites")
        .update({ status: "declined" })
        .eq("id", invite.id);

      await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("user_id", user.id)
        .eq("title", "Team invite");

      return NextResponse.json({
        ok: true,
        status: "declined",
      });
    }

    const { data: room, error: roomError } = await supabase
      .from("party_rooms")
      .select("id, host_user_id, status")
      .eq("id", invite.party_id)
      .neq("status", "closed")
      .maybeSingle();

    if (roomError) {
      throw new Error(roomError.message);
    }

    if (!room) {
      await supabase
        .from("party_invites")
        .update({ status: "expired" })
        .eq("id", invite.id);

      return NextResponse.json(
        {
          ok: false,
          error: "This team invite expired. Ask your friend to send a new invite.",
        },
        { status: 400 },
      );
    }

    const { data: oldMemberships } = await supabase
      .from("party_members")
      .select("party_id")
      .eq("user_id", user.id)
      .eq("status", "joined");

    for (const oldMembership of oldMemberships || []) {
      if (oldMembership.party_id !== room.id) {
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
    }

    await supabase
      .from("match_queue")
      .delete()
      .or(`user_id.eq.${user.id},party_id.eq.${room.id}`);

    const { error: memberError } = await supabase.from("party_members").upsert(
      {
        party_id: room.id,
        user_id: user.id,
        role: "member",
        status: "joined",
        joined_at: new Date().toISOString(),
      },
      { onConflict: "party_id,user_id" },
    );

    if (memberError) {
      throw new Error(memberError.message);
    }

    await supabase
      .from("party_invites")
      .update({ status: "accepted" })
      .eq("id", invite.id);

    await supabase
      .from("party_rooms")
      .update({
        status: "open",
        updated_at: new Date().toISOString(),
      })
      .eq("id", room.id);

    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", user.id)
      .eq("title", "Team invite");

    return NextResponse.json({
      ok: true,
      status: "accepted",
      partyId: room.id,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to respond to team invite.",
      },
      { status: 500 },
    );
  }
}