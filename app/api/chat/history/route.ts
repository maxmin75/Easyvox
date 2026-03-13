import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withTenant } from "@/lib/db/tenant";
import { getAuthUserFromRequest } from "@/lib/auth";
import { getTenantAccess } from "@/lib/tenant-users";
import { jsonError } from "@/lib/api/errors";
import { sanitizeChatText } from "@/lib/chat-text";

export const runtime = "nodejs";

const querySchema = z.object({
  sessionId: z.string().min(3).max(120),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

export async function GET(request: NextRequest) {
  const authUser = await getAuthUserFromRequest(request);
  const parsed = querySchema.safeParse({
    sessionId: request.nextUrl.searchParams.get("sessionId") ?? undefined,
    limit: request.nextUrl.searchParams.get("limit") ?? undefined,
  });
  if (!parsed.success) return jsonError("Query non valida", 400);

  let clientId = request.headers.get("x-client-id");
  const clientSlug = request.headers.get("x-client-slug")?.trim().toLowerCase() ?? "";

  if (!clientId && clientSlug) {
    const bySlug = await prisma.client.findUnique({
      where: { slug: clientSlug },
      select: { id: true },
    });
    clientId = bySlug?.id ?? null;
  }

  if (!clientId) {
    if (authUser) {
      const defaultClient = await prisma.client.findFirst({
        where: { ownerId: authUser.id },
        orderBy: { createdAt: "asc" },
        select: { id: true },
      });
      clientId = defaultClient?.id ?? null;
    }
  }

  if (!clientId) {
    return NextResponse.json({
      messages: [],
      assistantName: "Assistant",
    });
  }

  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: {
      id: true,
      assistantName: true,
      requireUserAuthForChat: true,
      isSuspended: true,
    },
  });
  if (!client) return jsonError("Tenant non trovato", 404);
  if (client.isSuspended) return jsonError("Tenant sospeso. Cronologia chat non disponibile.", 423);

  const access = authUser ? await getTenantAccess(client.id, authUser.id) : null;
  const hasTenantAccess = access?.hasAccess ?? false;
  let authorizedCustomerIds: string[] | null = null;

  if (client.requireUserAuthForChat && !authUser) {
    return jsonError("Accesso richiesto: effettua login con email e password.", 401);
  }
  if (client.requireUserAuthForChat && !hasTenantAccess) {
    return jsonError("Non autorizzato per questo tenant.", 403);
  }
  if (client.requireUserAuthForChat && !authUser?.email) {
    return jsonError("Account chat non valido: email mancante.", 403);
  }
  if (client.requireUserAuthForChat && authUser?.email) {
    const customers = await withTenant(client.id, (tx) =>
      tx.chatCustomer.findMany({
        where: {
          clientId: client.id,
          email: authUser.email.trim().toLowerCase(),
        },
        select: { id: true },
      }),
    );
    authorizedCustomerIds = customers.map((customer) => customer.id);
    if (authorizedCustomerIds.length === 0) {
      return NextResponse.json({
        messages: [],
        assistantName: client.assistantName ?? "Assistant",
      });
    }
  }

  const rows = await withTenant(client.id, (tx) =>
    tx.conversation.findMany({
      where: {
        clientId: client.id,
        sessionId: parsed.data.sessionId,
        ...(authorizedCustomerIds ? { customerId: { in: authorizedCustomerIds } } : {}),
      },
      orderBy: { createdAt: "asc" },
      take: parsed.data.limit ?? 60,
      select: {
        id: true,
        userMessage: true,
        assistantMessage: true,
        createdAt: true,
      },
    }),
  );

  const quotes = await withTenant(client.id, (tx) =>
    tx.quote.findMany({
      where: { clientId: client.id, sessionId: parsed.data.sessionId },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        company: true,
        customerName: true,
        city: true,
        email: true,
        phone: true,
        support: true,
        aiType: true,
        training: true,
        customizations: true,
        setupInitial: true,
        monthlyCost: true,
        trainingCost: true,
        createdAt: true,
      },
    }),
  );
  const hasAuthorizedConversation = rows.length > 0;

  const messages = [
    ...rows.flatMap((row) => [
      {
        id: `${row.id}-u`,
        role: "user" as const,
        kind: "text" as const,
        text: row.userMessage,
        createdAt: row.createdAt.toISOString(),
        sortAt: row.createdAt.toISOString(),
      },
      {
        id: `${row.id}-a`,
        role: "assistant" as const,
        kind: "text" as const,
        text: sanitizeChatText(row.assistantMessage),
        createdAt: row.createdAt.toISOString(),
        sortAt: row.createdAt.toISOString(),
      },
    ]),
    ...(hasAuthorizedConversation ? quotes : []).map((quote) => ({
      id: `${quote.id}-q`,
      role: "assistant" as const,
      kind: "quote" as const,
      text: [
        `Preventivo EasyVox per ${quote.company}`,
        `Nome: ${quote.customerName}`,
        `Citta: ${quote.city}`,
        `Email: ${quote.email}`,
        `Telefono: ${quote.phone}`,
        `Supporto: ${quote.support}`,
        `Tipologia AI: ${quote.aiType}`,
        `Addestramento: ${quote.training}`,
        `Setup iniziale Start & Go: EUR ${quote.setupInitial}`,
        quote.monthlyCost > 0
          ? `Canone mensile: EUR ${quote.monthlyCost} / mese`
          : "Canone mensile: macchina locale del cliente",
        `Addestramento AI: EUR ${quote.trainingCost}`,
        `Customizzazione: ${quote.customizations || "su richiesta"}`,
      ].join("\n"),
      createdAt: quote.createdAt.toISOString(),
      sortAt: quote.createdAt.toISOString(),
    })),
  ]
    .sort((a, b) => a.sortAt.localeCompare(b.sortAt))
    .map((entry) => ({
      id: entry.id,
      role: entry.role,
      kind: entry.kind,
      text: entry.text,
    }));

  return NextResponse.json({
    messages,
    assistantName: client.assistantName ?? "Assistant",
  });
}
