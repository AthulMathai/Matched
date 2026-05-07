import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { createPing, updatePingStatus } from "@/lib/pings";

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = await request.json();

    const receiverId = String(body.receiverId || "");
    const sessionId = body.sessionId ? String(body.sessionId) : null;
    const presetMessage = String(body.presetMessage || "");

    if (!receiverId || !presetMessage) {
      return NextResponse.json(
        {
          status: "error",
          message: "Receiver and preset message are required.",
        },
        {
          status: 400,
        },
      );
    }

    const ping = await createPing({
      senderId: user.id,
      receiverId,
      sessionId,
      presetMessage,
    });

    return NextResponse.json({
      status: "sent",
      ping,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to send ping.";

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
    const user = await requireUser();
    const body = await request.json();

    const pingId = String(body.pingId || "");
    const status = String(body.status || "");

    if (!pingId) {
      return NextResponse.json(
        {
          status: "error",
          message: "Ping ID is required.",
        },
        {
          status: 400,
        },
      );
    }

    if (!["accepted", "ignored", "blocked"].includes(status)) {
      return NextResponse.json(
        {
          status: "error",
          message: "Invalid ping status.",
        },
        {
          status: 400,
        },
      );
    }

    const ping = await updatePingStatus({
      pingId,
      userId: user.id,
      status: status as "accepted" | "ignored" | "blocked",
    });

    return NextResponse.json({
      status: "updated",
      ping,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to update ping.";

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