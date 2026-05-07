"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export function useCamera() {
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState("");

  const startCamera = useCallback(async () => {
    try {
      setCameraError("");

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: {
            ideal: 1280,
          },
          height: {
            ideal: 720,
          },
          facingMode: "user",
        },
        audio: true,
      });

      streamRef.current = stream;
      setCameraReady(true);
      setCameraEnabled(true);

      return stream;
    } catch {
      setCameraError("Camera and microphone permission is required.");
      setCameraReady(false);
      return null;
    }
  }, []);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => {
      track.stop();
    });

    streamRef.current = null;
    setCameraReady(false);
    setCameraEnabled(false);
  }, []);

  const toggleCamera = useCallback(() => {
    const stream = streamRef.current;
    if (!stream) return;

    const nextEnabled = !cameraEnabled;

    stream.getVideoTracks().forEach((track) => {
      track.enabled = nextEnabled;
    });

    setCameraEnabled(nextEnabled);
  }, [cameraEnabled]);

  const setCameraTrackEnabled = useCallback((enabled: boolean) => {
    const stream = streamRef.current;
    if (!stream) return;

    stream.getVideoTracks().forEach((track) => {
      track.enabled = enabled;
    });

    setCameraEnabled(enabled);
  }, []);

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((track) => {
        track.stop();
      });
    };
  }, []);

  return {
    streamRef,
    cameraEnabled,
    cameraReady,
    cameraError,
    startCamera,
    stopCamera,
    toggleCamera,
    setCameraTrackEnabled,
  };
}