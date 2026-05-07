import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = await request.json();

    const blockedUserId = String(body.blockedUserId || "");

    if (!blockedUserId) {
      return NextResponse.json(
        { error: "Missing blocked user ID." },
        { status: 400 },
      );
    }

    if (blockedUserId === user.id) {
      return NextResponse.json(
        { error: "Invalid blocked user ID." },
        { status: 400 },
      );
    }

    const supabase = await createClient();

    const { error } = await supabase
      .from("blocked_users")
      .delete()
      .eq("blocker_id", user.id)
      .eq("blocked_user_id", blockedUserId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      unblockedUserId: blockedUserId,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unable to unblock user.",
      },
      { status: 500 },
    );
  }
}