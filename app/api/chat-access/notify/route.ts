import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { sendChatAccessNotificationEmail } from "@/lib/email/chat-access";
import { resolveTenantFromRequest } from "@/lib/tenant-users";

export const runtime = "nodejs";

const schema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().email().max(190),
});

export async function POST(request: NextRequest) {
  const tenant = await resolveTenantFromRequest(request);
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Payload non valido" }, { status: 400 });
  }

  const result = await sendChatAccessNotificationEmail({
    customerName: parsed.data.name.trim(),
    customerEmail: parsed.data.email.trim().toLowerCase(),
    accessedAt: new Date(),
    tenantSlug: tenant?.slug ?? null,
    source: "profile",
  });

  if (!result.sent) {
    return NextResponse.json({ ok: false, error: result.error ?? "Invio email fallito" }, { status: 400 });
  }

  return NextResponse.json({ ok: true, id: result.id ?? null });
}
