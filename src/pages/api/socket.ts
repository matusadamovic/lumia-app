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

  // Waiting groups by requested size. Key is group size and value is array of
  // full groups waiting for an opponent.
  const waitingGroups: Record<number, string[][]> = { 1: [], 2: [], 3: [] };
  // Currently forming groups (not yet full) by size.
  const buildingGroups: Record<number, string[]> = { 1: [], 2: [], 3: [] };

  // Map each socket to the ids it should connect to (opponent group).
  const opponents = new Map<string, string[]>();
  const reports = new Map<string, number>();
  const REPORT_THRESHOLD = 3;

  io.on("connection", (socket) => {
    console.log("🆕 spojenie:", socket.id);

    if ((reports.get(socket.id) ?? 0) >= REPORT_THRESHOLD) {
      console.log(`⛔ Blocked user attempted connection: ${socket.id}`);
      socket.disconnect();
      return;
    }

    // Desired group size sent by the client. Defaults to 1 (1v1).
    let size = Number(socket.handshake.auth?.size ?? 1);
    if (![1, 2, 3].includes(size)) size = 1;

    // Add user to the building group for the selected size.
    const group = buildingGroups[size];
    group.push(socket.id);
    if (group.length === size) {
      waitingGroups[size].push([...group]);
      buildingGroups[size] = [];
    }

    attemptMatch(size);

    socket.on("signal", ({ to, data }) =>
      io.to(to).emit("signal", { from: socket.id, data })
    );

    socket.on("chat-message", (msg: string) => {
      const opp = opponents.get(socket.id);
      if (opp) opp.forEach((id) => io.to(id).emit("chat-message", msg));
    });

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
        removeFromQueues(socket.id);

        const opp = opponents.get(socket.id);
        if (opp) {
          opp.forEach((id) => {
            const arr = opponents.get(id) ?? [];
            opponents.set(id, arr.filter((x) => x !== socket.id));
            io.to(id).emit("partner-left");
          });
          opponents.delete(socket.id);
        }

      console.log("❌ odpojenie:", socket.id);
    });
  });

  function attemptMatch(size: number) {
    const queue = waitingGroups[size];
    while (queue.length >= 2) {
      const groupA = queue.shift()!;
      const groupB = queue.shift()!;
      matchGroups(groupA, groupB);
    }
  }

  function matchGroups(a: string[], b: string[]) {
    a.forEach((id) => opponents.set(id, [...b]));
    b.forEach((id) => opponents.set(id, [...a]));
    a.forEach((id) =>
      io.to(id).emit("match", { peers: b, initiator: true })
    );
    b.forEach((id) =>
      io.to(id).emit("match", { peers: a, initiator: false })
    );
    console.log(`▶️ Párujem skupiny ${a.join(',')} ↔ ${b.join(',')}`);
  }

  function removeFromQueues(id: string) {
    [1, 2, 3].forEach((size) => {
      const building = buildingGroups[size];
      const bi = building.indexOf(id);
      if (bi !== -1) building.splice(bi, 1);
      const queue = waitingGroups[size];
      queue.forEach((g) => {
        const gi = g.indexOf(id);
        if (gi !== -1) g.splice(gi, 1);
      });
      waitingGroups[size] = queue.filter((g) => g.length > 0);
    });
  }

  res.end();
}
