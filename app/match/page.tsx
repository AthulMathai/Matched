"use client";

import CameraMatchLobby from "@/components/match/CameraMatchLobby";

export default function MatchPage() {
  return (
    <main className="h-[calc(100dvh-67px)] overflow-hidden px-0 py-0 md:h-[calc(100dvh-78px)] md:px-5 md:py-4">
      <CameraMatchLobby />
    </main>
  );
}