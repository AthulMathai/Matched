import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { sendMessage } from "@/lib/messages";

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = await request.json();

    const pingId = String(body.pingId || "");
    const receiverId = String(body.receiverId || "");
    const messageBody = String(body.body || "");

    if (!pingId || !receiverId || !messageBody.trim()) {
      return NextResponse.json(
        {
          status: "error",
          message: "Ping, receiver, and message are required.",
        },
        {
          status: 400,
        },
      );
    }

    const message = await sendMessage({
      pingId,
      senderId: user.id,
      receiverId,
      body: messageBody,
    });

    return NextResponse.json({
      status: "sent",
      message,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to send message.";

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