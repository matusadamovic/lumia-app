"use client";

import {
  useEffect,
  useRef,
  useState,
  useCallback,
  type FormEvent,
} from "react";
import io from "socket.io-client";
import SimplePeer, { SignalData } from "simple-peer";
import { MdSend, MdSwipe, MdNavigateNext, MdOutlineLocalPolice } from "react-icons/md";
import requireAuth from "@/lib/requireAuth";
import { useSearchParams } from "next/navigation";

type MatchPayload = { otherId: string; initiator: boolean };

const ICE_SERVERS = [
  {
    urls:
      process.env.NEXT_PUBLIC_STUN_URL ?? "stun:stun.l.google.com:19302",
  },
  {
    urls:
      process.env.NEXT_PUBLIC_TURN_URL ?? "turn:openrelay.metered.ca:80",
    username:
      process.env.NEXT_PUBLIC_TURN_USERNAME ?? "openrelayproject",
    credential:
      process.env.NEXT_PUBLIC_TURN_CREDENTIAL ?? "openrelayproject",
  },
];

function ChatPage() {
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

  const [panelVisible, setPanelVisible] = useState(true);
  const hideTimer = useRef<NodeJS.Timeout | null>(null);

  const touchStartY = useRef<number | null>(null);
  const touchEndY = useRef<number | null>(null);

  const searchParams = useSearchParams();
  const filterCountry = searchParams?.get("country") || "";
  const filterGender  = searchParams?.get("gender")  || "";

  function showPanel(ms = 5000) {
    setPanelVisible(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setPanelVisible(false), ms);
  }

  /* ───── Socket setup ───── */
  function connectSocket() {
    setNextEnabled(false);
    const socket = io({
      path: "/api/socket",
      query: { country: filterCountry, gender: filterGender },
    });
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
    if (hideTimer.current) {
      clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }
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
      showPanel();
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

  function handleTouchStart(e: React.TouchEvent<HTMLDivElement>) {
    touchStartY.current = e.touches[0].clientY;
  }

  function handleTouchEnd(e: React.TouchEvent<HTMLDivElement>) {
    touchEndY.current = e.changedTouches[0].clientY;
    if (
      touchStartY.current !== null &&
      touchEndY.current !== null &&
      touchStartY.current - touchEndY.current > 50
    ) {
      e.preventDefault();
      nextPartner();
    } else {
      e.preventDefault();
      showPanel();
    }
    touchStartY.current = null;
    touchEndY.current = null;
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
      <div
        className="relative flex flex-col md:flex-row flex-1"
        onClick={() => showPanel()}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* partner video */}
        <div className="flex-1 relative bg-black overflow-hidden">
          <video
            ref={remoteVideoRef}
            autoPlay
            className="w-full h-full object-cover"
          />
          <div className="absolute bottom-2 right-2 text-white text-xs opacity-70 pointer-events-none select-none">
            LUMIA
          </div>
          <div className="absolute inset-0 flex items-center justify-center text-white text-sm bg-black/30 pointer-events-none">
            {status}
          </div>
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
            <div className="absolute inset-x-0 bottom-16 md:bottom-24 max-h-40 md:max-h-48 overflow-y-auto p-2 bg-transparent">
              {messages.map((m, i) => (
                <div key={i} className={m.self ? "text-right" : "text-left"}>
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
              className="absolute inset-x-0 bottom-0 flex gap-2 p-2 bg-transparent"
            >
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                className="flex-grow border border-white/30 rounded-full px-3 py-1 bg-transparent text-white placeholder-white/70"
                placeholder="Napíšte správu…"
              />
              <button
                type="submit"
                aria-label="Poslať"
                className="px-4 py-1 bg-white/20 text-white rounded hover:bg-white/30"
              >
                <MdSend />
              </button>
            </form>
          )}
        </div>

        {/* action panel */}
        <div
          className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 flex items-center gap-3 md:flex-col md:gap-2 bg-white/20 backdrop-blur-md border border-white/30 text-white px-4 py-2 rounded-2xl transition-opacity ${panelVisible ? "" : "opacity-0 pointer-events-none"}`}
        >
          {!started ? (
            <button
              onClick={handleStart}
              className="px-4 py-2 bg-white text-green-600 rounded-lg md:rounded"
            >
              Štart
            </button>
          ) : (
            <div className="flex gap-2 md:flex-col">
              <button
                onClick={nextPartner}
                disabled={!nextEnabled}
                aria-label="Ďalší"
                className="px-4 py-2 md:px-3 md:py-2 bg-red-500 md:bg-red-600 rounded-lg md:rounded disabled:opacity-50"
              >
                <MdSwipe className="block md:hidden" />
                <MdNavigateNext className="hidden md:block" />
              </button>
              <button
                onClick={reportPartner}
                disabled={!partnerId || hasReported}
                aria-label="Nahlásiť"
                className="px-4 py-2 md:px-3 md:py-2 bg-orange-400 md:bg-orange-600 rounded-lg md:rounded disabled:opacity-50"
              >
                <MdOutlineLocalPolice />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default requireAuth(ChatPage);

