import { db } from "@workspace/db";
import { notificationsTable } from "@workspace/db/schema";
import { getIO } from "./socket";

export async function createNotification(
  userId: number,
  type: string,
  title: string,
  message: string,
  opts?: { shipmentId?: number; link?: string }
) {
  try {
    const [notif] = await db.insert(notificationsTable).values({
      userId,
      type,
      title,
      message,
      shipmentId: opts?.shipmentId ?? null,
      link: opts?.link ?? null,
      isRead: false,
    }).returning();

    try {
      const io = getIO();
      if (io) io.emit("notification:new", { userId: notif.userId, id: notif.id });
    } catch {}

    return notif;
  } catch {
    // Non-fatal — never crashes the main request flow
  }
}
