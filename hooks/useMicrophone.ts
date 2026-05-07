"use client";

import { useCallback, useState } from "react";

export function useMicrophone(streamRef: React.RefObject<MediaStream | null>) {
  const [micEnabled, setMicEnabled] = useState(true);

  const toggleMic = useCallback(() => {
    const stream = streamRef.current;
    if (!stream) return;

    const nextEnabled = !micEnabled;

    stream.getAudioTracks().forEach((track) => {
      track.enabled = nextEnabled;
    });

    setMicEnabled(nextEnabled);
  }, [micEnabled, streamRef]);

  const setMicTrackEnabled = useCallback(
    (enabled: boolean) => {
      const stream = streamRef.current;
      if (!stream) return;

      stream.getAudioTracks().forEach((track) => {
        track.enabled = enabled;
      });

      setMicEnabled(enabled);
    },
    [streamRef],
  );

  return {
    micEnabled,
    toggleMic,
    setMicTrackEnabled,
  };
}