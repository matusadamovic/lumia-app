"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import io from "socket.io-client";
import SimplePeer, { SignalData } from "simple-peer";

type MatchPayload = { peers: string[]; initiator: boolean };

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
  const localStreamRef = useRef<MediaStream | null>(null);

  const peerRefs = useRef<Record<string, SimplePeer.Instance>>({});
  const socketRef = useRef<ReturnType<typeof io> | null>(null);
  const remoteVideoRefs = useRef<Record<string, HTMLVideoElement | null>>({});

  const [remoteStreams, setRemoteStreams] = useState<Record<string, MediaStream | null>>({});
  const [remoteIds, setRemoteIds] = useState<string[]>([]);
  const [groupSize, setGroupSize] = useState(1);

  const [status,        setStatus]        = useState("Kliknite Štart pre povolenie kamery…");
  const [hasLocalVideo, setHasLocalVideo] = useState(true);
  const [nextEnabled,   setNextEnabled]   = useState(false);
  const [started,       setStarted]       = useState(false);
  const [partnerId,     setPartnerId]     = useState<string | null>(null);
  const [hasReported,   setHasReported]   = useState(false);
  const [messages,      setMessages]      = useState<{ self: boolean; text: string }[]>([]);
  const [newMessage,    setNewMessage]    = useState("");

  /* ─────────────────── Socket setup helper ─────────────────── */
  function connectSocket() {
    setNextEnabled(false);
    const socket = io({ path: "/api/socket", auth: { size: groupSize } });
    socketRef.current = socket;

    socket.on("match", ({ peers, initiator }: MatchPayload) => {
      setStatus("Partneri nájdení, pripájam…");
      setPartnerId(peers[0] ?? null);
      setRemoteIds(peers);
      setHasReported(false);
      setMessages([]);
      startPeers(peers, initiator);
      setNextEnabled(true);
    });

    socket.on("partner-left", () => {
      setStatus("Partner odišiel.");
      setNextEnabled(true);
      setPartnerId(null);
      setRemoteIds([]);
      setHasReported(false);
      setMessages([]);
      Object.values(peerRefs.current).forEach((p) => p.destroy());
      peerRefs.current = {};
      setRemoteStreams({});
    });

    socket.on("signal", (data: { from: string; data: SignalData }) => {
      const peer = peerRefs.current[data.from];
      peer?.signal(data.data);
    });
    socket.on("chat-message", (msg: string) =>
      setMessages((m) => [...m, { self: false, text: msg }])
    );
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

  useEffect(() => {
    Object.entries(remoteStreams).forEach(([id, s]) => {
      const el = remoteVideoRefs.current[id];
      if (el && s) {
        el.srcObject = s;
        el.playsInline = true;
      }
    });
  }, [remoteStreams]);

  /* ─────────────────── WebRTC peer creation ─────────────────── */
  function startPeers(ids: string[], initiator: boolean) {
    const stream = localStreamRef.current ?? new MediaStream();

    ids.forEach((otherId) => {
      const peer = new SimplePeer({
        initiator,
        stream,
        trickle: false,
        config: { iceServers: ICE_SERVERS },
      });
      peerRefs.current[otherId] = peer;

      peer.on("signal", (sig) =>
        socketRef.current?.emit("signal", { to: otherId, data: sig })
      );
      peer.on("track", (_t, s) => {
        setRemoteStreams((rs) => ({ ...rs, [otherId]: s }));
        setStatus("Video pripojené 🎉");
      });
      peer.on("error", (e) => {
        console.error("peer error", e);
        setStatus("Chyba spojenia, načítajte stránku znovu.");
      });
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
    Object.values(peerRefs.current).forEach((p) => p.destroy());
    peerRefs.current = {};
    socketRef.current?.disconnect();
    setRemoteStreams({});
    setPartnerId(null);
    setRemoteIds([]);
    setHasReported(false);
    setMessages([]);
    setNewMessage("");
  }

  function cleanupFull() {
    cleanupPeer();
    const ls = localVideoRef.current?.srcObject as MediaStream | null;
    ls?.getTracks().forEach((t) => t.stop());
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }
    localStreamRef.current = null;
    setMessages([]);
    setNewMessage("");
  }

  function nextPartner() {
    cleanupPeer();
    connectSocket();
    setStatus("Čakám na partnera…");
    setNextEnabled(false);
    setPartnerId(null);
    setRemoteIds([]);
    setHasReported(false);
    setMessages([]);
    setNewMessage("");
  }

  function reportPartner() {
    if (!partnerId || !socketRef.current) return;
    socketRef.current.emit("report-user", partnerId);
    setHasReported(true);
  }

  function sendMessage(e: FormEvent) {
    e.preventDefault();
    const msg = newMessage.trim();
    if (!msg || !socketRef.current) return;
    socketRef.current.emit("chat-message", msg);
    setMessages((m) => [...m, { self: true, text: msg }]);
    setNewMessage("");
  }

  /* ─────────────────────────── UI ──────────────────────────── */
  return (
    <div className="h-screen flex flex-col items-center justify-center p-4">
      <h1 className="text-3xl font-bold mb-4">OmeTV Clone</h1>
      <p className="mb-4">{status}</p>

      <div className="flex flex-wrap gap-4 w-full max-w-3xl mb-4 justify-center">
        {/* LOCAL */}
        <div className="relative bg-black aspect-video rounded overflow-hidden">
          {!hasLocalVideo && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/70 text-white text-sm">
              Kamera vypnutá
            </div>
          )}
          <video ref={localVideoRef} autoPlay muted className="w-full h-full object-cover" />
        </div>

        {remoteIds.map((id) => (
          <video
            key={id}
            ref={(el) => (remoteVideoRefs.current[id] = el)}
            autoPlay
            className="bg-black w-full aspect-video rounded object-cover"
          />
        ))}
      </div>

      {started && (
        <div className="w-full max-w-3xl mb-4">
          <div className="h-40 overflow-y-auto border rounded p-2 mb-2 bg-white text-black dark:bg-neutral-800 dark:text-white">
            {messages.map((m, i) => (
              <div key={i} className={m.self ? "text-right" : "text-left"}>
                <span className="inline-block px-2 py-1 my-1 rounded bg-gray-200 text-black dark:bg-gray-700 dark:text-white">
                  {m.text}
                </span>
              </div>
            ))}
          </div>
          <form onSubmit={sendMessage} className="flex gap-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              className="flex-grow border rounded px-2 py-1 text-black"
              placeholder="Napíšte správu..."
            />
            <button
              type="submit"
              className="px-4 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Poslať
            </button>
          </form>
        </div>
      )}

      <div className="flex gap-2">
        {!started ? (
          <>
            <select
              value={groupSize}
              onChange={(e) => setGroupSize(Number(e.target.value))}
              className="px-2 py-1 border rounded"
            >
              <option value={1}>1v1</option>
              <option value={2}>2v2</option>
              <option value={3}>3v3</option>
            </select>
            <button
              onClick={handleStart}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
            >
              Štart
            </button>
          </>
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
