import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = await request.json();

    const requestId = String(body.requestId || "");
    const action = String(body.action || "");

    if (!requestId || !["accepted", "declined"].includes(action)) {
      return NextResponse.json(
        { error: "Invalid request response." },
        { status: 400 },
      );
    }

    const supabase = await createClient();

    const { data: requestRow, error: requestError } = await supabase
      .from("connection_requests")
      .select("*")
      .eq("id", requestId)
      .eq("receiver_id", user.id)
      .eq("status", "pending")
      .single();

    if (requestError || !requestRow) {
      return NextResponse.json(
        { error: "Request not found." },
        { status: 404 },
      );
    }

    const { error: updateError } = await supabase
      .from("connection_requests")
      .update({
        status: action,
        responded_at: new Date().toISOString(),
      })
      .eq("id", requestId);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    if (action === "accepted") {
      const sorted = [requestRow.sender_id, requestRow.receiver_id].sort();

      await supabase.from("friends").upsert(
        {
          user_1_id: sorted[0],
          user_2_id: sorted[1],
          request_id: requestRow.id,
        },
        { onConflict: "user_1_id,user_2_id" },
      );

      await supabase
        .from("chat_history")
        .delete()
        .or(
          `and(user_id.eq.${requestRow.sender_id},other_user_id.eq.${requestRow.receiver_id}),and(user_id.eq.${requestRow.receiver_id},other_user_id.eq.${requestRow.sender_id})`,
        );

      await supabase.rpc("create_user_notification", {
        p_user_id: requestRow.sender_id,
        p_actor_id: user.id,
        p_type: "request_accepted",
        p_title: "Request accepted",
        p_body: "Your connection request was accepted.",
        p_link_path: "/messages",
      });
    }

    if (action === "declined") {
      await supabase.rpc("create_user_notification", {
        p_user_id: requestRow.sender_id,
        p_actor_id: user.id,
        p_type: "request_declined",
        p_title: "Request declined",
        p_body: "Your connection request was declined.",
        p_link_path: "/messages?tab=requests",
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Response failed.",
      },
      { status: 500 },
    );
  }
}