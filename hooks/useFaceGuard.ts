"use client";

import { useCallback, useRef, useState } from "react";
import { SAFETY_LIMITS } from "@/constants/safety";

export function useFaceGuard(sessionId: string) {
  const missingSecondsRef = useRef(0);
  const endedRef = useRef(false);
  const [faceBlocked, setFaceBlocked] = useState(false);

  const resetFaceTimer = useCallback(() => {
    missingSecondsRef.current = 0;

    if (faceBlocked) {
      setFaceBlocked(false);
    }
  }, [faceBlocked]);

  const registerMissingFaceSecond = useCallback(
    async ({
      onPause,
      onDisconnect,
    }: {
      onPause?: () => void;
      onDisconnect?: () => void;
    } = {}) => {
      missingSecondsRef.current += 1;

      if (
        missingSecondsRef.current >= SAFETY_LIMITS.faceMissingPauseSeconds &&
        !faceBlocked
      ) {
        setFaceBlocked(true);
        onPause?.();
      }

      if (
        missingSecondsRef.current >=
          SAFETY_LIMITS.faceMissingDisconnectSeconds &&
        !endedRef.current
      ) {
        endedRef.current = true;

        await fetch("/api/sessions/end", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            sessionId,
            reason: "face_not_visible",
          }),
        }).catch(() => {});

        onDisconnect?.();
      }
    },
    [faceBlocked, sessionId],
  );

  return {
    faceBlocked,
    resetFaceTimer,
    registerMissingFaceSecond,
  };
}