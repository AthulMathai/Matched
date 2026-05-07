import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { createReport } from "@/lib/reports";

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = await request.json();

    const reportedUserId = String(body.reportedUserId || "");
    const sessionId = body.sessionId ? String(body.sessionId) : null;
    const reason = String(body.reason || "");
    const notes = body.notes ? String(body.notes) : null;

    if (!reportedUserId || !reason) {
      return NextResponse.json(
        {
          status: "error",
          message: "Reported user and reason are required.",
        },
        {
          status: 400,
        },
      );
    }

    const report = await createReport({
      reporterId: user.id,
      reportedUserId,
      sessionId,
      reason,
      notes,
    });

    return NextResponse.json({
      status: "reported",
      report,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to create report.";

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