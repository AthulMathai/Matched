"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";

export function useVideoSession(sessionId: string) {
  const router = useRouter();

  const [ending, setEnding] = useState(false);
  const [error, setError] = useState("");

  const endSession = useCallback(
    async (reason = "ended", redirectTo = "/match") => {
      try {
        setEnding(true);
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

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.message || "Unable to end session.");
        }

        router.push(redirectTo);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to end session.");
        setEnding(false);
      }
    },
    [router, sessionId],
  );

  return {
    ending,
    error,
    endSession,
  };
}