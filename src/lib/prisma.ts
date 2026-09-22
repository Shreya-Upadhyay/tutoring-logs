import { PrismaClient } from "@prisma/client";
import { resolveDatabaseUrl, MISSING_DB_URL_MESSAGE } from "@/lib/dbUrl";

// Reuse one client per serverless instance (and across dev hot-reloads).
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createClient(): PrismaClient {
  const url = resolveDatabaseUrl();
  if (!url) throw new Error(MISSING_DB_URL_MESSAGE);

  return new PrismaClient({
    // Passed explicitly so the app works whichever env var name the Vercel
    // Postgres / Neon integration used.
    datasources: { db: { url } },
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

function getClient(): PrismaClient {
  if (!globalForPrisma.prisma) globalForPrisma.prisma = createClient();
  return globalForPrisma.prisma;
}

// Lazy proxy: the client — and the connection-string check — is only created on
// first actual use. Importing this module during `next build` therefore does
// not require a reachable database.
export const prisma: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    const client = getClient();
    const value = Reflect.get(client as object, prop, client);
    return typeof value === "function" ? value.bind(client) : value;
  },
});
