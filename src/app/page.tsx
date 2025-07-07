"use client";

import { useEffect, useRef, useState, useCallback, type FormEvent } from "react";
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

  const peerRef = useRef<SimplePeer.Instance | null>(null);
  const socketRef = useRef<ReturnType<typeof io> | null>(null);

  const [status, setStatus] = useState(
    "Kliknite Štart pre povolenie kamery…"
  );
  const [hasLocalVideo, setHasLocalVideo] = useState(true);
  const [nextEnabled, setNextEnabled] = useState(false);
  const [started, setStarted] = useState(false);
  const [partnerId, setPartnerId] = useState<string | null>(null);
  const [hasReported, setHasReported] = useState(false);
  const [messages, setMessages] = useState<
    { self: boolean; text: string }[]
  >([]);
  const [newMessage, setNewMessage] = useState("");

  /* ───── Socket setup ───── */
  function connectSocket() {
    setNextEnabled(false);
    const socket = io({ path: "/api/socket" });
    socketRef.current = socket;

    socket.on("match", ({ otherId, initiator }: MatchPayload) => {
      setStatus("Partner nájdený, pripájam…");
      setPartnerId(otherId);
      setHasReported(false);
      setMessages([]);
      startPeer(otherId, initiator);
      setNextEnabled(true);
    });

    socket.on("partner-left", () => {
      setStatus("Partner odišiel.");
      setNextEnabled(true);
      setPartnerId(null);
      setHasReported(false);
      setMessages([]);
      peerRef.current?.destroy();
    });

    socket.on("signal", (data: SignalData) =>
      peerRef.current?.signal(data)
    );
    socket.on("chat-message", (msg: string) =>
      setMessages((m) => [...m, { self: false, text: msg }])
    );
  }

  /* ───── Camera setup ───── */
  async function startCamera() {
    if (localStreamRef.current) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      attachLocalStream(stream);
      localStreamRef.current = stream;
      setHasLocalVideo(true);
    } catch (err) {
      const e = err as DOMException;
      console.warn("getUserMedia:", e.name, e.message);
      if (e.name === "NotAllowedError" || e.name === "SecurityError") {
        setStatus(
          "Používateľ zamietol prístup ku kamere – prijímame len video druhej strany."
        );
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

  /* ───── Cleanup ───── */
  function cleanupPeer() {
    peerRef.current?.destroy();
    socketRef.current?.disconnect();
    if (remoteVideoRef.current)
      remoteVideoRef.current.srcObject = null;
    setPartnerId(null);
    setHasReported(false);
    setMessages([]);
    setNewMessage("");
  }

  const cleanupFull = useCallback(() => {
    cleanupPeer();
    const ls = localVideoRef.current
      ?.srcObject as MediaStream | null;
    ls?.getTracks().forEach((t) => t.stop());
    if (localVideoRef.current)
      localVideoRef.current.srcObject = null;
    localStreamRef.current = null;
    setMessages([]);
    setNewMessage("");
  }, []);

  useEffect(() => cleanupFull, [cleanupFull]);

  /* ───── Peer setup ───── */
  async function startPeer(otherId: string, initiator: boolean) {
    const stream = localStreamRef.current ?? new MediaStream();
    const peer = new SimplePeer({
      initiator,
      stream,
      trickle: false,
      config: { iceServers: ICE_SERVERS },
    });
    peerRef.current = peer;

    peer.on("signal", (sig) =>
      socketRef.current?.emit("signal", { to: otherId, data: sig })
    );
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
    if (!localVideoRef.current) return;
    localVideoRef.current.srcObject = s;
    localVideoRef.current.muted = true;
    localVideoRef.current.playsInline = true;
  }


  function nextPartner() {
    cleanupPeer();
    connectSocket();
    setStatus("Čakám na partnera…");
    setNextEnabled(false);
    setPartnerId(null);
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

  /* ───── UI ───── */
  return (
    <div className="h-screen w-full flex flex-col">
      {/* ─── MOBILE ─── */}
      <div className="md:hidden flex flex-col flex-1 gap-0">
        {/* partner video */}
        <div className="flex-1 relative bg-black overflow-hidden">
          <video
            ref={remoteVideoRef}
            autoPlay
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 flex items-center justify-center text-white text-sm bg-black/30 pointer-events-none">
            {status}
          </div>
        </div>

        {/* Lumia bar */}
        <div
          className="
            absolute
            top-1/2 left-1/2
            transform -translate-x-1/2 -translate-y-1/2
            z-10
            flex items-center justify-center gap-3
            bg-green-600/20 backdrop-blur-md
            border border-white/30
            text-white
            px-4 py-2
            rounded-2xl
          "
        >
          <span className="font-semibold">Lumia</span>
          {!started ? (
            <button
              onClick={handleStart}
              className="px-4 py-2 bg-white text-green-600 rounded-lg"
            >
              Štart
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={nextPartner}
                disabled={!nextEnabled}
                className="px-4 py-2 bg-red-500 rounded-lg disabled:opacity-50"
              >
                Ďalší
              </button>
              <button
                onClick={reportPartner}
                disabled={!partnerId || hasReported}
                className="px-4 py-2 bg-orange-400 rounded-lg disabled:opacity-50"
              >
                Nahlásiť
              </button>
            </div>
          )}
        </div>

        {/* your video + chat */}
        <div className="flex-1 relative bg-black overflow-hidden">
          {!hasLocalVideo && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/70 text-white text-sm">
              Kamera vypnutá
            </div>
          )}
          <video
            ref={localVideoRef}
            autoPlay
            muted
            className="w-full h-full object-cover"
          />

          {/* chat overlay */}
          {started && (
            <div className="absolute inset-x-0 bottom-16 max-h-40 overflow-y-auto p-2 bg-black/50">
              {messages.map((m, i) => (
                <div
                  key={i}
                  className={m.self ? "text-right" : "text-left"}
                >
                  <span className="inline-block px-2 py-1 my-1 rounded bg-white/80 text-black">
                    {m.text}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* chat input */}
          {started && (
            <form
              onSubmit={sendMessage}
              className="absolute inset-x-0 bottom-0 flex gap-2 p-2 bg-purple-600"
            >
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                className="flex-grow border rounded px-2 py-1 text-black"
                placeholder="Napíšte správu…"
              />
              <button
                type="submit"
                className="px-4 py-1 bg-blue-600 text-white rounded"
              >
                Poslať
              </button>
            </form>
          )}
        </div>
      </div>

      {/* ─── DESKTOP ─── */}
      <div className="hidden md:flex relative flex-1 h-full">
        {/* Left: partner camera */}
        <div className="flex-1 relative bg-black overflow-hidden">
          <video
            ref={remoteVideoRef}
            autoPlay
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 flex items-center justify-center text-white text-sm bg-black/30 pointer-events-none">
            {status}
          </div>
        </div>

        {/* Right: your camera + chat */}
        <div className="flex-1 relative bg-black overflow-hidden">
          <video
            ref={localVideoRef}
            autoPlay
            muted
            className="w-full h-full object-cover"
          />
          {!hasLocalVideo && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/70 text-white text-sm">
              Kamera vypnutá
            </div>
          )}

          {started && (
            <div className="absolute inset-x-0 bottom-16 max-h-48 overflow-y-auto p-2 bg-black/50">
              {messages.map((m, i) => (
                <div
                  key={i}
                  className={m.self ? "text-right" : "text-left"}
                >
                  <span className="inline-block px-2 py-1 my-1 rounded bg-white/80 text-black">
                    {m.text}
                  </span>
                </div>
              ))}
            </div>
          )}

          {started && (
            <form
              onSubmit={sendMessage}
              className="absolute inset-x-0 bottom-0 flex gap-2 p-2 bg-gray-100"
            >
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                className="flex-grow border rounded px-2 py-1 text-black"
                placeholder="Napíšte správu…"
              />
              <button
                type="submit"
                className="px-4 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Poslať
              </button>
            </form>
          )}
        </div>

        {/* Desktop action panel ako overlay */}
        <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center bg-green-600/20 backdrop-blur-md border border-white/30 text-white px-4 py-2 rounded-2xl z-10">
          <span className="font-semibold">Lumia</span>
          <div className="mt-4 flex flex-col gap-2">
            {!started ? (
              <button
                onClick={handleStart}
                className="px-4 py-2 bg-white text-green-600 rounded"
              >
                Štart
              </button>
            ) : (
              <>
                <button
                  onClick={nextPartner}
                  disabled={!nextEnabled}
                  className="px-3 py-2 bg-red-600 rounded disabled:opacity-50"
                >
                  Ďalší
                </button>
                <button
                  onClick={reportPartner}
                  disabled={!partnerId || hasReported}
                  className="px-3 py-2 bg-orange-600 rounded disabled:opacity-50"
                >
                  Nahlásiť
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
