import type { CrmEventType, Prisma } from "@prisma/client";

type TrackCrmEventInput = {
  clientId: string;
  customerId?: string | null;
  sessionId?: string | null;
  type: CrmEventType;
  title: string;
  description?: string | null;
  payload?: Prisma.InputJsonValue | null;
  occurredAt?: Date;
};

export async function trackCrmEvent(
  tx: Prisma.TransactionClient,
  input: TrackCrmEventInput,
) {
  return tx.crmEvent.create({
    data: {
      clientId: input.clientId,
      customerId: input.customerId ?? null,
      sessionId: input.sessionId ?? null,
      type: input.type,
      title: input.title,
      description: input.description ?? null,
      payload: input.payload ?? undefined,
      occurredAt: input.occurredAt ?? new Date(),
    },
  });
}
