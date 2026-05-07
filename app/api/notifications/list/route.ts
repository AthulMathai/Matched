import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const user = await requireUser();
    const supabase = await createClient();

    const { data: notifications, error: notificationError } = await supabase
      .from("notifications")
      .select("id, user_id, actor_id, type, title, body, link_path, is_read, created_at")
      .eq("user_id", user.id)
      .eq("is_read", false)
      .order("created_at", { ascending: false })
      .limit(20);

    if (notificationError) {
      return NextResponse.json(
        { error: notificationError.message },
        { status: 500 },
      );
    }

    const { data: connectionRequests } = await supabase
      .from("connection_requests")
      .select("id, sender_id, receiver_id, status, message, created_at")
      .eq("receiver_id", user.id)
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    const { data: partyInvites } = await supabase
      .from("party_invites")
      .select("id, party_id, sender_id, receiver_id, status, created_at")
      .eq("receiver_id", user.id)
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    return NextResponse.json({
      ok: true,
      notifications: notifications || [],
      connectionRequests: connectionRequests || [],
      partyInvites: partyInvites || [],
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to load notifications.",
      },
      { status: 500 },
    );
  }
}