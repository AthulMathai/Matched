"use client";

import { useState } from "react";
import BlockButton from "@/components/chat/BlockButton";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Select from "@/components/ui/Select";
import { PRESET_PING_MESSAGES } from "@/constants/safety";
import { getCountryName } from "@/constants/countries";
import { formatDateTime, formatDuration, getInitials } from "@/lib/utils";

type HistoryCardProps = {
  historyId: number;
  otherUserId: string;
  sessionId: string;
  displayName: string | null;
  country: string | null;
  language: string | null;
  avatarUrl: string | null;
  durationSeconds: number;
  createdAt: string;
  onHidden: (historyId: number) => void;
};

export default function HistoryCard({
  historyId,
  otherUserId,
  sessionId,
  displayName,
  country,
  language,
  avatarUrl,
  durationSeconds,
  createdAt,
  onHidden,
}: HistoryCardProps) {
  const [presetMessage, setPresetMessage] = useState(PRESET_PING_MESSAGES[0]);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  async function sendPing() {
    try {
      setBusy(true);
      setError("");
      setStatus("");

      const response = await fetch("/api/ping", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          receiverId: otherUserId,
          sessionId,
          presetMessage,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Unable to send ping.");
      }

      setStatus("Ping sent.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to send ping.");
    } finally {
      setBusy(false);
    }
  }

  async function hideHistory() {
    try {
      setBusy(true);
      setError("");

      const response = await fetch("/api/history/hide", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          historyId,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Unable to hide history item.");
      }

      onHidden(historyId);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to hide history item.",
      );
      setBusy(false);
    }
  }

  return (
    <Card className="p-5">
      <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt=""
              className="h-14 w-14 rounded-2xl object-cover"
            />
          ) : (
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-400 text-xl font-black text-slate-950">
              {getInitials(displayName)}
            </div>
          )}

          <div>
            <h2 className="text-lg font-black">
              {displayName || "Matched User"}
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              {country ? getCountryName(country) : "Unknown country"}
              {language ? ` • ${language.toUpperCase()}` : ""}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {formatDuration(durationSeconds)} • {formatDateTime(createdAt)}
            </p>
          </div>
        </div>

        <div className="flex min-w-72 flex-col gap-3">
          <Select
            value={presetMessage}
            onChange={(event) => setPresetMessage(event.target.value)}
            options={PRESET_PING_MESSAGES.map((message) => ({
              label: message,
              value: message,
            }))}
          />

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="secondary"
              disabled={busy}
              onClick={sendPing}
            >
              {busy ? "Please wait..." : "Ping"}
            </Button>

            <Button
              type="button"
              variant="secondary"
              disabled={busy}
              onClick={hideHistory}
            >
              Hide
            </Button>

            <BlockButton
              blockedUserId={otherUserId}
              reason="Blocked from history"
              onBlocked={() => onHidden(historyId)}
            />
          </div>
        </div>
      </div>

      {status ? <p className="mt-4 text-sm text-emerald-300">{status}</p> : null}
      {error ? <p className="mt-4 text-sm text-red-400">{error}</p> : null}
    </Card>
  );
}