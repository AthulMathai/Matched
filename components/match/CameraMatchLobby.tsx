"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import CountryBadge from "@/components/ui/CountryBadge";
import PartyInviteModal from "@/components/party/PartyInviteModal";
import { createClient } from "@/lib/supabase/client";
import {
  getSharedMediaStream,
  setSharedCameraEnabled,
  setSharedMicEnabled,
} from "@/lib/sharedMedia";

type MatchResponse =
  | {
      status: "matched";
      sessionId: string;
      message?: string;
    }
  | {
      status: "waiting";
      sessionId: null;
      message?: string;
    }
  | {
      status: "error";
      sessionId?: null;
      message: string;
    };

type PartyRoom = {
  id: string;
  host_user_id: string;
  status: "open" | "matching" | "matched" | "closed";
  created_at: string;
  updated_at?: string;
};

type PartyMember = {
  id: string;
  party_id: string;
  user_id: string;
  role: "host" | "member";
  status: string;
  joined_at: string;
  profile?: {
    id: string;
    country: string | null;
    language: string | null;
  } | null;
};

type SignalRow = {
  id: string;
  party_id: string;
  sender_id: string;
  receiver_id: string;
  type: "offer" | "answer" | "ice";
  payload: any;
  created_at?: string;
};

const rtcConfig: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

function StreamVideo({
  stream,
  muted,
  className,
}: {
  stream: MediaStream | null;
  muted: boolean;
  className: string;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !stream) return;

    if (video.srcObject !== stream) {
      video.srcObject = stream;
    }

    video.muted = muted;
    video.playsInline = true;
    video.autoplay = true;

    const playPromise = video.play();
    if (playPromise) {
      playPromise.catch(() => {});
    }
  }, [stream, muted]);

  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      muted={muted}
      className={className}
    />
  );
}

function TeamVideoTile({
  label,
  country,
  stream,
  muted,
  cameraEnabled = true,
}: {
  label: string;
  country: string;
  stream: MediaStream | null;
  muted: boolean;
  cameraEnabled?: boolean;
}) {
  return (
    <div className="relative min-h-0 overflow-hidden rounded-2xl bg-black">
      {stream ? (
        <StreamVideo
          stream={stream}
          muted={muted}
          className="h-full w-full object-contain"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-slate-950">
          <div className="text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-cyan-400 text-xl font-black text-slate-950">
              M
            </div>
            <p className="mt-3 text-sm font-black text-white">Connecting</p>
          </div>
        </div>
      )}

      {!cameraEnabled ? (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-950 text-sm font-black text-white">
          Camera off
        </div>
      ) : null}

      <div className="absolute left-3 top-3 rounded-full bg-black/65 px-3 py-1 text-xs font-black text-white backdrop-blur-md">
        {label} <CountryBadge country={country} showName={false} />
      </div>
    </div>
  );
}

export default function CameraMatchLobby() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const mountedRef = useRef(false);
  const pollingRef = useRef(false);
  const stoppedRef = useRef(true);
  const pollRunIdRef = useRef(0);
  const timeoutRef = useRef<number | null>(null);
  const autoStartConsumedRef = useRef(false);

  const partyRoomRef = useRef<PartyRoom | null>(null);
  const partyMembersRef = useRef<PartyMember[]>([]);
  const currentUserIdRef = useRef("");
  const localStreamRef = useRef<MediaStream | null>(null);

  const peersRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const sentOffersRef = useRef<Set<string>>(new Set());
  const processedSignalsRef = useRef<Set<string>>(new Set());
  const pendingIceRef = useRef<Map<string, RTCIceCandidateInit[]>>(new Map());
  const remoteStreamRefs = useRef<Map<string, MediaStream>>(new Map());
  const lastOfferAtRef = useRef<Map<string, number>>(new Map());
  const signalStartedAtRef = useRef(new Date().toISOString());

  const [currentUserId, setCurrentUserId] = useState("");
  const [country, setCountry] = useState("");
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<
    Record<string, MediaStream>
  >({});

  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [micEnabled, setMicEnabled] = useState(true);

  const [partyRoom, setPartyRoom] = useState<PartyRoom | null>(null);
  const [partyMembers, setPartyMembers] = useState<PartyMember[]>([]);

  const [isFinding, setIsFinding] = useState(false);
  const [status, setStatus] = useState("Matching stopped.");
  const [error, setError] = useState("");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [leavingTeam, setLeavingTeam] = useState(false);

  const realTeamMemberCount = partyMembers.length;
  const isRealTeam = Boolean(partyRoom && realTeamMemberCount > 1);

  const rawIsHost = Boolean(
    partyRoom && currentUserId && partyRoom.host_user_id === currentUserId,
  );

  const isHost = !isRealTeam || rawIsHost;
  const teamCount = isRealTeam ? realTeamMemberCount : 1;

  useEffect(() => {
    partyRoomRef.current = partyRoom;
  }, [partyRoom]);

  useEffect(() => {
    partyMembersRef.current = partyMembers;
  }, [partyMembers]);

  useEffect(() => {
    currentUserIdRef.current = currentUserId;
  }, [currentUserId]);

  useEffect(() => {
    localStreamRef.current = localStream;
  }, [localStream]);

  function clearPollTimeout() {
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }

  function isCurrentRun(runId: number) {
    return (
      mountedRef.current &&
      !stoppedRef.current &&
      pollRunIdRef.current === runId
    );
  }

  function leaveQueue() {
    fetch("/api/match", { method: "DELETE" }).catch(() => {});
  }

  function resetTeamPeers() {
    for (const pc of peersRef.current.values()) {
      pc.close();
    }

    peersRef.current.clear();
    sentOffersRef.current.clear();
    processedSignalsRef.current.clear();
    pendingIceRef.current.clear();
    remoteStreamRefs.current.clear();
    lastOfferAtRef.current.clear();
    setRemoteStreams({});
  }

  function removePeer(userId: string) {
    const pc = peersRef.current.get(userId);

    if (pc) {
      pc.close();
    }

    peersRef.current.delete(userId);
    sentOffersRef.current.delete(userId);
    pendingIceRef.current.delete(userId);
    remoteStreamRefs.current.delete(userId);
    lastOfferAtRef.current.delete(userId);

    setRemoteStreams((current) => {
      if (!current[userId]) return current;

      const copy = { ...current };
      delete copy[userId];
      return copy;
    });
  }

  async function loadUser() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    setCurrentUserId(user.id);
    currentUserIdRef.current = user.id;

    const { data } = await supabase
      .from("profiles")
      .select("country")
      .eq("id", user.id)
      .maybeSingle();

    setCountry(data?.country || "");
  }

  async function setupCamera() {
    try {
      const stream = await getSharedMediaStream();

      setSharedCameraEnabled(true);
      setSharedMicEnabled(true);

      stream.getVideoTracks().forEach((track) => {
        track.enabled = true;
      });

      stream.getAudioTracks().forEach((track) => {
        track.enabled = true;
      });

      setLocalStream(stream);
      localStreamRef.current = stream;
      setCameraEnabled(true);
      setMicEnabled(true);
    } catch {
      setError("Camera and microphone permission is required.");
    }
  }

  function sameMemberList(a: PartyMember[], b: PartyMember[]) {
    const aIds = a.map((item) => `${item.user_id}:${item.role}`).sort();
    const bIds = b.map((item) => `${item.user_id}:${item.role}`).sort();

    return JSON.stringify(aIds) === JSON.stringify(bIds);
  }

  async function loadPartyStatus() {
    const response = await fetch("/api/party/status", {
      cache: "no-store",
    });

    const result = await response.json().catch(() => ({}));

    if (result.error) {
      setError(result.error);
    }

    const nextRoom = result.room || null;
    const nextMembers = Array.isArray(result.members) ? result.members : [];

    if (!nextRoom) {
      if (partyRoomRef.current) {
        resetTeamPeers();
      }

      setPartyRoom(null);
      partyRoomRef.current = null;
      setPartyMembers([]);
      partyMembersRef.current = [];

      return;
    }

    if (nextMembers.length <= 1 && !result.pendingInvites?.length) {
      if (partyRoomRef.current) {
        resetTeamPeers();
      }

      setPartyRoom(null);
      partyRoomRef.current = null;
      setPartyMembers([]);
      partyMembersRef.current = [];

      return;
    }

    const previousRoomId = partyRoomRef.current?.id || "";

    if (previousRoomId !== nextRoom.id) {
      signalStartedAtRef.current = new Date().toISOString();
      resetTeamPeers();
      processedSignalsRef.current.clear();
    }

    setPartyRoom(nextRoom);
    partyRoomRef.current = nextRoom;

    if (!sameMemberList(partyMembersRef.current, nextMembers)) {
      setPartyMembers(nextMembers);
      partyMembersRef.current = nextMembers;
    }
  }

  async function sendSignal({
    receiverId,
    type,
    payload,
  }: {
    receiverId: string;
    type: "offer" | "answer" | "ice";
    payload: any;
  }) {
    const room = partyRoomRef.current;
    const senderId = currentUserIdRef.current;

    if (!room?.id || !senderId || !receiverId) return;

    const { error } = await supabase.from("party_webrtc_signals").insert({
      party_id: room.id,
      sender_id: senderId,
      receiver_id: receiverId,
      type,
      payload,
    });

    if (error) {
      console.error("PARTY_WEBRTC_SIGNAL_INSERT_ERROR:", error.message);
      setError(`Signal error: ${error.message}`);
    }
  }

  async function flushPendingIce(otherUserId: string, pc: RTCPeerConnection) {
    const pending = pendingIceRef.current.get(otherUserId) || [];

    if (!pc.remoteDescription) return;

    for (const candidate of pending) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch {
        // Ignore stale candidates.
      }
    }

    pendingIceRef.current.delete(otherUserId);
  }

  const createPeer = useCallback(async (otherUserId: string) => {
    const room = partyRoomRef.current;
    const userId = currentUserIdRef.current;
    const stream = localStreamRef.current;

    if (!room?.id || !userId || !stream) return null;

    const existing = peersRef.current.get(otherUserId);

    if (
      existing &&
      existing.connectionState !== "closed" &&
      existing.connectionState !== "failed"
    ) {
      return existing;
    }

    const pc = new RTCPeerConnection(rtcConfig);

    stream.getTracks().forEach((track) => {
      pc.addTrack(track, stream);
    });

    pc.onicecandidate = async (event) => {
      if (!event.candidate) return;

      await sendSignal({
        receiverId: otherUserId,
        type: "ice",
        payload: event.candidate.toJSON(),
      });
    };

    pc.ontrack = (event) => {
      let remoteStream = event.streams?.[0];

      if (!remoteStream) {
        remoteStream =
          remoteStreamRefs.current.get(otherUserId) || new MediaStream();
        remoteStream.addTrack(event.track);
      }

      remoteStreamRefs.current.set(otherUserId, remoteStream);

      setRemoteStreams((current) => {
        if (current[otherUserId] === remoteStream) return current;

        return {
          ...current,
          [otherUserId]: remoteStream,
        };
      });
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "failed" || pc.connectionState === "closed") {
        peersRef.current.delete(otherUserId);
        sentOffersRef.current.delete(otherUserId);
        lastOfferAtRef.current.delete(otherUserId);
      }
    };

    pc.oniceconnectionstatechange = () => {
      if (pc.iceConnectionState === "failed") {
        peersRef.current.delete(otherUserId);
        sentOffersRef.current.delete(otherUserId);
        lastOfferAtRef.current.delete(otherUserId);
      }
    };

    peersRef.current.set(otherUserId, pc);
    return pc;
  }, []);

  async function handleSignal(signal: SignalRow) {
    const room = partyRoomRef.current;
    const userId = currentUserIdRef.current;

    if (!room?.id || !userId) return;
    if (signal.party_id !== room.id) return;
    if (signal.receiver_id !== userId) return;
    if (processedSignalsRef.current.has(signal.id)) return;

    processedSignalsRef.current.add(signal.id);

    const otherUserId = signal.sender_id;
    const pc = await createPeer(otherUserId);

    if (!pc) return;

    try {
      if (signal.type === "offer") {
        if (pc.signalingState !== "stable") {
          try {
            await pc.setLocalDescription({
              type: "rollback",
            } as RTCSessionDescriptionInit);
          } catch {
            // Ignore unsupported rollback.
          }
        }

        await pc.setRemoteDescription(
          new RTCSessionDescription({
            type: signal.payload.type,
            sdp: signal.payload.sdp,
          }),
        );

        await flushPendingIce(otherUserId, pc);

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        await sendSignal({
          receiverId: otherUserId,
          type: "answer",
          payload: {
            type: answer.type,
            sdp: answer.sdp,
          },
        });

        return;
      }

      if (signal.type === "answer") {
        if (pc.signalingState === "have-local-offer") {
          await pc.setRemoteDescription(
            new RTCSessionDescription({
              type: signal.payload.type,
              sdp: signal.payload.sdp,
            }),
          );

          await flushPendingIce(otherUserId, pc);
        }

        return;
      }

      if (signal.type === "ice") {
        if (!pc.remoteDescription) {
          const existing = pendingIceRef.current.get(otherUserId) || [];
          existing.push(signal.payload);
          pendingIceRef.current.set(otherUserId, existing);
          return;
        }

        await pc.addIceCandidate(new RTCIceCandidate(signal.payload));
      }
    } catch (error) {
      console.error("PARTY_WEBRTC_SIGNAL_HANDLE_ERROR:", error);
    }
  }

  async function loadExistingSignals() {
    const room = partyRoomRef.current;
    const userId = currentUserIdRef.current;

    if (!room?.id || !userId) return;

    const { data, error } = await supabase
      .from("party_webrtc_signals")
      .select("*")
      .eq("party_id", room.id)
      .eq("receiver_id", userId)
      .gte("created_at", signalStartedAtRef.current)
      .order("created_at", { ascending: true })
      .limit(500);

    if (error) {
      console.error("PARTY_WEBRTC_SIGNAL_LOAD_ERROR:", error.message);
      setError(`Signal load error: ${error.message}`);
      return;
    }

    for (const signal of (data || []) as SignalRow[]) {
      await handleSignal(signal);
    }
  }

  async function startOfferIfNeeded(otherUserId: string) {
    const room = partyRoomRef.current;
    const userId = currentUserIdRef.current;
    const stream = localStreamRef.current;

    if (!room?.id || !userId || !stream) return;
    if (remoteStreamRefs.current.has(otherUserId)) return;

    const isOfferCreator = userId < otherUserId;

    if (!isOfferCreator) {
      await loadExistingSignals();
      return;
    }

    const pc = await createPeer(otherUserId);

    if (!pc) return;

    const now = Date.now();
    const lastOfferAt = lastOfferAtRef.current.get(otherUserId) || 0;

    if (sentOffersRef.current.has(otherUserId) && now - lastOfferAt < 15000) {
      return;
    }

    if (pc.signalingState !== "stable") {
      return;
    }

    sentOffersRef.current.add(otherUserId);
    lastOfferAtRef.current.set(otherUserId, now);

    try {
      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true,
      });

      await pc.setLocalDescription(offer);

      await sendSignal({
        receiverId: otherUserId,
        type: "offer",
        payload: {
          type: offer.type,
          sdp: offer.sdp,
        },
      });
    } catch (error) {
      console.error("PARTY_WEBRTC_CREATE_OFFER_ERROR:", error);
      sentOffersRef.current.delete(otherUserId);
      lastOfferAtRef.current.delete(otherUserId);
    }
  }

  async function setTeamMatching(next: boolean) {
    const response = await fetch("/api/party/matching", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ isMatching: next }),
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok || !result.ok) {
      throw new Error(result.error || "Unable to update team matching.");
    }

    setPartyRoom(result.room || null);
    partyRoomRef.current = result.room || null;
  }

  async function pollForMatch(runId: number) {
    if (!isCurrentRun(runId) || pollingRef.current) return;

    if (!isHost) {
      setStatus("Waiting for team leader.");
      return;
    }

    pollingRef.current = true;

    try {
      const response = await fetch("/api/match", {
        method: "POST",
        cache: "no-store",
      });

      const result = (await response.json()) as MatchResponse;

      if (!isCurrentRun(runId)) return;

      if (!response.ok || result.status === "error") {
        throw new Error(
          result.status === "error"
            ? result.message
            : "Unable to enter match queue.",
        );
      }

      if (result.status === "matched" && result.sessionId) {
        stoppedRef.current = true;
        pollingRef.current = false;
        pollRunIdRef.current += 1;
        clearPollTimeout();

        setIsFinding(false);
        setStatus("Match found. Connecting...");
        router.replace(`/chat/${result.sessionId}`);
        return;
      }

      if (result.status === "waiting") {
        setStatus(result.message || "Looking for someone...");
      }
    } catch (err) {
      if (isCurrentRun(runId)) {
        setError(err instanceof Error ? err.message : "Matching failed.");
      }
    } finally {
      pollingRef.current = false;
    }

    if (isCurrentRun(runId)) {
      timeoutRef.current = window.setTimeout(() => {
        pollForMatch(runId);
      }, 500);
    }
  }

  async function startFinding() {
    setError("");
    clearPollTimeout();

    stoppedRef.current = false;
    pollingRef.current = false;
    pollRunIdRef.current += 1;

    const runId = pollRunIdRef.current;

    setIsFinding(true);
    setStatus("Looking for someone...");

    if (isRealTeam) {
      await setTeamMatching(true);
      await loadPartyStatus();
    }

    pollForMatch(runId);
  }

  async function stopFinding() {
    stoppedRef.current = true;
    pollingRef.current = false;
    pollRunIdRef.current += 1;
    clearPollTimeout();

    setIsFinding(false);
    setStatus("Matching stopped.");
    setError("");

    leaveQueue();

    if (isRealTeam && isHost) {
      await setTeamMatching(false);
      await loadPartyStatus();
    }
  }

  async function consumeAutoStartAfterSkip() {
    if (autoStartConsumedRef.current) return;
    if (!mountedRef.current) return;
    if (!currentUserIdRef.current) return;
    if (!localStreamRef.current) return;
    if (!isHost) return;

    const hasStorageFlag =
      typeof window !== "undefined" &&
      localStorage.getItem("matched:autoStart") === "1";

    const hasUrlFlag =
      typeof window !== "undefined" &&
      new URLSearchParams(window.location.search).get("autoStart") === "1";

    if (!hasStorageFlag && !hasUrlFlag) return;

    autoStartConsumedRef.current = true;
    localStorage.removeItem("matched:autoStart");

    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.delete("autoStart");
      window.history.replaceState({}, "", url.toString());
    }

    await startFinding();
  }

  async function leaveTeam() {
    if (!isRealTeam) return;

    const confirmed = window.confirm("Leave this team?");
    if (!confirmed) return;

    setLeavingTeam(true);
    setError("");

    stoppedRef.current = true;
    pollingRef.current = false;
    pollRunIdRef.current += 1;
    clearPollTimeout();
    leaveQueue();
    resetTeamPeers();

    const response = await fetch("/api/party/leave", {
      method: "POST",
    });

    const result = await response.json().catch(() => ({}));

    setLeavingTeam(false);

    if (!response.ok || !result.ok) {
      setError(result.error || "Unable to leave team.");
      return;
    }

    setPartyRoom(null);
    partyRoomRef.current = null;
    setPartyMembers([]);
    partyMembersRef.current = [];
    setIsFinding(false);
    setStatus("Matching stopped.");
    await loadPartyStatus();
  }

  function toggleCamera() {
    const next = !cameraEnabled;
    setSharedCameraEnabled(next);

    localStreamRef.current?.getVideoTracks().forEach((track) => {
      track.enabled = next;
    });

    setCameraEnabled(next);
  }

  function toggleMic() {
    const next = !micEnabled;
    setSharedMicEnabled(next);

    localStreamRef.current?.getAudioTracks().forEach((track) => {
      track.enabled = next;
    });

    setMicEnabled(next);
  }

  useEffect(() => {
    mountedRef.current = true;

    setupCamera();
    loadUser();
    loadPartyStatus();

    const partyTimer = window.setInterval(loadPartyStatus, 1500);

    stoppedRef.current = true;
    pollingRef.current = false;
    clearPollTimeout();
    leaveQueue();

    return () => {
      mountedRef.current = false;
      stoppedRef.current = true;
      pollingRef.current = false;
      pollRunIdRef.current += 1;
      clearPollTimeout();
      window.clearInterval(partyTimer);
      leaveQueue();
      resetTeamPeers();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!currentUserId || !localStream) return;

    const timer = window.setTimeout(() => {
      consumeAutoStartAfterSkip();
    }, 50);

    return () => {
      window.clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUserId, Boolean(localStream), isHost]);

  useEffect(() => {
    if (!isRealTeam || !partyRoom?.id || !currentUserId || !localStream) return;

    const channel = supabase
      .channel(`party-video-${partyRoom.id}-${currentUserId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "party_webrtc_signals",
        },
        (payload) => {
          const signal = payload.new as SignalRow;

          if (
            signal.party_id === partyRoom.id &&
            signal.receiver_id === currentUserId
          ) {
            handleSignal(signal);
          }
        },
      )
      .subscribe();

    loadExistingSignals();

    const signalPoller = window.setInterval(loadExistingSignals, 1500);

    return () => {
      window.clearInterval(signalPoller);
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRealTeam, partyRoom?.id, currentUserId, Boolean(localStream)]);

  useEffect(() => {
    if (!isRealTeam || !partyRoom?.id || !currentUserId || !localStream) return;

    const others = partyMembers.filter(
      (member) => member.user_id !== currentUserId,
    );

    const activeIds = new Set(others.map((member) => member.user_id));

    for (const [userId] of peersRef.current.entries()) {
      if (!activeIds.has(userId)) {
        removePeer(userId);
      }
    }

    for (const member of others) {
      startOfferIfNeeded(member.user_id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    isRealTeam,
    partyRoom?.id,
    currentUserId,
    Boolean(localStream),
    partyMembers.length,
  ]);

  useEffect(() => {
    if (!isRealTeam || !partyRoom?.id || !currentUserId || !localStream) return;

    const retryTimer = window.setInterval(async () => {
      const others = partyMembersRef.current.filter(
        (member) => member.user_id !== currentUserIdRef.current,
      );

      await loadExistingSignals();

      for (const member of others) {
        const hasRemoteStream = remoteStreamRefs.current.has(member.user_id);

        if (!hasRemoteStream) {
          await startOfferIfNeeded(member.user_id);
        }
      }
    }, 3000);

    return () => {
      window.clearInterval(retryTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRealTeam, partyRoom?.id, currentUserId, Boolean(localStream)]);

  useEffect(() => {
    if (!mountedRef.current) return;

    if (!partyRoom || partyMembers.length <= 1) {
      return;
    }

    if (!isHost) {
      const teamIsMatching = partyRoom.status === "matching";

      setIsFinding(teamIsMatching);
      setStatus(
        teamIsMatching
          ? "Team leader is finding a match..."
          : "Waiting for team leader.",
      );

      return;
    }

    if (partyRoom.status === "matching" && !isFinding) {
      stoppedRef.current = false;
      pollRunIdRef.current += 1;
      setIsFinding(true);
      setStatus("Looking for someone...");
      pollForMatch(pollRunIdRef.current);
    }

    if (partyRoom.status === "open" && isFinding) {
      stoppedRef.current = true;
      pollRunIdRef.current += 1;
      clearPollTimeout();
      setIsFinding(false);
      setStatus("Matching stopped.");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [partyRoom?.status, partyMembers.length, isHost]);

  const currentMember =
    partyMembers.find((member) => member.user_id === currentUserId) || null;

  const otherMembers = isRealTeam
    ? partyMembers.filter((member) => member.user_id !== currentUserId)
    : [];

  const teamTiles = [
    {
      key: currentUserId || "you",
      label: "You",
      country,
      stream: localStream,
      muted: true,
      cameraEnabled,
      member: currentMember,
    },
    ...otherMembers.map((member) => ({
      key: member.user_id,
      label: member.role === "host" ? "Leader" : "Friend",
      country: member.profile?.country || "",
      stream: remoteStreams[member.user_id] || null,
      muted: false,
      cameraEnabled: true,
      member,
    })),
  ];

  const teamGridClass =
    teamTiles.length <= 1
      ? "grid-cols-1"
      : teamTiles.length === 2
        ? "grid-cols-1 grid-rows-2"
        : "grid-cols-2";

  const grainyPanel = (
    <div className="relative h-full overflow-hidden bg-slate-950">
      <div className="absolute inset-0 opacity-30 [background-image:radial-gradient(circle,white_1px,transparent_1px)] [background-size:6px_6px]" />
      <div className="absolute inset-0 bg-gradient-to-br from-cyan-400/10 via-slate-950 to-purple-500/20" />

      <div className="relative z-10 flex h-full items-center justify-center text-center">
        <div className="rounded-3xl bg-black/45 px-6 py-5 backdrop-blur-md">
          <p className="text-lg font-black text-white">
            {isFinding ? "Finding match" : "Matching stopped"}
          </p>
          <p className="mt-2 max-w-sm text-sm leading-6 text-slate-300">
            {isFinding
              ? isRealTeam
                ? "Your team is searching now."
                : "Looking for someone."
              : "Press start when you are ready."}
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <PartyInviteModal
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        onInviteSent={loadPartyStatus}
      />

      <div className="h-full w-full overflow-hidden">
        <div className="mb-2 hidden h-10 items-center justify-between gap-3 md:flex">
          <div>
            <h1 className="text-xl font-black md:text-2xl">Find a Match</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Status: <span className="font-bold">{status}</span>
            </p>
          </div>

          <span className="badge shrink-0">
            {isRealTeam
              ? `Team: ${teamCount} · ${isHost ? "Leader" : "Member"}`
              : "Solo"}
          </span>
        </div>

        {error ? (
          <div className="mb-2 rounded-2xl border border-red-400/30 bg-red-500/10 p-3 text-xs text-red-700 dark:text-red-200">
            {error}
          </div>
        ) : null}

        <div className="hidden h-[calc(100%-48px)] gap-3 lg:grid lg:grid-cols-[minmax(420px,0.95fr)_minmax(0,1.25fr)_320px] lg:grid-rows-[minmax(0,1fr)_78px]">
          <div className="card min-h-0 overflow-hidden">
            <div className="flex h-11 items-center justify-between border-b border-slate-200 px-4 dark:border-slate-700/70">
              <div>
                <p className="text-sm font-black">
                  {isRealTeam ? "Your Team" : "You"}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  <CountryBadge country={country} />{" "}
                  {isRealTeam ? `· ${teamCount} member(s)` : ""}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setInviteOpen(true)}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-cyan-400 text-xl font-black text-slate-950 shadow-sm hover:bg-cyan-300"
                >
                  +
                </button>

                {isRealTeam ? (
                  <button
                    type="button"
                    onClick={leaveTeam}
                    disabled={leavingTeam}
                    className="rounded-full bg-red-500 px-3 py-2 text-xs font-black text-white hover:bg-red-600 disabled:opacity-50"
                  >
                    {leavingTeam ? "Leaving..." : "Leave"}
                  </button>
                ) : null}
              </div>
            </div>

            <div
              className={`grid h-[calc(100%-44px)] gap-2 bg-black p-2 ${teamGridClass}`}
            >
              {teamTiles.map((tile) => (
                <TeamVideoTile
                  key={tile.key}
                  label={tile.label}
                  country={tile.country}
                  stream={tile.stream}
                  muted={tile.muted}
                  cameraEnabled={tile.cameraEnabled}
                />
              ))}
            </div>
          </div>

          <div className="card min-h-0 overflow-hidden">
            <div className="flex h-11 items-center justify-between border-b border-slate-200 px-4 dark:border-slate-700/70">
              <div>
                <p className="text-sm font-black">Next match</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {isFinding ? "Waiting for another side" : "Not searching"}
                </p>
              </div>

              <span className="badge">
                {isFinding ? "Searching" : "Stopped"}
              </span>
            </div>

            <div className="h-[calc(100%-44px)]">{grainyPanel}</div>
          </div>

          <div className="card row-span-2 hidden min-h-0 flex-col overflow-hidden lg:flex">
            <div className="flex h-12 items-center justify-between border-b border-slate-200 px-4 dark:border-slate-700/70">
              <p className="font-black">
                {isRealTeam ? "Team Members" : "Invite"}
              </p>
              <span className="badge">{teamCount}</span>
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto p-4">
              {teamTiles.map((tile) => (
                <div
                  key={tile.key}
                  className="rounded-2xl border border-slate-200 p-3 dark:border-slate-700"
                >
                  <p className="font-black">
                    {tile.key === currentUserId
                      ? isRealTeam && isHost
                        ? "You / Leader"
                        : "You"
                      : tile.label}
                  </p>
                  <p className="text-xs text-slate-500">
                    <CountryBadge country={tile.country} />{" "}
                    {isRealTeam
                      ? `· ${
                          tile.key === currentUserId && isHost
                            ? "host"
                            : tile.member?.role || "member"
                        }`
                      : ""}
                  </p>
                </div>
              ))}
            </div>

            <div className="space-y-2 border-t border-slate-200 p-3 dark:border-slate-700/70">
              <button
                type="button"
                onClick={() => setInviteOpen(true)}
                className="w-full rounded-2xl bg-cyan-400 px-4 py-3 text-sm font-black text-slate-950 hover:bg-cyan-300"
              >
                + Invite Friend
              </button>

              {isRealTeam ? (
                <button
                  type="button"
                  onClick={leaveTeam}
                  disabled={leavingTeam}
                  className="w-full rounded-2xl border border-red-300 px-4 py-3 text-sm font-black text-red-600 hover:bg-red-50 disabled:opacity-50 dark:border-red-500/40 dark:hover:bg-red-500/10"
                >
                  {leavingTeam ? "Leaving..." : "Leave Team"}
                </button>
              ) : null}
            </div>
          </div>

          <div className="hidden min-h-0 lg:col-span-2 lg:block">
            <div className="card flex h-full flex-wrap items-center justify-center gap-3 p-4">
              <button
                type="button"
                onClick={toggleCamera}
                className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-black hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
              >
                {cameraEnabled ? "Turn Camera Off" : "Turn Camera On"}
              </button>

              <button
                type="button"
                onClick={toggleMic}
                className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-black hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
              >
                {micEnabled ? "Mute Mic" : "Unmute Mic"}
              </button>

              {isRealTeam ? (
                <button
                  type="button"
                  onClick={leaveTeam}
                  disabled={leavingTeam}
                  className="rounded-2xl border border-red-300 px-5 py-3 text-sm font-black text-red-600 hover:bg-red-50 disabled:opacity-50 dark:border-red-500/40 dark:hover:bg-red-500/10"
                >
                  {leavingTeam ? "Leaving..." : "Leave Team"}
                </button>
              ) : null}

              {isHost ? (
                <button
                  type="button"
                  onClick={isFinding ? stopFinding : startFinding}
                  className={`rounded-2xl px-5 py-3 text-sm font-black shadow-sm ${
                    isFinding
                      ? "bg-red-500 text-white hover:bg-red-600"
                      : "bg-cyan-400 text-slate-950 hover:bg-cyan-300"
                  }`}
                >
                  {isFinding ? "Stop Matching" : "Start Matching"}
                </button>
              ) : (
                <span className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-black text-slate-500 dark:border-slate-700">
                  Waiting for leader
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="grid h-full grid-rows-[1fr_1fr_64px] bg-black lg:hidden">
          <section className="relative grid min-h-0 gap-1 overflow-hidden bg-black p-1">
            {teamTiles.map((tile) => (
              <TeamVideoTile
                key={tile.key}
                label={tile.label}
                country={tile.country}
                stream={tile.stream}
                muted={tile.muted}
                cameraEnabled={tile.cameraEnabled}
              />
            ))}

            <button
              type="button"
              onClick={() => setInviteOpen(true)}
              className="absolute right-3 top-3 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-cyan-400 text-xl font-black text-slate-950 shadow-lg"
            >
              +
            </button>
          </section>

          <section className="relative min-h-0 overflow-hidden bg-slate-950">
            {grainyPanel}
          </section>

          <div className="z-40 border-t border-white/10 bg-black/95 p-2">
            <div className="grid h-full grid-cols-4 gap-2">
              <button
                type="button"
                onClick={toggleCamera}
                className="rounded-2xl bg-white px-2 py-2 text-xs font-black text-slate-950"
              >
                {cameraEnabled ? "Cam Off" : "Cam On"}
              </button>

              <button
                type="button"
                onClick={toggleMic}
                className="rounded-2xl bg-white px-2 py-2 text-xs font-black text-slate-950"
              >
                {micEnabled ? "Mute" : "Unmute"}
              </button>

              {isRealTeam ? (
                <button
                  type="button"
                  onClick={leaveTeam}
                  disabled={leavingTeam}
                  className="rounded-2xl bg-red-500 px-2 py-2 text-xs font-black text-white disabled:opacity-50"
                >
                  Leave
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setInviteOpen(true)}
                  className="rounded-2xl bg-cyan-400 px-2 py-2 text-xs font-black text-slate-950"
                >
                  Invite
                </button>
              )}

              {isHost ? (
                <button
                  type="button"
                  onClick={isFinding ? stopFinding : startFinding}
                  className={`rounded-2xl px-2 py-2 text-xs font-black ${
                    isFinding
                      ? "bg-red-500 text-white"
                      : "bg-cyan-400 text-slate-950"
                  }`}
                >
                  {isFinding ? "Stop" : "Start"}
                </button>
              ) : (
                <button
                  type="button"
                  disabled
                  className="rounded-2xl bg-slate-800 px-2 py-2 text-xs font-black text-slate-300"
                >
                  Leader
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}