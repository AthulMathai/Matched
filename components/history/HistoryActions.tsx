"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";

type RequestState = "none" | "incoming" | "outgoing" | "friends";

type HistoryActionsProps = {
  otherUserId: string;
  sessionId: string;
  requestState: RequestState;
  requestId?: string | null;
};

export default function HistoryActions({
  otherUserId,
  sessionId,
  requestState,
  requestId,
}: HistoryActionsProps) {
  const [state, setState] = useState<RequestState>(requestState);
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");

  async function sendRequest() {
    setBusy("request");
    setMessage("");

    const response = await fetch("/api/requests/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        receiverId: otherUserId,
        sourceSessionId: sessionId,
      }),
    });

    const result = await response.json().catch(() => ({}));

    setBusy("");

    if (response.ok) {
      setState("outgoing");
      setMessage("Request sent.");
    } else {
      setMessage(result.error || "Failed.");
    }
  }

  async function respond(action: "accepted" | "declined") {
    if (!requestId) return;

    setBusy(action);
    setMessage("");

    const response = await fetch("/api/requests/respond", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        requestId,
        action,
      }),
    });

    const result = await response.json().catch(() => ({}));

    setBusy("");

    if (response.ok) {
      setState(action === "accepted" ? "friends" : "none");
      setMessage(action === "accepted" ? "Friend added." : "Request declined.");
      window.location.reload();
    } else {
      setMessage(result.error || "Failed.");
    }
  }

  async function blockUser() {
    const confirmed = window.confirm("Block this user?");
    if (!confirmed) return;

    setBusy("block");
    setMessage("");

    const response = await fetch("/api/block", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        blockedUserId: otherUserId,
        reason: "Blocked from history",
      }),
    });

    const result = await response.json().catch(() => ({}));

    setBusy("");
    setMessage(response.ok ? "User blocked." : result.error || "Failed.");
  }

  async function reportUser() {
    const reason = window.prompt("Report reason:");
    if (!reason) return;

    setBusy("report");
    setMessage("");

    const response = await fetch("/api/report", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sessionId,
        reportedUserId: otherUserId,
        reason,
      }),
    });

    const result = await response.json().catch(() => ({}));

    setBusy("");
    setMessage(response.ok ? "Report submitted." : result.error || "Failed.");
  }

  if (state === "friends") return null;

  return (
    <div className="mt-4 space-y-3">
      <div className="flex flex-wrap gap-2">
        {state === "incoming" ? (
          <>
            <Button
              type="button"
              onClick={() => respond("accepted")}
              disabled={!!busy}
            >
              {busy === "accepted" ? "Accepting..." : "Accept Request"}
            </Button>

            <Button
              type="button"
              variant="secondary"
              onClick={() => respond("declined")}
              disabled={!!busy}
            >
              {busy === "declined" ? "Declining..." : "Decline"}
            </Button>
          </>
        ) : null}

        {state === "outgoing" ? (
          <Button type="button" disabled>
            Request Sent
          </Button>
        ) : null}

        {state === "none" ? (
          <Button type="button" onClick={sendRequest} disabled={!!busy}>
            {busy === "request" ? "Sending..." : "Send Request"}
          </Button>
        ) : null}

        <Button
          type="button"
          variant="secondary"
          onClick={reportUser}
          disabled={!!busy}
        >
          {busy === "report" ? "Reporting..." : "Report"}
        </Button>

        <Button
          type="button"
          variant="danger"
          onClick={blockUser}
          disabled={!!busy}
        >
          {busy === "block" ? "Blocking..." : "Block"}
        </Button>
      </div>

      {message ? (
        <p className="text-sm font-bold text-slate-500 dark:text-slate-400">
          {message}
        </p>
      ) : null}
    </div>
  );
}