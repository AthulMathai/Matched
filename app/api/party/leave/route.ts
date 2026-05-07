import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { leaveCurrentParty } from "@/lib/party";

export async function POST() {
  try {
    const user = await requireUser();
    const result = await leaveCurrentParty(user.id);

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error ? error.message : "Unable to leave team.",
      },
      { status: 400 },
    );
  }
}