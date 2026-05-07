"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";

type BlockButtonProps = {
  blockedUserId: string;
  reason?: string;
  onBlocked?: () => void;
};

export default function BlockButton({
  blockedUserId,
  reason = "Blocked by user",
  onBlocked,
}: BlockButtonProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function blockUser() {
    const confirmBlock = window.confirm(
      "Block this user? You will not be matched with them again.",
    );

    if (!confirmBlock) return;

    try {
      setBusy(true);
      setError("");

      const response = await fetch("/api/block", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          blockedUserId,
          reason,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Unable to block user.");
      }

      onBlocked?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to block user.");
      setBusy(false);
    }
  }

  return (
    <div>
      <Button type="button" variant="danger" disabled={busy} onClick={blockUser}>
        {busy ? "Blocking..." : "Block"}
      </Button>

      {error ? <p className="mt-2 text-sm text-red-400">{error}</p> : null}
    </div>
  );
}