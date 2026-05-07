"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";

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

export default function MatchQueue() {
  const router = useRouter();

  const stoppedRef = useRef(false);
  const pollingRef = useRef(false);

  const [status, setStatus] = useState("Preparing matching queue...");
  const [error, setError] = useState("");
  const [isStopping, setIsStopping] = useState(false);

  useEffect(() => {
    stoppedRef.current = false;

    async function pollForMatch() {
      if (stoppedRef.current || pollingRef.current) return;

      pollingRef.current = true;

      try {
        setError("");

        const response = await fetch("/api/match", {
          method: "POST",
        });

        const result = (await response.json()) as MatchResponse;

        if (!response.ok || result.status === "error") {
          throw new Error(
            result.status === "error"
              ? result.message
              : "Unable to enter queue.",
          );
        }

        if (result.status === "matched" && result.sessionId) {
          setStatus("Match found. Opening chat...");
          stoppedRef.current = true;
          router.replace(`/chat/${result.sessionId}`);
          return;
        }

        setStatus("Searching for the best available match...");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Matching failed.");
      } finally {
        pollingRef.current = false;
      }

      if (!stoppedRef.current) {
        window.setTimeout(pollForMatch, 700);
      }
    }

    pollForMatch();

    return () => {
      stoppedRef.current = true;

      fetch("/api/match", {
        method: "DELETE",
      }).catch(() => {});
    };
  }, [router]);

  async function stopFindingMatch() {
    try {
      setIsStopping(true);
      stoppedRef.current = true;

      await fetch("/api/match", {
        method: "DELETE",
      });

      router.replace("/");
    } catch {
      setError("Unable to stop matching.");
      setIsStopping(false);
    }
  }

  return (
    <Card className="w-full max-w-2xl p-6 text-center md:p-8">
      <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full border border-cyan-400/40 bg-cyan-400/10">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-cyan-300 border-t-transparent" />
      </div>

      <h1 className="text-3xl font-black">Finding your match</h1>

      <p className="mt-3 text-sm leading-6 text-slate-500 dark:text-slate-400">
        {status}
      </p>

      {error ? (
        <div className="mt-5 rounded-2xl border border-red-400/30 bg-red-500/10 p-4 text-sm text-red-700 dark:text-red-200">
          {error}
        </div>
      ) : null}

      <div className="mt-8 flex justify-center">
        <Button
          type="button"
          variant="danger"
          onClick={stopFindingMatch}
          disabled={isStopping}
        >
          {isStopping ? "Stopping..." : "Stop Finding Match"}
        </Button>
      </div>
    </Card>
  );
}