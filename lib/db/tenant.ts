import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type TenantTx = Prisma.TransactionClient;

export async function withTenant<T>(
  clientId: string,
  fn: (tx: TenantTx) => Promise<T>,
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config('app.tenant_id', ${clientId}, true)`;
    return fn(tx);
  });
}
