import { Server as SocketIOServer } from "socket.io";
import { Server as HttpServer } from "http";
import { getLivePrices } from "./commodities";
import { db, shipmentsTable, investmentsTable, usersTable, transactionsTable } from "@workspace/db";
import { eq, and, lte } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { logger } from "./logger";
import { processGuildCommissions } from "./commission";
import { audit } from "./audit";

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

  // Auto-deliver shipments that have passed their arrival date — runs every hour.
  // Triggers full guild commission processing for every active investor.
  setInterval(async () => {
    try {
      const now = new Date();
      const overdueShipments = await db
        .select()
        .from(shipmentsTable)
        .where(and(eq(shipmentsTable.status, "in_transit"), lte(shipmentsTable.arrivalDate, now)));

      if (overdueShipments.length === 0) return;

      for (const shipment of overdueShipments) {
        logger.info({ shipmentId: shipment.id, title: shipment.title }, "Cron: auto-delivering overdue shipment");

        await db.update(shipmentsTable).set({ status: "delivered" }).where(eq(shipmentsTable.id, shipment.id));

        const investments = await db
          .select()
          .from(investmentsTable)
          .where(and(eq(investmentsTable.shipmentId, shipment.id), eq(investmentsTable.status, "active")));

        let totalInvestors = 0;
        let totalCommissions = 0;

        for (const inv of investments) {
          const profit = Number(inv.expectedProfit);
          const total = Number(inv.amount) + profit;

          await db.update(investmentsTable).set({
            status: "delivered",
            actualProfit: String(profit),
            deliveredAt: new Date(),
          }).where(eq(investmentsTable.id, inv.id));

          await db.update(usersTable).set({
            balance: sql`${usersTable.balance} + ${total}`,
            totalProfits: sql`${usersTable.totalProfits} + ${profit}`,
          }).where(eq(usersTable.id, inv.userId));

          await db.insert(transactionsTable).values({
            userId: inv.userId,
            type: "delivery_profit",
            amount: String(profit),
            status: "cleared",
            description: `Delivery profit: ${shipment.title}`,
            shipmentId: shipment.id,
          });

          const [investor] = await db.select().from(usersTable).where(eq(usersTable.id, inv.userId)).limit(1);
          const commResults = await processGuildCommissions(
            inv.userId,
            investor.traderId,
            profit,
            shipment.id,
            shipment.title,
            "cron",
          );

          totalInvestors++;
          totalCommissions += commResults.reduce((acc, c) => acc + c.commission, 0);

          audit({
            event: "cron_auto_delivery",
            detail: {
              shipmentId: shipment.id,
              title: shipment.title,
              investorId: inv.userId,
              investorTraderId: investor.traderId,
              profit,
              commissionsGenerated: commResults.length,
            },
          });
        }

        logger.info(
          { shipmentId: shipment.id, totalInvestors, totalCommissions },
          "Cron: auto-delivery complete",
        );

        // Notify connected clients
        if (io) {
          io.emit("shipment:delivered", {
            id: shipment.id,
            title: shipment.title,
            investorCount: totalInvestors,
          });
        }
      }
    } catch (err) {
      logger.error({ err }, "Cron: auto-delivery failed");
    }
  }, 60 * 60 * 1000);

  logger.info("Socket.io initialized");
  return io;
}

export function getIO(): SocketIOServer | null {
  return io;
}
