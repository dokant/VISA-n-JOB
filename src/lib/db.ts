/**
 * Prisma client singleton (STANDARD 4.2 / 4.7).
 * P0c adds the `*Enc` auto-encryption extension here; all app code imports `db` from this file.
 * Recommendation / AuditLog are append-only (BR-09): never call update/delete/upsert on them.
 */
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const db: PrismaClient = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
