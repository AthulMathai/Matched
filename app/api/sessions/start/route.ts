import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { getActiveSessionForUser } from "@/lib/sessions";

export async function GET() {
  try {
    const user = await requireUser();
    const session = await getActiveSessionForUser(user.id);

    return NextResponse.json({
      session,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to get active session.";

    return NextResponse.json(
      {
        session: null,
        message,
      },
      {
        status: 400,
      },
    );
  }
}