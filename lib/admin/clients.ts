import { prismaAdmin } from "@/lib/prisma-admin";

export async function claimLegacyClientsIfNeeded(userId: string) {
  const myClients = await prismaAdmin.client.count({ where: { ownerId: userId } });
  if (myClients > 0) return;

  const legacyClients = await prismaAdmin.client.findMany({
    where: { ownerId: null },
    select: { id: true },
  });
  if (legacyClients.length === 0) return;

  await prismaAdmin.client.updateMany({
    where: { ownerId: null },
    data: { ownerId: userId },
  });

  await prismaAdmin.clientUser.createMany({
    data: legacyClients.map((client) => ({
      clientId: client.id,
      userId,
      role: "OWNER",
    })),
    skipDuplicates: true,
  });
}
