import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prismaAdmin } from "@/lib/prisma-admin";
import { requireEasyVoxAdminUser } from "@/lib/api/admin";
import {
  DEFAULT_PURCHASE_EMAIL_BODY,
  DEFAULT_PURCHASE_EMAIL_SUBJECT,
  parseKeywords,
} from "@/lib/email/purchase";

export const runtime = "nodejs";

const updateSchema = z.object({
  purchaseEmailEnabled: z.boolean().optional(),
  resendApiKey: z.string().min(20).optional(),
  clearResendApiKey: z.boolean().optional(),
  purchaseEmailFrom: z.string().email().optional(),
  purchaseEmailReplyTo: z.string().email().optional(),
  clearPurchaseEmailReplyTo: z.boolean().optional(),
  purchaseEmailSubjectTemplate: z.string().min(3).max(300).optional(),
  purchaseEmailBodyTemplate: z.string().min(10).max(8000).optional(),
  purchaseIntentKeywords: z.string().max(500).optional(),
});

export async function GET(request: NextRequest) {
  const { denied } = await requireEasyVoxAdminUser(request);
  if (denied) return denied;

  const setting = await prismaAdmin.appSetting.findUnique({
    where: { singleton: "default" },
    select: {
      purchaseEmailEnabled: true,
      resendApiKey: true,
      purchaseEmailFrom: true,
      purchaseEmailReplyTo: true,
      purchaseEmailSubjectTemplate: true,
      purchaseEmailBodyTemplate: true,
      purchaseIntentKeywords: true,
    },
  });

  const keywords = parseKeywords(setting?.purchaseIntentKeywords).join(", ");

  return NextResponse.json({
    settings: {
      purchaseEmailEnabled: setting?.purchaseEmailEnabled ?? false,
      hasResendApiKey: Boolean(process.env.RESEND_API_KEY || setting?.resendApiKey),
      purchaseEmailFrom: process.env.PURCHASE_EMAIL_FROM ?? setting?.purchaseEmailFrom ?? "",
      purchaseEmailReplyTo: setting?.purchaseEmailReplyTo ?? "",
      purchaseEmailSubjectTemplate:
        setting?.purchaseEmailSubjectTemplate ?? DEFAULT_PURCHASE_EMAIL_SUBJECT,
      purchaseEmailBodyTemplate: setting?.purchaseEmailBodyTemplate ?? DEFAULT_PURCHASE_EMAIL_BODY,
      purchaseIntentKeywords: keywords,
    },
    envOverrides: {
      resendApiKey: Boolean(process.env.RESEND_API_KEY),
      purchaseEmailFrom: Boolean(process.env.PURCHASE_EMAIL_FROM),
    },
  });
}

export async function PUT(request: NextRequest) {
  const { denied } = await requireEasyVoxAdminUser(request);
  if (denied) return denied;

  const parsed = updateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Payload non valido" }, { status: 400 });
  }

  const data = parsed.data;

  await prismaAdmin.appSetting.upsert({
    where: { singleton: "default" },
    create: {
      singleton: "default",
      purchaseEmailEnabled: data.purchaseEmailEnabled ?? false,
      resendApiKey: data.clearResendApiKey ? null : (data.resendApiKey ?? null),
      purchaseEmailFrom: data.purchaseEmailFrom ?? null,
      purchaseEmailReplyTo: data.clearPurchaseEmailReplyTo ? null : (data.purchaseEmailReplyTo ?? null),
      purchaseEmailSubjectTemplate: data.purchaseEmailSubjectTemplate ?? DEFAULT_PURCHASE_EMAIL_SUBJECT,
      purchaseEmailBodyTemplate: data.purchaseEmailBodyTemplate ?? DEFAULT_PURCHASE_EMAIL_BODY,
      purchaseIntentKeywords: data.purchaseIntentKeywords ?? null,
    },
    update: {
      ...(data.purchaseEmailEnabled != null
        ? { purchaseEmailEnabled: data.purchaseEmailEnabled }
        : {}),
      ...(data.resendApiKey ? { resendApiKey: data.resendApiKey } : {}),
      ...(data.clearResendApiKey ? { resendApiKey: null } : {}),
      ...(data.purchaseEmailFrom ? { purchaseEmailFrom: data.purchaseEmailFrom } : {}),
      ...(data.purchaseEmailReplyTo ? { purchaseEmailReplyTo: data.purchaseEmailReplyTo } : {}),
      ...(data.clearPurchaseEmailReplyTo ? { purchaseEmailReplyTo: null } : {}),
      ...(data.purchaseEmailSubjectTemplate
        ? { purchaseEmailSubjectTemplate: data.purchaseEmailSubjectTemplate }
        : {}),
      ...(data.purchaseEmailBodyTemplate
        ? { purchaseEmailBodyTemplate: data.purchaseEmailBodyTemplate }
        : {}),
      ...(data.purchaseIntentKeywords ? { purchaseIntentKeywords: data.purchaseIntentKeywords } : {}),
    },
  });

  const setting = await prismaAdmin.appSetting.findUnique({
    where: { singleton: "default" },
    select: {
      purchaseEmailEnabled: true,
      resendApiKey: true,
      purchaseEmailFrom: true,
      purchaseEmailReplyTo: true,
      purchaseEmailSubjectTemplate: true,
      purchaseEmailBodyTemplate: true,
      purchaseIntentKeywords: true,
    },
  });

  return NextResponse.json({
    ok: true,
    settings: {
      purchaseEmailEnabled: setting?.purchaseEmailEnabled ?? false,
      hasResendApiKey: Boolean(process.env.RESEND_API_KEY || setting?.resendApiKey),
      purchaseEmailFrom: process.env.PURCHASE_EMAIL_FROM ?? setting?.purchaseEmailFrom ?? "",
      purchaseEmailReplyTo: setting?.purchaseEmailReplyTo ?? "",
      purchaseEmailSubjectTemplate:
        setting?.purchaseEmailSubjectTemplate ?? DEFAULT_PURCHASE_EMAIL_SUBJECT,
      purchaseEmailBodyTemplate: setting?.purchaseEmailBodyTemplate ?? DEFAULT_PURCHASE_EMAIL_BODY,
      purchaseIntentKeywords: parseKeywords(setting?.purchaseIntentKeywords).join(", "),
    },
    envOverrides: {
      resendApiKey: Boolean(process.env.RESEND_API_KEY),
      purchaseEmailFrom: Boolean(process.env.PURCHASE_EMAIL_FROM),
    },
  });
}
