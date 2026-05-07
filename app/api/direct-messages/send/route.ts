import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = await request.json();

    const receiverId = String(body.receiverId || "");
    const messageBody = String(body.body || "").trim();

    if (!receiverId || !messageBody) {
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

    const supabase = await createClient();

    const { data: friend } = await supabase
      .from("friends")
      .select("id")
      .or(
        `and(user_1_id.eq.${user.id},user_2_id.eq.${receiverId}),and(user_1_id.eq.${receiverId},user_2_id.eq.${user.id})`,
      )
      .maybeSingle();

    if (!friend) {
      return NextResponse.json(
        { error: "You can only message friends." },
        { status: 403 },
      );
    }

    const { error } = await supabase.from("direct_messages").insert({
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
      title: "New friend message",
      body: "You received a new message from a friend.",
      link_path: "/messages",
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Direct message failed.",
      },
      { status: 500 },
    );
  }
}