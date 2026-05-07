"use client";

import type { RefObject } from "react";

type RemoteVideoProps = {
  videoRef: RefObject<HTMLVideoElement | null>;
  connected?: boolean;
};

export default function RemoteVideo({
  videoRef,
  connected = false,
}: RemoteVideoProps) {
  return (
    <div className="relative aspect-video bg-black">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        className="h-full w-full object-cover"
      />

      {!connected ? (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-950/80 text-center">
          <div>
            <p className="text-lg font-black">WebRTC placeholder</p>
            <p className="mt-2 max-w-sm text-sm leading-6 text-slate-400">
              Local camera works now. Add LiveKit, Daily, or WebRTC signaling
              here for real remote video.
            </p>
          </div>
        </div>
      ) : null}

      <div className="absolute bottom-3 left-3 rounded-full bg-black/60 px-3 py-1 text-xs font-bold text-white">
        Other person
      </div>
    </div>
  );
}