"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type MatchQueueStatus = "idle" | "searching" | "matched" | "cancelled" | "error";

type MatchResponse =
  | {
      status: "matched";
      sessionId: string;
    }
  | {
      status: "waiting";
      sessionId: null;
    }
  | {
      status: "error";
      message: string;
    };

export function useMatchQueue() {
  const router = useRouter();

  const stoppedRef = useRef(false);
  const [status, setStatus] = useState<MatchQueueStatus>("idle");
  const [message, setMessage] = useState("Ready to match.");
  const [error, setError] = useState("");

  const stopQueue = useCallback(async () => {
    stoppedRef.current = true;
    setStatus("cancelled");
    setMessage("Matching cancelled.");

    await fetch("/api/match", {
      method: "DELETE",
    }).catch(() => {});
  }, []);

  const startQueue = useCallback(async () => {
    stoppedRef.current = false;
    setStatus("searching");
    setMessage("Searching for the best available match...");
    setError("");

    async function poll() {
      if (stoppedRef.current) return;

      try {
        const response = await fetch("/api/match", {
          method: "POST",
        });

        const result = (await response.json()) as MatchResponse;

        if (!response.ok || result.status === "error") {
          throw new Error(
            result.status === "error"
              ? result.message
              : "Unable to enter matching queue.",
          );
        }

        if (result.status === "matched" && result.sessionId) {
          setStatus("matched");
          setMessage("Match found. Opening chat...");
          router.push(`/chat/${result.sessionId}`);
          return;
        }

        setMessage("Still searching...");
        window.setTimeout(poll, 3000);
      } catch (err) {
        setStatus("error");
        setError(
          err instanceof Error ? err.message : "Matching queue failed.",
        );
      }
    }

    poll();
  }, [router]);

  useEffect(() => {
    return () => {
      stoppedRef.current = true;

      fetch("/api/match", {
        method: "DELETE",
      }).catch(() => {});
    };
  }, []);

  return {
    status,
    message,
    error,
    startQueue,
    stopQueue,
  };
}