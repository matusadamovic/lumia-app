import { NextApiRequest, NextApiResponse } from "next";
import { Server as IOServer } from "socket.io";
import type { Server as HttpServer } from "http";
import type { Socket as NetSocket } from "net";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export const config = { api: { bodyParser: false } };

type NextApiResponseServerIo = NextApiResponse & {
  socket: NetSocket & {
    server: HttpServer & { io?: IOServer };
  };
};

export default function handler(
  _req: NextApiRequest,
  res: NextApiResponseServerIo
) {
  // Reuse existing Socket.IO instance on hot-reload
  if (res.socket.server.io) {
    res.end();
    return;
  }

  const io = new IOServer(res.socket.server, { path: "/api/socket" });
  res.socket.server.io = io;

  type Filters = { country?: string; gender?: string };
  type WaitingUser = { id: string; filters: Filters };
  const waiting: WaitingUser[] = [];
  const pairs = new Map<string, string>();
  const reports = new Map<string, number>();
  const REPORT_THRESHOLD = 3;
  let onlineCount = 0;

  const matches = (a: Filters, b: Filters) => {
    if (a.country && b.country && a.country !== b.country) return false;
    if (a.gender && b.gender && a.gender !== b.gender) return false;
    return true;
  };

  io.on("connection", async (socket) => {
    onlineCount++;
    io.emit("online-count", onlineCount);
    console.log("🆕 spojenie:", socket.id);

    const purpose = socket.handshake.query.purpose;
    if (purpose === 'count') {
      socket.on('disconnect', () => {
        console.log("❌ odpojenie:", socket.id);
        onlineCount--;
        io.emit("online-count", onlineCount);
      });
      return;
    }

    try {
      const { data, error } = await supabase
        .from("user_reports")
        .select("count")
        .eq("id", socket.id)
        .maybeSingle();
      if (error) console.error("Error loading reports", error);
      const dbCount = data?.count ?? 0;
      reports.set(socket.id, dbCount);
      if (dbCount >= REPORT_THRESHOLD) {
        console.log(`⛔ Blocked user attempted connection: ${socket.id}`);
        socket.disconnect();
        return;
      }
    } catch (err) {
      console.error("DB check failed", err);
    }

    const filters: Filters = {
      country:
        typeof socket.handshake.query.country === "string"
          ? (socket.handshake.query.country as string)
          : undefined,
      gender:
        typeof socket.handshake.query.gender === "string"
          ? (socket.handshake.query.gender as string)
          : undefined,
    };

    const idx = waiting.findIndex((w) => matches(w.filters, filters));
    if (idx !== -1) {
      const w = waiting.splice(idx, 1)[0];
      io.to(socket.id).emit("match", { otherId: w.id, initiator: true });
      io.to(w.id).emit("match", { otherId: socket.id, initiator: false });
      console.log(`▶️ Párujem ${w.id} ↔ ${socket.id}`);
      pairs.set(socket.id, w.id);
      pairs.set(w.id, socket.id);
    } else {
      waiting.push({ id: socket.id, filters });
      console.log(`⌛ Čakám na ďalšieho používateľa… (${socket.id})`);
    }

    socket.on("signal", ({ to, data }) => io.to(to).emit("signal", data));

    socket.on("chat-message", (msg: string) => {
      const partner = pairs.get(socket.id);
      if (partner) io.to(partner).emit("chat-message", msg);
    });

    socket.on("report-user", async (id: string) => {
      let count = reports.get(id);
      if (count === undefined) {
        const { data, error } = await supabase
          .from("user_reports")
          .select("count")
          .eq("id", id)
          .maybeSingle();
        if (error) console.error("Error reading report", error);
        count = data?.count ?? 0;
      }
      count++;
      reports.set(id, count);
      console.log(`\uD83D\uDEA8 Report on ${id}: ${count}`);

      const { error: upsertError } = await supabase
        .from("user_reports")
        .upsert({ id, count });
      if (upsertError) console.error("Error updating report", upsertError);

      if (count >= REPORT_THRESHOLD) {
        const target = io.sockets.sockets.get(id);
        target?.disconnect(true);
        console.log(`\u26D4\uFE0F Disconnected ${id} due to reports`);
      }
    });

    socket.on("disconnect", () => {
      const idx = waiting.findIndex((w) => w.id === socket.id);
      if (idx !== -1) waiting.splice(idx, 1);

      const partner = pairs.get(socket.id);
      if (partner) {
        pairs.delete(socket.id);
        pairs.delete(partner);
        io.to(partner).emit("partner-left");
      }

      console.log("❌ odpojenie:", socket.id);
      onlineCount--;
      io.emit("online-count", onlineCount);
    });
  });

  res.end();
}
