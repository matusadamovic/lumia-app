import { NextApiRequest, NextApiResponse } from "next";
import { Server as IOServer } from "socket.io";
import type { Server as HttpServer } from "http";
import type { Socket as NetSocket } from "net";

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

  let waiting: string | null = null;
  const pairs = new Map<string, string>();
  const reports = new Map<string, number>();
  const REPORT_THRESHOLD = 3;

  io.on("connection", (socket) => {
    console.log("🆕 spojenie:", socket.id);

    if ((reports.get(socket.id) ?? 0) >= REPORT_THRESHOLD) {
      console.log(`⛔ Blocked user attempted connection: ${socket.id}`);
      socket.disconnect();
      return;
    }

    if (waiting) {
      // máme čakača – spojme ich
      io.to(socket.id).emit("match", { otherId: waiting, initiator: true });
      io.to(waiting).emit("match", { otherId: socket.id, initiator: false });
      console.log(`▶️ Párujem ${waiting} ↔ ${socket.id}`);
      pairs.set(socket.id, waiting);
      pairs.set(waiting, socket.id);
      waiting = null;
    } else {
      waiting = socket.id;
      console.log(`⌛ Čakám na ďalšieho používateľa… (${waiting})`);
    }

    socket.on("signal", ({ to, data }) => io.to(to).emit("signal", data));

    socket.on("report-user", (id: string) => {
      const count = (reports.get(id) ?? 0) + 1;
      reports.set(id, count);
      console.log(`\uD83D\uDEA8 Report on ${id}: ${count}`);

      if (count >= REPORT_THRESHOLD) {
        const target = io.sockets.sockets.get(id);
        target?.disconnect(true);
        console.log(`\u26D4\uFE0F Disconnected ${id} due to reports`);
      }
    });

    socket.on("disconnect", () => {
      if (waiting === socket.id) waiting = null;

      const partner = pairs.get(socket.id);
      if (partner) {
        pairs.delete(socket.id);
        pairs.delete(partner);
        io.to(partner).emit("partner-left");
      }

      console.log("❌ odpojenie:", socket.id);
    });
  });

  res.end();
}
