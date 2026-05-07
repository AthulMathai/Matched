import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = await request.json();

    const blockedUserId = String(body.blockedUserId || "");
    const reason = body.reason ? String(body.reason) : null;

    if (!blockedUserId) {
      return NextResponse.json(
        { error: "Missing blocked user ID." },
        { status: 400 },
      );
    }

    if (blockedUserId === user.id) {
      return NextResponse.json(
        { error: "You cannot block yourself." },
        { status: 400 },
      );
    }

    const supabase = await createClient();

    const { error } = await supabase.rpc("block_user_and_cleanup", {
      p_current_user_id: user.id,
      p_blocked_user_id: blockedUserId,
      p_reason: reason,
    });

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json({
      ok: true,
      blockedUserId,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to block user.",
      },
      { status: 500 },
    );
  }
}