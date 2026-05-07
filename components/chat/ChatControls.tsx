"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import ReportModal from "@/components/chat/ReportModal";

type ChatControlsProps = {
  sessionId: string;
  otherUserId: string;
  cameraEnabled: boolean;
  micEnabled: boolean;
  onToggleCamera: () => void;
  onToggleMic: () => void;
  compact?: boolean;
};

export default function ChatControls({
  sessionId,
  otherUserId,
  cameraEnabled,
  micEnabled,
  onToggleCamera,
  onToggleMic,
  compact = false,
}: ChatControlsProps) {
  const router = useRouter();

  const [reportOpen, setReportOpen] = useState(false);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  async function endSession(reason: string, redirectPath: string) {
    try {
      setBusy(reason);
      setError("");

      const response = await fetch("/api/sessions/end", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sessionId,
          reason,
        }),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(result.error || "Unable to end session.");
      }

      router.replace(redirectPath);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to end session.");
      setBusy("");
    }
  }

  async function blockUser() {
    const confirmBlock = window.confirm(
      "Block this user? You will not be matched with them again.",
    );

    if (!confirmBlock) return;

    try {
      setBusy("block");
      setError("");

      const blockResponse = await fetch("/api/block", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          blockedUserId: otherUserId,
          reason: "Blocked from live chat",
        }),
      });

      const blockResult = await blockResponse.json().catch(() => ({}));

      if (!blockResponse.ok) {
        throw new Error(blockResult.error || "Unable to block user.");
      }

      await endSession("blocked", "/match");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to block user.");
      setBusy("");
    }
  }

  const buttonBase =
    "rounded-2xl border border-slate-200 bg-white font-black text-slate-950 shadow-sm transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:hover:bg-slate-800";

  const dangerBase =
    "rounded-2xl bg-red-500 font-black text-white shadow-sm transition hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-50";

  const stopBase =
    "rounded-2xl bg-slate-950 font-black text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200";

  if (compact) {
    return (
      <>
        {error ? (
          <div className="mb-1 rounded-xl border border-red-400/30 bg-red-500/10 p-2 text-[11px] text-red-700 dark:text-red-200">
            {error}
          </div>
        ) : null}

        <div className="grid grid-cols-6 gap-2">
          <button
            type="button"
            className={`${buttonBase} px-2 py-3 text-[11px]`}
            onClick={onToggleCamera}
            disabled={!!busy}
          >
            {cameraEnabled ? "Cam Off" : "Cam On"}
          </button>

          <button
            type="button"
            className={`${buttonBase} px-2 py-3 text-[11px]`}
            onClick={onToggleMic}
            disabled={!!busy}
          >
            {micEnabled ? "Mute" : "Unmute"}
          </button>

          <button
            type="button"
            className={`${buttonBase} px-2 py-3 text-[11px]`}
            disabled={!!busy}
            onClick={() => endSession("skipped", "/match")}
          >
            {busy === "skipped" ? "..." : "Skip"}
          </button>

          <button
            type="button"
            className={`${buttonBase} px-2 py-3 text-[11px]`}
            disabled={!!busy}
            onClick={() => setReportOpen(true)}
          >
            Report
          </button>

          <button
            type="button"
            className={`${dangerBase} px-2 py-3 text-[11px]`}
            disabled={!!busy}
            onClick={blockUser}
          >
            Block
          </button>

          <button
            type="button"
            className={`${stopBase} px-2 py-3 text-[11px]`}
            disabled={!!busy}
            onClick={() => endSession("stopped", "/")}
          >
            Stop
          </button>
        </div>

        <ReportModal
          open={reportOpen}
          sessionId={sessionId}
          reportedUserId={otherUserId}
          onClose={() => setReportOpen(false)}
          onReported={() => endSession("reported", "/match")}
        />
      </>
    );
  }

  return (
    <div className="h-full">
      {error ? (
        <div className="mb-3 rounded-2xl border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-200">
          {error}
        </div>
      ) : null}

      <div className="card flex h-full flex-wrap items-center justify-center gap-3 p-4">
        <button
          type="button"
          className={`${buttonBase} px-5 py-3 text-sm`}
          onClick={onToggleCamera}
          disabled={!!busy}
        >
          {cameraEnabled ? "Turn Camera Off" : "Turn Camera On"}
        </button>

        <button
          type="button"
          className={`${buttonBase} px-5 py-3 text-sm`}
          onClick={onToggleMic}
          disabled={!!busy}
        >
          {micEnabled ? "Mute Mic" : "Unmute Mic"}
        </button>

        <button
          type="button"
          className={`${buttonBase} px-5 py-3 text-sm`}
          disabled={!!busy}
          onClick={() => endSession("skipped", "/match")}
        >
          {busy === "skipped" ? "Saving..." : "Skip"}
        </button>

        <button
          type="button"
          className={`${buttonBase} px-5 py-3 text-sm`}
          disabled={!!busy}
          onClick={() => setReportOpen(true)}
        >
          Report
        </button>

        <button
          type="button"
          className={`${dangerBase} px-5 py-3 text-sm`}
          disabled={!!busy}
          onClick={blockUser}
        >
          Block
        </button>

        <button
          type="button"
          className={`${stopBase} px-5 py-3 text-sm`}
          disabled={!!busy}
          onClick={() => endSession("stopped", "/")}
        >
          {busy === "stopped" ? "Stopping..." : "Stop"}
        </button>
      </div>

      <ReportModal
        open={reportOpen}
        sessionId={sessionId}
        reportedUserId={otherUserId}
        onClose={() => setReportOpen(false)}
        onReported={() => endSession("reported", "/match")}
      />
    </div>
  );
}