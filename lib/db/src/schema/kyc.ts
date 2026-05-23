import { pgTable, serial, timestamp, integer, text, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const kycSubmissionStatusEnum = pgEnum("kyc_submission_status", ["pending", "approved", "rejected"]);

export const kycTable = pgTable("kyc_submissions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  idDocumentUrl: text("id_document_url").notNull(),
  selfieUrl: text("selfie_url").notNull(),
  proofOfAddressUrl: text("proof_of_address_url"),
  status: kycSubmissionStatusEnum("status").notNull().default("pending"),
  rejectionReason: text("rejection_reason"),
  submittedAt: timestamp("submitted_at", { withTimezone: true }).notNull().defaultNow(),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
});

export const insertKycSchema = createInsertSchema(kycTable).omit({ id: true, submittedAt: true });
export type InsertKyc = z.infer<typeof insertKycSchema>;
export type KycSubmission = typeof kycTable.$inferSelect;
