import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = await request.json();

    const receiverId = String(body.receiverId || "");
    const sourceSessionId = body.sourceSessionId
      ? String(body.sourceSessionId)
      : null;
    const message = body.message ? String(body.message).trim() : null;

    if (!receiverId) {
      return NextResponse.json(
        { error: "Missing receiver." },
        { status: 400 },
      );
    }

    if (receiverId === user.id) {
      return NextResponse.json(
        { error: "You cannot request yourself." },
        { status: 400 },
      );
    }

    const supabase = await createClient();

    const { error } = await supabase.from("connection_requests").upsert(
      {
        sender_id: user.id,
        receiver_id: receiverId,
        source_session_id: sourceSessionId,
        message,
        status: "pending",
      },
      {
        onConflict: "sender_id,receiver_id",
      },
    );

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const { error: notificationError } = await supabase.rpc(
      "create_user_notification",
      {
        p_user_id: receiverId,
        p_actor_id: user.id,
        p_type: "request_received",
        p_title: "New connection request",
        p_body: "Someone you matched with sent you a request.",
        p_link_path: "/messages?tab=requests",
      },
    );

    if (notificationError) {
      return NextResponse.json(
        {
          error: `Request sent, but notification failed: ${notificationError.message}`,
        },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Request failed.",
      },
      { status: 500 },
    );
  }
}