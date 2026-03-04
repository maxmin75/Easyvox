import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireEasyVoxAdminUser } from "@/lib/api/admin";
import {
  getPurchaseEmailRuntimeSettings,
  sendPurchaseIntentEmail,
} from "@/lib/email/purchase";

export const runtime = "nodejs";

const schema = z.object({
  to: z.string().email(),
  customerName: z.string().min(1).max(120).optional(),
  message: z.string().max(1000).optional(),
});

export async function POST(request: NextRequest) {
  const { denied } = await requireEasyVoxAdminUser(request);
  if (denied) return denied;

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Payload non valido" }, { status: 400 });
  }

  const settings = await getPurchaseEmailRuntimeSettings();
  const sent = await sendPurchaseIntentEmail({
    settings,
    to: parsed.data.to,
    vars: {
      clientName: "EasyVox",
      assistantName: "EasyVox Assistant",
      customerName: parsed.data.customerName?.trim() || "Cliente test",
      customerEmail: parsed.data.to,
      customerPhone: "n/d",
      customerWebsite: "n/d",
      message: parsed.data.message?.trim() || "Messaggio test invio automatico acquisto",
      date: new Date().toLocaleString("it-IT"),
    },
  });

  if (!sent.sent) {
    return NextResponse.json({ error: sent.error ?? "Invio test fallito" }, { status: 400 });
  }

  return NextResponse.json({ ok: true, id: sent.id ?? null });
}
