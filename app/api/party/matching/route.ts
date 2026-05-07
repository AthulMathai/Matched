import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { setPartyMatchingState } from "@/lib/party";

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = await request.json();

    const isMatching = Boolean(body.isMatching);

    const result = await setPartyMatchingState({
      userId: user.id,
      isMatching,
    });

    return NextResponse.json({
      ok: true,
      ...result,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to update matching state.",
      },
      { status: 400 },
    );
  }
}