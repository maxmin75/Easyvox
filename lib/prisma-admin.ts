import { PrismaClient } from "@prisma/client";

const globalForPrismaAdmin = globalThis as unknown as {
  prismaAdmin?: PrismaClient;
};

function createPrismaAdminClient() {
  const adminUrl = process.env.DATABASE_URL_ADMIN || process.env.DATABASE_URL;
  if (adminUrl) {
    return new PrismaClient({
      datasources: {
        db: {
          url: adminUrl,
        },
      },
      log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
    });
  }

  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
}

export const prismaAdmin = globalForPrismaAdmin.prismaAdmin ?? createPrismaAdminClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrismaAdmin.prismaAdmin = prismaAdmin;
}
