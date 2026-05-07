export const WEBRTC_CONFIG: RTCConfiguration = {
  iceServers: [
    {
      urls: "stun:stun.l.google.com:19302",
    },
    {
      urls: "stun:stun1.l.google.com:19302",
    },
    {
      urls: "stun:stun2.l.google.com:19302",
    },
  ],
  iceCandidatePoolSize: 10,
};

export type WebRTCSignalType = "offer" | "answer" | "ice";

export type WebRTCSignalPayload = {
  sdp?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
};

export function createPeerConnection() {
  return new RTCPeerConnection(WEBRTC_CONFIG);
}

export async function improveVideoSenderQuality(pc: RTCPeerConnection) {
  const senders = pc.getSenders();

  for (const sender of senders) {
    if (sender.track?.kind !== "video") continue;

    const params = sender.getParameters();

    params.encodings = [
      {
        maxBitrate: 4_000_000,
        maxFramerate: 30,
        scaleResolutionDownBy: 1,
      },
    ];

    try {
      await sender.setParameters(params);
    } catch {
      // Some browsers may reject bitrate tuning. Safe to ignore.
    }
  }
}