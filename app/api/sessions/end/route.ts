import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const supabase = await createClient();
    const body = await request.json();

    const sessionId = String(body.sessionId || "");
    const reason = String(body.reason || "ended");

    if (!sessionId) {
      return NextResponse.json(
        { ok: false, error: "Session ID is required." },
        { status: 400 },
      );
    }

    const { data: session, error: sessionError } = await supabase
      .from("chat_sessions")
      .select("id, user_1_id, user_2_id, status")
      .eq("id", sessionId)
      .maybeSingle();

    if (sessionError) throw new Error(sessionError.message);

    if (!session) {
      return NextResponse.json(
        { ok: false, error: "Session not found." },
        { status: 404 },
      );
    }

    const isUserInSession =
      session.user_1_id === user.id || session.user_2_id === user.id;

    if (!isUserInSession) {
      return NextResponse.json(
        { ok: false, error: "You are not part of this session." },
        { status: 403 },
      );
    }

    const otherUserId =
      session.user_1_id === user.id ? session.user_2_id : session.user_1_id;

    await supabase
      .from("match_queue")
      .delete()
      .in("user_id", [user.id, otherUserId]);

    await supabase.from("webrtc_signals").delete().eq("session_id", sessionId);

    const { error: updateError } = await supabase
      .from("chat_sessions")
      .update({
        status: "ended",
        ended_at: new Date().toISOString(),
        ended_by: user.id,
        end_reason: reason,
      })
      .eq("id", sessionId);

    if (updateError) throw new Error(updateError.message);

    return NextResponse.json({
      ok: true,
      status: "ended",
      reason,
      otherUserId,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error ? error.message : "Unable to end session.",
      },
      { status: 500 },
    );
  }
}