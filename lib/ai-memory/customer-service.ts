import type { Prisma } from "@prisma/client";
import { normalizeCustomerName } from "@/lib/ai-memory/utils";

type ResolveCustomerInput = {
  clientId: string;
  sessionId: string;
  customerName?: string | null;
  customerEmail?: string | null;
};

export async function resolveCustomer(
  tx: Prisma.TransactionClient,
  input: ResolveCustomerInput,
) {
  const email = input.customerEmail?.trim().toLowerCase() ?? null;
  const normalizedName = input.customerName ? normalizeCustomerName(input.customerName) : null;

  let customer =
    (email
      ? await tx.chatCustomer.findFirst({
          where: { clientId: input.clientId, email },
        })
      : null) ??
    (normalizedName
      ? await tx.chatCustomer.findUnique({
          where: {
            clientId_normalizedName: {
              clientId: input.clientId,
              normalizedName,
            },
          },
        })
      : null);

  if (!customer && !normalizedName) {
    return null;
  }

  if (!customer) {
    customer = await tx.chatCustomer.create({
      data: {
        clientId: input.clientId,
        name: input.customerName!.trim(),
        normalizedName: normalizedName!,
        email,
        lastSessionId: input.sessionId,
      },
    });
  } else {
    customer = await tx.chatCustomer.update({
      where: { id: customer.id },
      data: {
        name: input.customerName?.trim() || customer.name,
        email: email ?? customer.email,
        lastSessionId: input.sessionId,
      },
    });
  }

  return customer;
}
