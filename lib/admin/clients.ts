import { prismaAdmin } from "@/lib/prisma-admin";

export async function claimLegacyClientsIfNeeded(userId: string) {
  const myClients = await prismaAdmin.client.count({ where: { ownerId: userId } });
  if (myClients > 0) return;

  await prismaAdmin.client.updateMany({
    where: { ownerId: null },
    data: { ownerId: userId },
  });
}
