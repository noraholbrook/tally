import path from "path";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "@prisma/client";

// Strip the "file:" prefix that Prisma uses in DATABASE_URL for SQLite,
// then resolve to an absolute path so it works regardless of cwd.
const dbUrl = process.env.DATABASE_URL ?? "file:./prisma/dev.db";
const dbPath = path.resolve(process.cwd(), dbUrl.replace(/^file:/, ""));

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

function createPrismaClient(): PrismaClient {
  const adapter = new PrismaBetterSqlite3({ url: dbPath });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

// Demo user ID — in a real app this comes from the auth session
export const DEMO_USER_ID = "demo-user";
