import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = await request.json();

    const historyId = String(body.historyId || "");

    if (!historyId) {
      return NextResponse.json(
        {
          status: "error",
          message: "History ID is required.",
        },
        {
          status: 400,
        },
      );
    }

    const supabase = await createClient();

    const { error } = await supabase
      .from("chat_history")
      .delete()
      .eq("id", historyId)
      .eq("user_id", user.id);

    if (error) {
      return NextResponse.json(
        {
          status: "error",
          message: error.message,
        },
        {
          status: 400,
        },
      );
    }

    return NextResponse.json({
      status: "hidden",
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: "error",
        message:
          error instanceof Error ? error.message : "Unable to hide history item.",
      },
      {
        status: 400,
      },
    );
  }
}