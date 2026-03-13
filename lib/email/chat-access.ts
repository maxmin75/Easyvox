import { EASYVOX_ADMIN_EMAIL } from "@/lib/admin/access";
import { prisma } from "@/lib/prisma";

type ChatAccessEmailSettings = {
  resendApiKey: string | null;
  from: string | null;
  replyTo: string | null;
  to: string;
};

async function getChatAccessEmailSettings(): Promise<ChatAccessEmailSettings> {
  const setting = await prisma.appSetting.findUnique({
    where: { singleton: "default" },
    select: {
      resendApiKey: true,
      purchaseEmailFrom: true,
      purchaseEmailReplyTo: true,
    },
  });

  return {
    resendApiKey: process.env.RESEND_API_KEY ?? setting?.resendApiKey ?? null,
    from: process.env.PURCHASE_EMAIL_FROM ?? setting?.purchaseEmailFrom ?? null,
    replyTo: setting?.purchaseEmailReplyTo ?? null,
    to: process.env.CHAT_ACCESS_NOTIFICATION_TO?.trim().toLowerCase() || EASYVOX_ADMIN_EMAIL,
  };
}

export async function sendChatAccessNotificationEmail(args: {
  customerName: string;
  customerEmail: string;
  accessedAt?: Date;
  tenantSlug?: string | null;
  source: "profile" | "login" | "register";
}): Promise<{ sent: boolean; id?: string; error?: string }> {
  const settings = await getChatAccessEmailSettings();
  if (!settings.resendApiKey) {
    return { sent: false, error: "Resend API key mancante" };
  }
  if (!settings.from) {
    return { sent: false, error: "Email mittente mancante" };
  }

  const accessedAt = args.accessedAt ?? new Date();
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${settings.resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: settings.from,
      to: [settings.to],
      subject: "Nuovo accesso chat EasyVox",
      text: [
        "Nuovo accesso alla chat EasyVox.",
        "",
        `Nome: ${args.customerName}`,
        `Email: ${args.customerEmail}`,
        `Data accesso: ${accessedAt.toLocaleString("it-IT")}`,
        `Canale accesso: ${args.source}`,
        `Tenant: ${args.tenantSlug?.trim() || "n/d"}`,
      ].join("\n"),
      reply_to: settings.replyTo || undefined,
    }),
  });

  const data = (await response.json().catch(() => null)) as { id?: string; message?: string } | null;
  if (!response.ok) {
    return { sent: false, error: data?.message ?? `Errore invio email (${response.status})` };
  }

  return { sent: true, id: data?.id };
}
