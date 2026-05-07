import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { getInvitableFriends, getOrCreateOpenParty } from "@/lib/party";

export async function GET() {
  try {
    const user = await requireUser();
    const party = await getOrCreateOpenParty(user.id);
    const friends = await getInvitableFriends(user.id, party.id);

    return NextResponse.json({
      ok: true,
      party,
      friends,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to load friends.",
      },
      { status: 400 },
    );
  }
}