import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { completeAdImpression, createAdImpression } from "@/lib/ads";

export async function POST() {
  try {
    const user = await requireUser();

    const impression = await createAdImpression({
      userId: user.id,
      placement: "pre_match",
    });

    return NextResponse.json({
      status: "created",
      impression,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to create ad impression.";

    return NextResponse.json(
      {
        status: "error",
        message,
      },
      {
        status: 400,
      },
    );
  }
}

export async function PATCH(request: Request) {
  try {
    await requireUser();

    const body = await request.json();
    const impressionId = String(body.impressionId || "");
    const watchedSeconds = Number(body.watchedSeconds || 0);

    if (!impressionId) {
      return NextResponse.json(
        {
          status: "error",
          message: "Impression ID is required.",
        },
        {
          status: 400,
        },
      );
    }

    const impression = await completeAdImpression({
      impressionId,
      watchedSeconds,
    });

    return NextResponse.json({
      status: "completed",
      impression,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to complete ad impression.";

    return NextResponse.json(
      {
        status: "error",
        message,
      },
      {
        status: 400,
      },
    );
  }
}