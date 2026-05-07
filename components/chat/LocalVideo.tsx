"use client";

import type { RefObject } from "react";

type LocalVideoProps = {
  videoRef: RefObject<HTMLVideoElement | null>;
  cameraEnabled: boolean;
};

export default function LocalVideo({
  videoRef,
  cameraEnabled,
}: LocalVideoProps) {
  return (
    <div className="relative aspect-video bg-black">
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        className="h-full w-full object-cover"
      />

      {!cameraEnabled ? (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-950/90 text-sm font-bold text-slate-300">
          Camera off
        </div>
      ) : null}

      <div className="absolute bottom-3 left-3 rounded-full bg-black/60 px-3 py-1 text-xs font-bold text-white">
        You
      </div>
    </div>
  );
}