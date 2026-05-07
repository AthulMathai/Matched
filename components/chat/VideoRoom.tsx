"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Card from "@/components/ui/Card";
import ChatControls from "@/components/chat/ChatControls";
import Button from "@/components/ui/Button";
import CountryBadge from "@/components/ui/CountryBadge";
import { createClient } from "@/lib/supabase/client";
import {
  createPeerConnection,
  improveVideoSenderQuality,
} from "@/lib/webrtc";
import {
  getSharedMediaStream,
  setSharedCameraEnabled,
  setSharedMicEnabled,
} from "@/lib/sharedMedia";

type VideoRoomProps = {
  sessionId: string;
  currentUserId: string;
  otherUserId: string;
  isCaller: boolean;
  myCountry?: string;
  otherCountry?: string;
};

type SignalRow = {
  id: string;
  session_id: string;
  sender_id: string;
  receiver_id: string;
  type: "offer" | "answer" | "ice";
  payload: {
    sdp?: RTCSessionDescriptionInit;
    candidate?: RTCIceCandidateInit;
  };
  created_at: string;
};

type ChatMessage = {
  id: string;
  sender: "me" | "them";
  body: string;
  createdAt: string;
};

type SessionStatusRow = {
  status?: string;
  end_reason?: string | null;
};

function StreamVideo({
  stream,
  muted = false,
  className = "",
}: {
  stream: MediaStream | null;
  muted?: boolean;
  className?: string;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !stream) return;

    video.srcObject = stream;
    video.muted = muted;
    video.playsInline = true;
    video.play().catch(() => {});
  }, [stream, muted]);

  return (
    <video
      ref={videoRef}
      autoPlay
      muted={muted}
      playsInline
      className={className}
    />
  );
}

function StreamAudio({ stream }: { stream: MediaStream | null }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !stream) return;

    audio.srcObject = stream;
    audio.play().catch(() => {});
  }, [stream]);

  return <audio ref={audioRef} autoPlay />;
}

export default function VideoRoom({
  sessionId,
  currentUserId,
  otherUserId,
  isCaller,
  myCountry = "",
  otherCountry = "",
}: VideoRoomProps) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const dataChannelRef = useRef<RTCDataChannel | null>(null);

  const handledSignalIdsRef = useRef<Set<string>>(new Set());
  const pendingIceCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
  const offerSentRef = useRef(false);
  const redirectedRef = useRef(false);
  const activeSessionRef = useRef("");

  const [localStreamState, setLocalStreamState] =
    useState<MediaStream | null>(null);
  const [remoteStreamState, setRemoteStreamState] =
    useState<MediaStream | null>(null);

  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [micEnabled, setMicEnabled] = useState(true);
  const [connected, setConnected] = useState(false);
  const [chatReady, setChatReady] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState("Starting camera...");
  const [error, setError] = useState("");
  const [faceBlocked, setFaceBlocked] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [mobileChatOpen, setMobileChatOpen] = useState(false);

  useEffect(() => {
    activeSessionRef.current = sessionId;
    redirectedRef.current = false;
    offerSentRef.current = false;
    handledSignalIdsRef.current = new Set();
    pendingIceCandidatesRef.current = [];

    setConnected(false);
    setChatReady(false);
    setError("");
    setMessages([]);
    setChatInput("");
    setFaceBlocked(false);
    setRemoteStreamState(null);
    setConnectionStatus("Starting camera...");

    let mounted = true;
    let signalPollTimer: number | null = null;
    let sessionPollTimer: number | null = null;
    let signalChannel: ReturnType<typeof supabase.channel> | null = null;
    let sessionChannel: ReturnType<typeof supabase.channel> | null = null;

    function isCurrentSession() {
      return activeSessionRef.current === sessionId;
    }

    function goFindNext(reason: string, autoStart = false) {
      if (redirectedRef.current) return;

      redirectedRef.current = true;
      setConnectionStatus(reason);

      if (autoStart) {
        localStorage.setItem("matched:autoStart", "1");
        router.replace("/match?autoStart=1");
        return;
      }

      router.replace("/match");
    }

    function handleEndedSession(row: SessionStatusRow) {
      if (!row.status || row.status === "active") return;

      const wasSkip = row.end_reason === "skip";

      if (wasSkip) {
        goFindNext("Skipped. Finding next match...", true);
        return;
      }

      goFindNext("User left. Returning to match page...", false);
    }

    function setupDataChannel(dc: RTCDataChannel) {
      dataChannelRef.current = dc;

      dc.onopen = () => {
        if (isCurrentSession()) setChatReady(true);
      };

      dc.onclose = () => {
        if (isCurrentSession()) setChatReady(false);
      };

      dc.onmessage = (event: MessageEvent) => {
        if (!isCurrentSession()) return;

        const body = String(event.data || "").trim();
        if (!body) return;

        setMessages((current) => [
          ...current,
          {
            id: crypto.randomUUID(),
            sender: "them",
            body,
            createdAt: new Date().toISOString(),
          },
        ]);
      };
    }

    async function checkSessionStillActive() {
      if (!isCurrentSession()) return;

      const { data, error } = await supabase
        .from("chat_sessions")
        .select("status, end_reason")
        .eq("id", sessionId)
        .maybeSingle();

      if (error || !data) return;

      handleEndedSession(data as SessionStatusRow);
    }

    async function sendSignal(
      type: "offer" | "answer" | "ice",
      payload: SignalRow["payload"],
    ) {
      if (!isCurrentSession()) return;

      await supabase.from("webrtc_signals").insert({
        session_id: sessionId,
        sender_id: currentUserId,
        receiver_id: otherUserId,
        type,
        payload,
      });
    }

    async function flushPendingIceCandidates() {
      const pc = peerConnectionRef.current;
      if (!pc || !pc.remoteDescription) return;

      const pending = [...pendingIceCandidatesRef.current];
      pendingIceCandidatesRef.current = [];

      for (const candidate of pending) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (err) {
          console.error("Failed adding pending ICE:", err);
        }
      }
    }

    async function handleSignal(signal: SignalRow) {
      if (!isCurrentSession()) return;
      if (handledSignalIdsRef.current.has(signal.id)) return;
      if (signal.session_id !== sessionId) return;
      if (signal.sender_id !== otherUserId) return;
      if (signal.receiver_id !== currentUserId) return;

      handledSignalIdsRef.current.add(signal.id);

      const pc = peerConnectionRef.current;
      if (!pc) return;

      try {
        if (signal.type === "offer" && signal.payload.sdp) {
          if (pc.signalingState !== "stable") return;

          setConnectionStatus("Offer received. Sending answer...");

          await pc.setRemoteDescription(
            new RTCSessionDescription(signal.payload.sdp),
          );

          await flushPendingIceCandidates();

          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);

          await sendSignal("answer", {
            sdp: answer,
          });

          setConnectionStatus("Answer sent. Connecting...");
          return;
        }

        if (signal.type === "answer" && signal.payload.sdp) {
          if (pc.signalingState !== "have-local-offer") return;

          setConnectionStatus("Answer received. Connecting...");

          await pc.setRemoteDescription(
            new RTCSessionDescription(signal.payload.sdp),
          );

          await flushPendingIceCandidates();
          return;
        }

        if (signal.type === "ice" && signal.payload.candidate) {
          if (!pc.remoteDescription) {
            pendingIceCandidatesRef.current.push(signal.payload.candidate);
            return;
          }

          await pc.addIceCandidate(new RTCIceCandidate(signal.payload.candidate));
        }
      } catch (err) {
        if (!isCurrentSession()) return;

        setError(
          err instanceof Error
            ? err.message
            : "WebRTC signal handling failed.",
        );
      }
    }

    async function fetchSignals() {
      if (!isCurrentSession()) return;

      const { data } = await supabase
        .from("webrtc_signals")
        .select("*")
        .eq("session_id", sessionId)
        .eq("receiver_id", currentUserId)
        .eq("sender_id", otherUserId)
        .order("created_at", { ascending: true });

      for (const signal of (data || []) as SignalRow[]) {
        await handleSignal(signal);
      }
    }

    async function createOfferIfCaller() {
      const pc = peerConnectionRef.current;
      if (!pc || !isCaller || offerSentRef.current) return;

      offerSentRef.current = true;

      setConnectionStatus("Creating offer...");

      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true,
      });

      await pc.setLocalDescription(offer);

      await sendSignal("offer", {
        sdp: offer,
      });

      setConnectionStatus("Offer sent. Waiting for answer...");
    }

    async function setupWebRTC() {
      try {
        setError("");
        setConnectionStatus("Starting camera...");

        const localStream = await getSharedMediaStream();

        setSharedCameraEnabled(true);

        localStream.getVideoTracks().forEach((track) => {
          track.enabled = true;
        });

        if (!mounted || !isCurrentSession()) return;

        setLocalStreamState(localStream);
        setCameraEnabled(true);
        setMicEnabled(localStream.getAudioTracks().every((track) => track.enabled));

        setConnectionStatus("Creating peer connection...");

        const pc = createPeerConnection();
        peerConnectionRef.current = pc;

        if (isCaller) {
          setupDataChannel(pc.createDataChannel("matched-chat"));
        } else {
          pc.ondatachannel = (event: RTCDataChannelEvent) => {
            setupDataChannel(event.channel);
          };
        }

        localStream.getTracks().forEach((track) => {
          pc.addTrack(track, localStream);
        });

        await improveVideoSenderQuality(pc);

        pc.ontrack = (event: RTCTrackEvent) => {
          if (!isCurrentSession()) return;

          const [remoteStream] = event.streams;

          if (remoteStream) {
            setRemoteStreamState(remoteStream);
          }

          setConnected(true);
          setConnectionStatus("Connected");
        };

        pc.onicecandidate = async (event: RTCPeerConnectionIceEvent) => {
          if (event.candidate) {
            await sendSignal("ice", {
              candidate: event.candidate.toJSON(),
            });
          }
        };

        pc.oniceconnectionstatechange = () => {
          if (!isCurrentSession()) return;

          const state = pc.iceConnectionState;

          if (state === "connected" || state === "completed") {
            setConnected(true);
            setConnectionStatus("Connected");
          }

          if (state === "failed") {
            setConnected(false);
            goFindNext("Connection failed. Finding next match...", true);
          }
        };

        pc.onconnectionstatechange = () => {
          if (!isCurrentSession()) return;

          const state = pc.connectionState;

          if (state === "connected") {
            setConnected(true);
            setConnectionStatus("Connected");
          }

          if (state === "failed") {
            setConnected(false);
            goFindNext("Connection failed. Finding next match...", true);
          }
        };

        signalChannel = supabase
          .channel(`webrtc:${sessionId}:${currentUserId}`)
          .on(
            "postgres_changes",
            {
              event: "INSERT",
              schema: "public",
              table: "webrtc_signals",
              filter: `receiver_id=eq.${currentUserId}`,
            },
            async (payload) => {
              await handleSignal(payload.new as SignalRow);
            },
          )
          .subscribe();

        sessionChannel = supabase
          .channel(`session:${sessionId}:${currentUserId}`)
          .on(
            "postgres_changes",
            {
              event: "UPDATE",
              schema: "public",
              table: "chat_sessions",
              filter: `id=eq.${sessionId}`,
            },
            async (payload) => {
              handleEndedSession(payload.new as SessionStatusRow);
            },
          )
          .subscribe();

        await fetchSignals();
        await checkSessionStillActive();

        signalPollTimer = window.setInterval(fetchSignals, 1000);
        sessionPollTimer = window.setInterval(checkSessionStillActive, 1200);

        if (isCaller) {
          await createOfferIfCaller();
        } else {
          setConnectionStatus("Waiting for offer...");
        }
      } catch (err) {
        if (!isCurrentSession()) return;

        setError(
          err instanceof Error
            ? err.message
            : "Camera, microphone, or WebRTC setup failed.",
        );
        setConnectionStatus("Setup failed");
      }
    }

    setupWebRTC();

    return () => {
      mounted = false;

      if (signalPollTimer) window.clearInterval(signalPollTimer);
      if (sessionPollTimer) window.clearInterval(sessionPollTimer);

      if (signalChannel) supabase.removeChannel(signalChannel);
      if (sessionChannel) supabase.removeChannel(sessionChannel);

      dataChannelRef.current?.close();
      peerConnectionRef.current?.close();

      setRemoteStreamState(null);
    };
  }, [currentUserId, isCaller, otherUserId, router, sessionId, supabase]);

  async function handleSkip() {
    localStorage.setItem("matched:autoStart", "1");

    fetch("/api/sessions/end", {
        method: "POST",
        headers: {
        "Content-Type": "application/json",
        },
        body: JSON.stringify({
        sessionId,
        reason: "skip",
        }),
    }).catch(() => {});

    router.replace("/match?autoStart=1");
  }

  function toggleCamera() {
    const nextEnabled = !cameraEnabled;
    setSharedCameraEnabled(nextEnabled);
    setCameraEnabled(nextEnabled);
  }

  function toggleMic() {
    const nextEnabled = !micEnabled;
    setSharedMicEnabled(nextEnabled);
    setMicEnabled(nextEnabled);
  }

  function sendChatMessage() {
    const body = chatInput.trim();
    if (!body) return;

    const dc = dataChannelRef.current;

    if (!dc || dc.readyState !== "open") {
      setError("Live chat is not connected yet.");
      return;
    }

    dc.send(body);

    fetch("/api/messages/save", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sessionId,
        receiverId: otherUserId,
        body,
      }),
    }).catch(() => {});

    setMessages((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        sender: "me",
        body,
        createdAt: new Date().toISOString(),
      },
    ]);

    setChatInput("");
  }

  const messageList = (
    <div className="flex-1 space-y-3 overflow-y-auto p-4">
      {messages.length === 0 ? (
        <p className="text-center text-sm leading-6 text-slate-500">
          Messages during this video chat will appear here.
        </p>
      ) : (
        messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${
              message.sender === "me" ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${
                message.sender === "me"
                  ? "bg-cyan-400 text-slate-950"
                  : "bg-slate-200 text-slate-900 dark:bg-slate-800 dark:text-white"
              }`}
            >
              {message.body}
            </div>
          </div>
        ))
      )}
    </div>
  );

  const chatInputBox = (
    <div className="flex gap-2">
      <input
        className="input"
        value={chatInput}
        onChange={(event) => setChatInput(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            sendChatMessage();
          }
        }}
        placeholder="Type message..."
      />

      <Button
        type="button"
        disabled={!chatReady || !chatInput.trim()}
        onClick={sendChatMessage}
      >
        Send
      </Button>
    </div>
  );

  return (
    <div className="h-full w-full overflow-hidden">
      <StreamAudio stream={remoteStreamState} />

      <div className="mb-2 hidden h-10 items-center justify-between gap-3 md:flex">
        <div className="min-w-0">
          <h1 className="truncate text-xl font-black md:text-2xl">
            Matched Chat
          </h1>
          <p className="truncate text-xs text-slate-500 dark:text-slate-400">
            Status: <span className="font-bold">{connectionStatus}</span>
          </p>
        </div>

        <p className="badge shrink-0">{connected ? "Connected" : "Waiting"}</p>
      </div>

      {error ? (
        <div className="mb-2 rounded-2xl border border-red-400/30 bg-red-500/10 p-3 text-xs text-red-700 dark:text-red-200">
          {error}
        </div>
      ) : null}

      {faceBlocked ? (
        <div className="mb-2 rounded-2xl border border-yellow-400/30 bg-yellow-500/10 p-3 text-xs text-yellow-700 dark:text-yellow-100">
          Face not clearly visible. Please face the camera.
        </div>
      ) : null}

      <div className="hidden h-[calc(100%-48px)] gap-3 lg:grid lg:grid-cols-[minmax(280px,0.72fr)_minmax(0,1.35fr)_340px] lg:grid-rows-[minmax(0,1fr)_78px]">
        <Card className="min-h-0 overflow-hidden">
          <div className="flex h-11 items-center justify-between border-b border-slate-200 px-4 dark:border-slate-700/70">
            <div>
              <p className="text-sm font-black">You</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                <CountryBadge country={myCountry} />
              </p>
            </div>

            {!micEnabled ? (
              <span className="rounded-full bg-red-500 px-3 py-1 text-xs font-black text-white">
                Muted
              </span>
            ) : null}
          </div>

          <div className="relative h-[calc(100%-44px)] bg-black">
            <StreamVideo
              stream={localStreamState}
              muted
              className="h-full w-full object-contain"
            />

            {!cameraEnabled ? (
              <div className="absolute inset-0 flex items-center justify-center bg-slate-950/90 text-sm font-bold text-slate-300">
                Camera off
              </div>
            ) : null}

            {!micEnabled ? (
              <div className="absolute bottom-3 right-3 rounded-full bg-red-500 px-3 py-2 text-xs font-black text-white">
                Mic muted
              </div>
            ) : null}
          </div>
        </Card>

        <Card className="min-h-0 overflow-hidden">
          <div className="flex h-11 items-center justify-between border-b border-slate-200 px-4 dark:border-slate-700/70">
            <div>
              <p className="text-sm font-black">Stranger</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                <CountryBadge country={otherCountry} />
              </p>
            </div>

            <span className="badge">{connected ? "Live" : "Connecting"}</span>
          </div>

          <div className="relative h-[calc(100%-44px)] bg-black">
            <StreamVideo
              stream={remoteStreamState}
              muted
              className="h-full w-full object-contain"
            />

            {!connected ? (
              <div className="absolute inset-0 flex items-center justify-center overflow-hidden bg-slate-950 text-center">
                <div className="absolute inset-0 opacity-30 [background-image:radial-gradient(circle,white_1px,transparent_1px)] [background-size:6px_6px]" />
                <div className="relative z-10 rounded-3xl bg-black/40 px-6 py-5 backdrop-blur-md">
                  <p className="text-lg font-black text-white">
                    Finding your next match
                  </p>
                </div>
              </div>
            ) : null}
          </div>
        </Card>

        <Card className="row-span-2 hidden min-h-0 flex-col overflow-hidden lg:flex">
          <div className="flex h-12 items-center justify-between border-b border-slate-200 px-4 dark:border-slate-700/70">
            <p className="font-black">Live Chat</p>
            <span className="badge">{chatReady ? "Ready" : "Connecting"}</span>
          </div>

          {messageList}

          <div className="border-t border-slate-200 p-3 dark:border-slate-700/70">
            {chatInputBox}
          </div>
        </Card>

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

            <button
              type="button"
              onClick={handleSkip}
              className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-black hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
            >
              Skip
            </button>

            <Button
              type="button"
              variant="danger"
              onClick={() => {
                fetch("/api/sessions/end", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ sessionId, reason: "block" }),
                }).finally(() => router.replace("/match"));
              }}
            >
              Block
            </Button>
          </div>
        </div>
      </div>

      <div className="grid h-full grid-rows-[1fr_1fr_54px_58px] gap-0 bg-black lg:hidden">
        <section className="relative min-h-0 overflow-hidden bg-black">
          <StreamVideo
            stream={localStreamState}
            muted
            className="h-full w-full object-contain"
          />

          <div className="absolute left-3 top-3 rounded-full bg-black/50 px-3 py-1 text-xs font-black text-white backdrop-blur-md">
            You <CountryBadge country={myCountry} showName={false} />
          </div>

          {!cameraEnabled ? (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-950/90 text-xs font-bold text-slate-300">
              Camera off
            </div>
          ) : null}
        </section>

        <section className="relative min-h-0 overflow-hidden bg-black">
          <StreamVideo
            stream={remoteStreamState}
            muted
            className="h-full w-full object-contain"
          />

          <div className="absolute left-3 top-3 rounded-full bg-black/50 px-3 py-1 text-xs font-black text-white backdrop-blur-md">
            Stranger <CountryBadge country={otherCountry} showName={false} />
          </div>

          {!connected ? (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-950">
              <div className="absolute inset-0 opacity-30 [background-image:radial-gradient(circle,white_1px,transparent_1px)] [background-size:6px_6px]" />
              <div className="relative z-10 rounded-2xl bg-black/50 px-4 py-3 text-sm font-black text-white backdrop-blur-md">
                Finding match
              </div>
            </div>
          ) : null}
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

            <button
              type="button"
              onClick={handleSkip}
              className="rounded-2xl bg-white px-2 py-2 text-xs font-black text-slate-950"
            >
              Skip
            </button>

            <button
              type="button"
              onClick={() => setMobileChatOpen(true)}
              className="rounded-2xl bg-cyan-400 px-2 py-2 text-xs font-black text-slate-950"
            >
              Chat
            </button>
          </div>
        </div>

        <div className="z-40 border-t border-white/10 bg-black/95 p-2">
          <div className="flex h-full gap-2">
            <button
              type="button"
              onClick={() => setMobileChatOpen(true)}
              className="flex-1 rounded-2xl border border-white/10 bg-white px-4 text-left text-sm text-slate-500"
            >
              Message...
            </button>

            <Button
              type="button"
              disabled={!chatReady}
              onClick={() => setMobileChatOpen(true)}
            >
              Send
            </Button>
          </div>
        </div>
      </div>

      {mobileChatOpen ? (
        <div className="fixed inset-0 z-[70] bg-black/40 lg:hidden">
          <div className="absolute inset-x-0 bottom-0 flex h-[72dvh] flex-col rounded-t-[28px] bg-white shadow-2xl dark:bg-slate-950">
            <div className="flex h-14 items-center justify-between border-b border-slate-200 px-4 dark:border-slate-800">
              <div>
                <p className="font-black">Live Chat</p>
                <p className="text-xs text-slate-500">
                  {chatReady ? "Ready" : "Connecting"}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setMobileChatOpen(false)}
                className="rounded-full border border-slate-200 px-4 py-2 text-sm font-black dark:border-slate-700"
              >
                Close
              </button>
            </div>

            {messageList}

            <div className="border-t border-slate-200 p-3 dark:border-slate-800">
              {chatInputBox}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}