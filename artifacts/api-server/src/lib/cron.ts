import cron from "node-cron";
import { db, shipmentsTable, investmentsTable, usersTable, transactionsTable } from "@workspace/db";
import { eq, and, lte } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { logger } from "./logger";

export function startCronJobs() {
  // Check for arrived shipments daily at midnight
  cron.schedule("0 0 * * *", async () => {
    logger.info("Cron: checking for arrived shipments");
    try {
      const now = new Date();
      const transitShipments = await db.select().from(shipmentsTable).where(
        and(
          eq(shipmentsTable.status, "in_transit"),
          lte(shipmentsTable.arrivalDate, now)
        )
      );

      for (const shipment of transitShipments) {
        logger.info({ shipmentId: shipment.id }, "Auto-delivering shipment");
        await db.update(shipmentsTable).set({ status: "delivered" }).where(eq(shipmentsTable.id, shipment.id));

        const investments = await db.select().from(investmentsTable)
          .where(and(eq(investmentsTable.shipmentId, shipment.id), eq(investmentsTable.status, "active")));

        for (const inv of investments) {
          const profit = Number(inv.expectedProfit);
          const total = Number(inv.amount) + profit;

          await db.update(investmentsTable).set({
            status: "delivered",
            actualProfit: String(profit),
            deliveredAt: now,
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
            description: `Auto-delivery profit: ${shipment.title}`,
            shipmentId: shipment.id,
          });
        }
        logger.info({ shipmentId: shipment.id, investorCount: investments.length }, "Shipment delivered, profits credited");
      }
    } catch (err) {
      logger.error({ err }, "Cron delivery error");
    }
  });

  // Update funded shipments to in_transit when departure date passes
  cron.schedule("*/30 * * * *", async () => {
    try {
      const now = new Date();
      const funded = await db.select().from(shipmentsTable).where(
        and(eq(shipmentsTable.status, "funded"), lte(shipmentsTable.departureDate, now))
      );
      for (const s of funded) {
        await db.update(shipmentsTable).set({ status: "in_transit" }).where(eq(shipmentsTable.id, s.id));
        logger.info({ shipmentId: s.id }, "Shipment moved to in_transit");
      }
    } catch (err) {
      logger.error({ err }, "Cron in_transit error");
    }
  });

  logger.info("Cron jobs started");
}
