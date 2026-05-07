"use client";

let sharedStream: MediaStream | null = null;

export async function getSharedMediaStream(): Promise<MediaStream> {
  const hasLiveTracks =
    sharedStream?.getTracks().some((track) => track.readyState === "live") ||
    false;

  if (sharedStream && hasLiveTracks) {
    return sharedStream;
  }

  sharedStream = await navigator.mediaDevices.getUserMedia({
    video: {
      width: { ideal: 1920, min: 1280 },
      height: { ideal: 1080, min: 720 },
      frameRate: { ideal: 30, max: 60 },
      facingMode: "user",
    },
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    },
  });

  return sharedStream;
}

export function stopSharedMediaStream() {
  if (!sharedStream) return;

  sharedStream.getTracks().forEach((track) => {
    track.stop();
  });

  sharedStream = null;
}

export function setSharedCameraEnabled(enabled: boolean) {
  if (!sharedStream) return;

  sharedStream.getVideoTracks().forEach((track) => {
    track.enabled = enabled;
  });
}

export function setSharedMicEnabled(enabled: boolean) {
  if (!sharedStream) return;

  sharedStream.getAudioTracks().forEach((track) => {
    track.enabled = enabled;
  });
}

export function getCurrentSharedStream() {
  return sharedStream;
}