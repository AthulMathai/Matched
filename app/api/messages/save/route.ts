import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { userCanAccessSession } from "@/lib/sessions";

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = await request.json();

    const sessionId = String(body.sessionId || "");
    const receiverId = String(body.receiverId || "");
    const messageBody = String(body.body || "").trim();

    if (!sessionId || !receiverId || !messageBody) {
      return NextResponse.json(
        { error: "Missing message fields." },
        { status: 400 },
      );
    }

    if (messageBody.length > 2000) {
      return NextResponse.json(
        { error: "Message is too long." },
        { status: 400 },
      );
    }

    const canAccess = await userCanAccessSession(user.id, sessionId);

    if (!canAccess) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 403 });
    }

    const supabase = await createClient();

    const { error } = await supabase.from("chat_messages").insert({
      session_id: sessionId,
      sender_id: user.id,
      receiver_id: receiverId,
      body: messageBody,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await supabase.from("notifications").insert({
      user_id: receiverId,
      actor_id: user.id,
      type: "message_received",
      title: "New message",
      body: "You received a message during a chat.",
      link_path: "/messages",
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Message save failed.",
      },
      { status: 500 },
    );
  }
}