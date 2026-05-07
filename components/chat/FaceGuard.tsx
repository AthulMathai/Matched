"use client";

import { useEffect, useRef, type RefObject } from "react";
import { SAFETY_LIMITS } from "@/constants/safety";

declare global {
  interface Window {
    FaceDetector?: new (options?: {
      fastMode?: boolean;
      maxDetectedFaces?: number;
    }) => {
      detect: (image: CanvasImageSource) => Promise<unknown[]>;
    };
  }
}

type FaceGuardProps = {
  sessionId: string;
  videoRef: RefObject<HTMLVideoElement | null>;
  onFaceMissing: () => void;
  onFaceVisible: () => void;
};

export default function FaceGuard({
  sessionId,
  videoRef,
  onFaceMissing,
  onFaceVisible,
}: FaceGuardProps) {
  const missingSecondsRef = useRef(0);
  const pausedRef = useRef(false);
  const endedRef = useRef(false);

  useEffect(() => {
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d", {
      willReadFrequently: true,
    });

    if (!context) return;

    const detector = window.FaceDetector
      ? new window.FaceDetector({
          fastMode: true,
          maxDetectedFaces: 1,
        })
      : null;

    async function endForFaceMissing() {
      if (endedRef.current) return;

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

      window.location.href = "/match";
    }

    function registerMissing() {
      missingSecondsRef.current += 1;

      if (
        missingSecondsRef.current >= SAFETY_LIMITS.faceMissingPauseSeconds &&
        !pausedRef.current
      ) {
        pausedRef.current = true;
        onFaceMissing();
      }

      if (
        missingSecondsRef.current >=
        SAFETY_LIMITS.faceMissingDisconnectSeconds
      ) {
        endForFaceMissing();
      }
    }

    function registerVisible() {
      missingSecondsRef.current = 0;

      if (pausedRef.current) {
        pausedRef.current = false;
        onFaceVisible();
      }
    }

    const interval = window.setInterval(async () => {
      const video = videoRef.current;

      if (!video || video.readyState < 2 || video.videoWidth === 0) {
        registerMissing();
        return;
      }

      canvas.width = 240;
      canvas.height = 135;

      context.drawImage(video, 0, 0, canvas.width, canvas.height);

      try {
        if (detector) {
          const faces = await detector.detect(canvas);

          if (faces.length > 0) {
            registerVisible();
          } else {
            registerMissing();
          }

          return;
        }

        const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
        const clearEnough = isFrameClearEnough(imageData.data);

        if (clearEnough) {
          registerVisible();
        } else {
          registerMissing();
        }
      } catch {
        const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
        const clearEnough = isFrameClearEnough(imageData.data);

        if (clearEnough) {
          registerVisible();
        } else {
          registerMissing();
        }
      }
    }, 1000);

    return () => {
      window.clearInterval(interval);
    };
  }, [sessionId, onFaceMissing, onFaceVisible, videoRef]);

  return null;
}

function isFrameClearEnough(data: Uint8ClampedArray) {
  let brightnessTotal = 0;
  let brightnessSquaredTotal = 0;
  let sampleCount = 0;

  for (let i = 0; i < data.length; i += 4 * 20) {
    const r = data[i] || 0;
    const g = data[i + 1] || 0;
    const b = data[i + 2] || 0;

    const brightness = (r + g + b) / 3;

    brightnessTotal += brightness;
    brightnessSquaredTotal += brightness * brightness;
    sampleCount += 1;
  }

  const averageBrightness = brightnessTotal / Math.max(sampleCount, 1);
  const variance =
    brightnessSquaredTotal / Math.max(sampleCount, 1) -
    averageBrightness * averageBrightness;

  const contrastScore = Math.sqrt(Math.max(variance, 0));

  return averageBrightness > 35 && contrastScore > 12;
}