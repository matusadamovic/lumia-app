"use client";

import { useEffect, useRef, useState } from "react";
import io from "socket.io-client";
import SimplePeer, { SignalData } from "simple-peer";

type MatchPayload = { otherId: string; initiator: boolean };

const ICE_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
  {
    urls: "turn:openrelay.metered.ca:80",
    username: "openrelayproject",
    credential: "openrelayproject",
  },
];

export default function Home() {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  const peerRef   = useRef<SimplePeer.Instance | null>(null);
  const socketRef = useRef<ReturnType<typeof io> | null>(null);

  const [status,        setStatus]        = useState("Kliknite Štart pre povolenie kamery…");
  const [hasLocalVideo, setHasLocalVideo] = useState(true);
  const [nextEnabled,   setNextEnabled]   = useState(false);
  const [started,       setStarted]       = useState(false);
  const [partnerId,     setPartnerId]     = useState<string | null>(null);
  const [hasReported,   setHasReported]   = useState(false);

  /* ─────────────────── Socket setup helper ─────────────────── */
  function connectSocket() {
    setNextEnabled(false);
    const socket = io({ path: "/api/socket" });
    socketRef.current = socket;

    socket.on("match", ({ otherId, initiator }: MatchPayload) => {
      setStatus("Partner nájdený, pripájam…");
      setPartnerId(otherId);
      setHasReported(false);
      startPeer(otherId, initiator);
      setNextEnabled(true);
    });

    socket.on("partner-left", () => {
      setStatus("Partner odišiel.");
      setNextEnabled(true);
      setPartnerId(null);
      setHasReported(false);
      peerRef.current?.destroy();
    });

    socket.on("signal", (data: SignalData) => peerRef.current?.signal(data));
  }

  /* ─────────────────────── Camera setup ─────────────────────── */
  async function startCamera() {
    if (localStreamRef.current) return;

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      attachLocalStream(stream);
      localStreamRef.current = stream;
      setHasLocalVideo(true);
    } catch (err) {
      const e = err as DOMException;
      console.warn("getUserMedia:", e.name, e.message);

      if (e.name === "NotAllowedError" || e.name === "SecurityError") {
        setStatus("Používateľ zamietol prístup ku kamere – prijímame len video druhej strany.");
      } else if (e.name === "NotFoundError") {
        setStatus("Nebola nájdená žiadna kamera ani mikrofón.");
      } else {
        setStatus(`Chyba kamery: ${e.name}`);
      }
      localStreamRef.current = null;
      setHasLocalVideo(false);
    }
  }

  async function handleStart() {
    await startCamera();
    connectSocket();
    setStatus("Čakám na partnera…");
    setStarted(true);
  }

  /* ───────────────────── Socket lifecycle ───────────────────── */
  useEffect(() => {
    return cleanupFull;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ─────────────────── WebRTC peer creation ─────────────────── */
  async function startPeer(otherId: string, initiator: boolean) {
    const stream = localStreamRef.current ?? new MediaStream();

    const peer = new SimplePeer({
      initiator,
      stream,
      trickle: false,
      config: { iceServers: ICE_SERVERS },
    });
    peerRef.current = peer;

    peer.on("signal", (sig) => socketRef.current?.emit("signal", { to: otherId, data: sig }));
    peer.on("track", (_t, s) => {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = s;
        remoteVideoRef.current.playsInline = true;
      }
      setStatus("Video pripojené 🎉");
    });
    peer.on("error", (e) => {
      console.error("peer error", e);
      setStatus("Chyba spojenia, načítajte stránku znovu.");
    });
  }

  function attachLocalStream(s: MediaStream) {
    if (localVideoRef.current) {
      localVideoRef.current.srcObject  = s;
      localVideoRef.current.muted      = true;
      localVideoRef.current.playsInline = true;
    }
  }

  /* ────────────────────── Cleanup helper ────────────────────── */
  function cleanupPeer() {
    peerRef.current?.destroy();
    socketRef.current?.disconnect();
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }
    setPartnerId(null);
    setHasReported(false);
  }

  function cleanupFull() {
    cleanupPeer();
    const ls = localVideoRef.current?.srcObject as MediaStream | null;
    ls?.getTracks().forEach((t) => t.stop());
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }
    localStreamRef.current = null;
  }

  function nextPartner() {
    cleanupPeer();
    connectSocket();
    setStatus("Čakám na partnera…");
    setNextEnabled(false);
    setPartnerId(null);
    setHasReported(false);
  }

  function reportPartner() {
    if (!partnerId || !socketRef.current) return;
    socketRef.current.emit("report-user", partnerId);
    setHasReported(true);
  }

  /* ─────────────────────────── UI ──────────────────────────── */
  return (
    <div className="h-screen flex flex-col items-center justify-center p-4">
      <h1 className="text-3xl font-bold mb-4">OmeTV Clone</h1>
      <p className="mb-4">{status}</p>

      <div className="grid grid-cols-2 gap-4 w-full max-w-3xl mb-4">
        {/* LOCAL */}
        <div className="relative bg-black aspect-video rounded overflow-hidden">
          {!hasLocalVideo && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/70 text-white text-sm">
              Kamera vypnutá
            </div>
          )}
          <video ref={localVideoRef} autoPlay muted className="w-full h-full object-cover" />
        </div>

        {/* REMOTE */}
        <video
          ref={remoteVideoRef}
          autoPlay
          className="bg-black w-full aspect-video rounded object-cover"
        />
      </div>

      <div className="flex gap-2">
        {!started ? (
          <button
            onClick={handleStart}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          >
            Štart
          </button>
        ) : (
          <>
            <button
              onClick={nextPartner}
              disabled={!nextEnabled}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
            >
              Ďalší partner
            </button>
            <button
              onClick={reportPartner}
              disabled={!partnerId || hasReported}
              className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 disabled:opacity-50"
            >
              Nahlásiť
            </button>
          </>
        )}
      </div>
    </div>
  );
}
