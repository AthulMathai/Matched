"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import Select from "@/components/ui/Select";
import { REPORT_REASONS, SAFETY_LIMITS } from "@/constants/safety";

type ReportModalProps = {
  open: boolean;
  sessionId: string;
  reportedUserId: string;
  onClose: () => void;
  onReported: () => void;
};

export default function ReportModal({
  open,
  sessionId,
  reportedUserId,
  onClose,
  onReported,
}: ReportModalProps) {
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submitReport() {
    if (!reason) {
      setError("Please select a report reason.");
      return;
    }

    try {
      setBusy(true);
      setError("");

      const response = await fetch("/api/report", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          reportedUserId,
          sessionId,
          reason,
          notes,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Unable to submit report.");
      }

      onReported();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to submit report.");
      setBusy(false);
    }
  }

  return (
    <Modal
      open={open}
      title="Report user"
      onClose={busy ? () => {} : onClose}
      footer={
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
          <Button type="button" variant="secondary" disabled={busy} onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" variant="danger" disabled={busy} onClick={submitReport}>
            {busy ? "Submitting..." : "Submit Report"}
          </Button>
        </div>
      }
    >
      <div className="space-y-5">
        <Select
          label="Reason"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          options={REPORT_REASONS.map((item) => ({
            label: item,
            value: item,
          }))}
        />

        <label className="block">
          <span className="mb-2 block text-sm font-bold text-slate-300">
            Notes optional
          </span>
          <textarea
            className="input min-h-32 resize-none"
            value={notes}
            maxLength={SAFETY_LIMITS.maxReportNotesLength}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Add details for moderation review."
          />
          <span className="mt-2 block text-xs text-slate-500">
            {notes.length}/{SAFETY_LIMITS.maxReportNotesLength}
          </span>
        </label>

        {error ? (
          <div className="rounded-2xl border border-red-400/30 bg-red-500/10 p-4 text-sm text-red-200">
            {error}
          </div>
        ) : null}
      </div>
    </Modal>
  );
}