import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = await request.json();

    const friendId = String(body.friendId || "");

    if (!friendId) {
      return NextResponse.json(
        { error: "Missing friend ID." },
        { status: 400 },
      );
    }

    if (friendId === user.id) {
      return NextResponse.json(
        { error: "Invalid friend ID." },
        { status: 400 },
      );
    }

    const supabase = await createClient();

    const { error } = await supabase.rpc("remove_friend_and_chat", {
      p_current_user_id: user.id,
      p_friend_id: friendId,
    });

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json({
      ok: true,
      removedFriendId: friendId,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unable to remove friend.",
      },
      { status: 500 },
    );
  }
}