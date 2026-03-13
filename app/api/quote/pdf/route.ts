import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getPurchaseEmailRuntimeSettings } from "@/lib/email/purchase";
import { sendQuoteEmails } from "@/lib/email/quote";
import { withTenant } from "@/lib/db/tenant";
import { prisma } from "@/lib/prisma";
import {
  buildQuotePdf,
  buildQuoteSummary,
  calculateQuoteAmounts,
  type QuoteAiType,
  type QuoteSupportType,
  type QuoteTrainingType,
} from "@/lib/quote-pdf";

export const runtime = "nodejs";

const schema = z.object({
  name: z.string().trim().min(1).max(120),
  company: z.string().trim().min(1).max(160),
  city: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(190),
  phone: z.string().trim().min(5).max(40),
  sessionId: z.string().trim().min(3).max(120).optional(),
  support: z.enum(["istanza", "server", "macchina locale"] satisfies [QuoteSupportType, ...QuoteSupportType[]]),
  aiType: z.enum(["primum open source"] satisfies [QuoteAiType]),
  training: z.enum(["soft", "medium", "enterprise"] satisfies [QuoteTrainingType, ...QuoteTrainingType[]]),
  customizations: z.string().trim().max(1000).optional(),
});

function fileName(company: string): string {
  const normalized = company
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return `preventivo-easyvox-${normalized || "cliente"}.pdf`;
}

export async function POST(request: NextRequest) {
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
    const demoClient = await prisma.client.findUnique({
      where: { slug: "demo" },
      select: { id: true },
    });
    clientId = demoClient?.id ?? null;
  }
  if (!clientId) {
    return NextResponse.json({ error: "clientId mancante" }, { status: 400 });
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Payload non valido", details: parsed.error.flatten() }, { status: 400 });
  }

  const payload = {
    ...parsed.data,
    customizations: parsed.data.customizations ?? null,
  };
  const pdfBytes = await buildQuotePdf(payload);
  const generatedFileName = fileName(parsed.data.company);
  const emailSettings = await getPurchaseEmailRuntimeSettings();
  const emailResults = await sendQuoteEmails({
    settings: emailSettings,
    payload,
    pdfBytes,
    fileName: generatedFileName,
  });
  const failedEmails = emailResults.filter((result) => !result.sent);
  const amounts = calculateQuoteAmounts(payload);
  const summary = buildQuoteSummary(payload);

  const quote = await withTenant(clientId, (tx) =>
    tx.quote.create({
      data: {
        clientId,
        sessionId: parsed.data.sessionId?.trim() || null,
        customerName: parsed.data.name.trim(),
        company: parsed.data.company.trim(),
        city: parsed.data.city.trim(),
        email: parsed.data.email.trim().toLowerCase(),
        phone: parsed.data.phone.trim(),
        support: parsed.data.support,
        aiType: parsed.data.aiType,
        training: parsed.data.training,
        customizations: parsed.data.customizations?.trim() || null,
        setupInitial: amounts.setupInitial,
        monthlyCost: amounts.monthly,
        trainingCost: amounts.training,
        emailSentToCustomer: emailResults.some(
          (result) => result.sent && result.to === parsed.data.email.trim().toLowerCase(),
        ),
        emailSentToInternal: emailResults.some(
          (result) => result.sent && result.to === "gianluca.pistorello@gmail.com",
        ),
        emailError: failedEmails.length > 0 ? failedEmails.map((item) => `${item.to}: ${item.error}`).join(" | ") : null,
      },
      select: {
        id: true,
        createdAt: true,
      },
    }),
  );

  return new NextResponse(Buffer.from(pdfBytes), {
    status: 200,
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `attachment; filename="${generatedFileName}"`,
      "cache-control": "no-store",
      "x-easyvox-quote-id": quote.id,
      "x-easyvox-quote-summary": encodeURIComponent(summary),
      "x-easyvox-email-warning":
        failedEmails.length > 0
          ? encodeURIComponent(failedEmails.map((item) => `${item.to}: ${item.error}`).join(" | "))
          : "",
    },
  });
}
