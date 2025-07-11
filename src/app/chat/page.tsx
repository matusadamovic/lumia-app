"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import io from "socket.io-client";
import SimplePeer, { SignalData } from "simple-peer";
import {
  MdSend,
  MdSwipe,
  MdNavigateNext,
  MdOutlineLocalPolice,
  MdStop,
} from "react-icons/md";
import requireAuth from "@/lib/requireAuth";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion, Transition,  } from "framer-motion";

/* ──────────────────────────────────────────────── */
/*  Typy a konštanty                              */
/* ──────────────────────────────────────────────── */

type MatchPayload = { otherId: string; initiator: boolean };

const ICE_SERVERS = [
  {
    urls: process.env.NEXT_PUBLIC_STUN_URL ?? "stun:stun.l.google.com:19302",
  },
  {
    urls: process.env.NEXT_PUBLIC_TURN_URL ?? "turn:openrelay.metered.ca:80",
    username: process.env.NEXT_PUBLIC_TURN_USERNAME ?? "openrelayproject",
    credential: process.env.NEXT_PUBLIC_TURN_CREDENTIAL ?? "openrelayproject",
  },
];

type CardStage = "waiting" | "connected";
type Card = { id: number; stage: CardStage };

/* ──────────────────────────────────────────────── */
/*  Komponent jednej karty                        */
/* ──────────────────────────────────────────────── */

function SessionCard({
  stage,
  localVideoRef,
  remoteVideoRef,
  status,
  hasLocalVideo,
  messages,
  started,
  sendMessage,
  newMessage,
  setNewMessage,
}: {
  stage: CardStage;
  localVideoRef: React.RefObject<HTMLVideoElement | null>;
  remoteVideoRef: React.RefObject<HTMLVideoElement | null>;
  status: string;
  hasLocalVideo: boolean;
  messages: { self: boolean; text: string }[];
  started: boolean;
  sendMessage: (e: FormEvent) => void;
  newMessage: string;
  setNewMessage: (v: string) => void;
}) {
  return (
    <div className="relative flex flex-col h-full w-full">
      {/* partner video alebo waiting */}
      <div className="flex-1 relative bg-black overflow-hidden">
        <video
          ref={stage === "connected" ? remoteVideoRef : undefined}
          autoPlay
          className="w-full h-full object-cover"
        />

        <div className="absolute inset-0 flex items-center justify-center text-white text-sm bg-black/30 pointer-events-none">
          {stage === "waiting" ? "Čakám na partnera…" : status}
        </div>
      </div>

      {/* tvoje video */}
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
    </div>
  );
}

/* ──────────────────────────────────────────────── */
/*  Hlavný komponent                              */
/* ──────────────────────────────────────────────── */

function ChatPage() {
  /* refs na videá & streamy */
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  /* socket & peer refs */
  const peerRef = useRef<SimplePeer.Instance | null>(null);
  const socketRef = useRef<ReturnType<typeof io> | null>(null);

  /* UI stav */
  const [status, setStatus] = useState("Kliknite Štart pre povolenie kamery…");
  const [hasLocalVideo, setHasLocalVideo] = useState(true);
  const [nextEnabled, setNextEnabled] = useState(false);
  const [started, setStarted] = useState(false);
  const [partnerId, setPartnerId] = useState<string | null>(null);
  const [hasReported, setHasReported] = useState(false);
  const [messages, setMessages] = useState<{ self: boolean; text: string }[]>(
    []
  );
  const [newMessage, setNewMessage] = useState("");

  /* action-panel auto-hide */
  const [panelVisible, setPanelVisible] = useState(true);
  const hideTimer = useRef<NodeJS.Timeout | null>(null);
  function showPanel(ms = 5000) {
    setPanelVisible(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setPanelVisible(false), ms);
  }

  /* swipe gestá */
  const touchStartY = useRef<number | null>(null);
  const touchEndY = useRef<number | null>(null);

  /* filtre v URL */
  const searchParams = useSearchParams();
  const filterCountry = searchParams?.get("country") || "";
  const filterGender = searchParams?.get("gender") || "";

  const router = useRouter();

  /* ─────── TikTok scroll: pole kariet ─────── */
  const [cards, setCards] = useState<Card[]>([
    { id: Date.now(), stage: "waiting" },
  ]);

  /* ─────────────────────────────────────────── */
  /*  Socket setup                              */
  /* ─────────────────────────────────────────── */

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
      // prepni hornú kartu na "connected"
      setCards((c) =>
        c.map((card, i) =>
          i === c.length - 1 ? { ...card, stage: "connected" } : card
        )
      );
      startPeer(otherId, initiator);
      setNextEnabled(true);
    });

    socket.on("partner-left", () => {
      nextPartner();
    });

    socket.on("signal", (data: SignalData) =>
      peerRef.current?.signal(data)
    );
    socket.on("chat-message", (msg: string) =>
      setMessages((m) => [...m, { self: false, text: msg }])
    );
  }

  /* ─────────────────────────────────────────── */
  /*  Kamera                                   */
  /* ─────────────────────────────────────────── */

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

  /* ─────────────────────────────────────────── */
  /*  Čistenie                                  */
  /* ─────────────────────────────────────────── */

  function cleanupPeer() {
    peerRef.current?.destroy();
    socketRef.current?.disconnect();
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    setPartnerId(null);
    setHasReported(false);
    setMessages([]);
    setNewMessage("");
  }

  const cleanupFull = useCallback(() => {
    cleanupPeer();
    const ls = localVideoRef.current?.srcObject as MediaStream | null;
    ls?.getTracks().forEach((t) => t.stop());
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    localStreamRef.current = null;
    if (hideTimer.current) {
      clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }
    setMessages([]);
    setNewMessage("");
  }, []);

  useEffect(() => cleanupFull, [cleanupFull]);

  /* ─────────────────────────────────────────── */
  /*  Peer setup                                */
  /* ─────────────────────────────────────────── */

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

/*  tesne za definíciu attachLocalStream()  */
useEffect(() => {
  // keď pribudne/ubudne karta, ref ukazuje na nový <video>
  if (localVideoRef.current && localStreamRef.current) {
    attachLocalStream(localStreamRef.current);
  }
}, [cards]);          // spustí sa po každej zmene cards

  /* ─────────────────────────────────────────── */
  /*  UI Handlery                               */
  /* ─────────────────────────────────────────── */

function nextPartner() {
  cleanupPeer();
  connectSocket();

  /* reset UI stavov… */
  setStatus("Čakám na partnera…");
  setNextEnabled(false);
  setPartnerId(null);
  setHasReported(false);
  setMessages([]);
  setNewMessage("");

  /* ➊  NAMIETO push() => returnujeme nové pole iba s novou kartou   */
  setCards([{ id: Date.now(), stage: "waiting" }]);
}

  function handleStop() {
    cleanupFull();
    setStarted(false);
    router.push('/');
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

  /* ─────────────────────────────────────────── */
  /*  Render                                    */
  /* ─────────────────────────────────────────── */

  const transition: Transition = {
  duration: 0.45,
  ease: [0.42, 0, 0.58, 1],        // ekvivalent ‘ease-in-out’
};

  return (
    <div className="relative h-screen w-full overflow-hidden">
      {/* Swipe oblast */}
      <div
        className="absolute inset-0"
        onClick={() => showPanel()}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
<AnimatePresence mode="sync" initial={false}>
  {cards.map((card, idx) => {
    const isTop = idx === cards.length - 1;

    return (
      <motion.div
        key={card.id}
        className="absolute inset-0"
        style={{ zIndex: isTop ? 2 : 1 }}   /* nová karta navrchu */

        initial={{ y: "100%", opacity: 1 }} /* prichádza zospodu   */
        animate={{ y: 0,       opacity: 1 }} /* usadí sa            */
        exit={{    y: "-100%",  opacity: 0 }} /* stará letí hore     */

        transition={transition}
      >
                <SessionCard
                  stage={card.stage}
                  localVideoRef={localVideoRef}
                  remoteVideoRef={remoteVideoRef}
                  status={status}
                  hasLocalVideo={hasLocalVideo}
                  messages={messages}
                  started={started}
                  sendMessage={sendMessage}
                  newMessage={newMessage}
                  setNewMessage={setNewMessage}
                />
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* action panel (štart / next / report) */}
      <div
        className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 flex items-center gap-3 md:flex-col md:gap-2 bg-white/20 backdrop-blur-md border border-white/30 text-white px-4 py-2 rounded-2xl transition-opacity ${
          panelVisible ? "" : "opacity-0 pointer-events-none"
        }`}
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
            <button
              onClick={handleStop}
              aria-label="Ukončiť"
              className="px-4 py-2 md:px-3 md:py-2 bg-blue-500 md:bg-blue-600 rounded-lg md:rounded"
            >
              <MdStop />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default requireAuth(ChatPage);
