"use client";

import { useEffect, useRef, useState } from "react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";

type AdGateProps = {
  onComplete: () => void;
};

type CreateAdResponse = {
  status: string;
  impression?: {
    id: string;
  };
  message?: string;
};

const AD_SECONDS = 30;

export default function AdGate({ onComplete }: AdGateProps) {
  const [secondsLeft, setSecondsLeft] = useState(AD_SECONDS);
  const [impressionId, setImpressionId] = useState("");
  const [error, setError] = useState("");
  const [completed, setCompleted] = useState(false);
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;

    startedRef.current = true;

    async function createImpression() {
      try {
        const response = await fetch("/api/ads/impression", {
          method: "POST",
        });

        const result = (await response.json()) as CreateAdResponse;

        if (!response.ok || !result.impression?.id) {
          throw new Error(result.message || "Unable to start ad.");
        }

        setImpressionId(result.impression.id);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to start ad.");
      }
    }

    createImpression();
  }, []);

  useEffect(() => {
    if (!impressionId || completed) return;

    const timer = window.setInterval(() => {
      setSecondsLeft((current) => {
        if (current <= 1) {
          window.clearInterval(timer);
          completeAd();
          return 0;
        }

        return current - 1;
      });
    }, 1000);

    async function completeAd() {
      try {
        const response = await fetch("/api/ads/impression", {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            impressionId,
            watchedSeconds: AD_SECONDS,
          }),
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.message || "Unable to complete ad.");
        }

        setCompleted(true);
        onComplete();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to complete ad.");
      }
    }

    return () => {
      window.clearInterval(timer);
    };
  }, [completed, impressionId, onComplete]);

  return (
    <Card className="w-full max-w-2xl p-6 md:p-8">
      <div className="mb-6">
        <p className="badge mb-4">Sponsored</p>
        <h1 className="text-3xl font-black">Your match starts soon</h1>
        <p className="mt-2 text-sm leading-6 text-slate-400">
          Watch this short sponsor screen before entering the matching queue.
        </p>
      </div>

      <div className="mb-6 flex aspect-video items-center justify-center rounded-3xl border border-slate-700/70 bg-slate-950/70">
        <div className="text-center">
          <p className="text-sm font-bold text-slate-400">Ad placeholder</p>
          <p className="mt-3 text-6xl font-black text-cyan-300">
            {secondsLeft}
          </p>
          <p className="mt-2 text-sm text-slate-500">seconds remaining</p>
        </div>
      </div>

      {error ? (
        <div className="mb-5 rounded-2xl border border-red-400/30 bg-red-500/10 p-4 text-sm text-red-200">
          {error}
        </div>
      ) : null}

      <Button disabled fullWidth>
        {secondsLeft > 0 ? `Continue in ${secondsLeft}s` : "Starting..."}
      </Button>
    </Card>
  );
}