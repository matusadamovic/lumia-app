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

  io.on("connection", (socket) => {
    console.log("🆕 spojenie:", socket.id);

    if (waiting) {
      // máme čakača – spojme ich
      io.to(socket.id).emit("match", { otherId: waiting, initiator: true });
      io.to(waiting).emit("match", { otherId: socket.id, initiator: false });
      console.log(`▶️ Párujem ${waiting} ↔ ${socket.id}`);
      waiting = null;
    } else {
      waiting = socket.id;
      console.log(`⌛ Čakám na ďalšieho používateľa… (${waiting})`);
    }

    socket.on("signal", ({ to, data }) => io.to(to).emit("signal", data));

    socket.on("disconnect", () => {
      if (waiting === socket.id) waiting = null;
      console.log("❌ odpojenie:", socket.id);
    });
  });

  res.end();
}
