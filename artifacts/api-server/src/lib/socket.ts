import { Server as SocketIOServer } from "socket.io";
import { Server as HttpServer } from "http";
import { getLivePrices } from "./commodities";
import { db, shipmentsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "./logger";

let io: SocketIOServer | null = null;

export function initSocket(httpServer: HttpServer): SocketIOServer {
  io = new SocketIOServer(httpServer, {
    cors: { origin: "*", methods: ["GET", "POST"] },
    path: "/api/socket.io",
  });

  io.on("connection", (socket) => {
    logger.info({ socketId: socket.id }, "Client connected");
    socket.on("disconnect", () => {
      logger.info({ socketId: socket.id }, "Client disconnected");
    });
  });

  // Broadcast commodity prices every 3 seconds
  setInterval(() => {
    if (!io) return;
    io.emit("commodity:prices", getLivePrices());
  }, 3000);

  // Broadcast active shipment positions every 15 seconds
  setInterval(async () => {
    if (!io) return;
    try {
      const shipments = await db
        .select()
        .from(shipmentsTable)
        .where(eq(shipmentsTable.status, "in_transit"));

      const now = Date.now();
      const positions = shipments.map((s) => {
        const dep = new Date(s.departureDate).getTime();
        const arr = new Date(s.arrivalDate).getTime();
        const total = arr - dep;
        const elapsed = now - dep;
        const progressPercent = total > 0 ? Math.min(100, Math.max(0, (elapsed / total) * 100)) : 0;
        return {
          id: s.id,
          title: s.title,
          status: s.status,
          origin: s.origin,
          destination: s.destination,
          progressPercent: Math.round(progressPercent * 10) / 10,
        };
      });

      io.emit("tracker:positions", positions);
    } catch (err) {
      logger.error({ err }, "Failed to broadcast tracker positions");
    }
  }, 15000);

  logger.info("Socket.io initialized");
  return io;
}

export function getIO(): SocketIOServer | null {
  return io;
}
