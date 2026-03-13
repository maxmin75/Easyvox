import { EASYVOX_ADMIN_EMAIL } from "@/lib/admin/access";
import { prisma } from "@/lib/prisma";

const DEFAULT_REGISTRATION_NOTIFICATION_TO = "gianluca.pistorello@gmail.com";

type UserRegistrationEmailSettings = {
  resendApiKey: string | null;
  from: string | null;
  replyTo: string | null;
  to: string;
};

async function getUserRegistrationEmailSettings(): Promise<UserRegistrationEmailSettings> {
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
    to:
      process.env.REGISTRATION_NOTIFICATION_TO?.trim().toLowerCase() ||
      process.env.CHAT_ACCESS_NOTIFICATION_TO?.trim().toLowerCase() ||
      EASYVOX_ADMIN_EMAIL ||
      DEFAULT_REGISTRATION_NOTIFICATION_TO,
  };
}

export async function sendUserRegistrationNotificationEmail(args: {
  registeredName: string;
  registeredEmail: string;
  registeredAt: Date;
  source?: "admin" | "chat";
  tenantSlug?: string | null;
}): Promise<{ sent: boolean; id?: string; error?: string }> {
  const settings = await getUserRegistrationEmailSettings();
  if (!settings.resendApiKey) {
    return { sent: false, error: "Resend API key mancante" };
  }
  if (!settings.from) {
    return { sent: false, error: "Email mittente mancante" };
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${settings.resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: settings.from,
      to: [settings.to],
      subject: args.source === "chat" ? "Nuova registrazione chat EasyVox" : "Nuova registrazione EasyVox",
      text: [
        args.source === "chat" ? "Nuovo utente registrato dalla chat EasyVox." : "Nuovo utente registrato su EasyVox.",
        "",
        `Nome: ${args.registeredName}`,
        `Email: ${args.registeredEmail}`,
        `Data registrazione: ${args.registeredAt.toLocaleString("it-IT")}`,
        `Canale: ${args.source === "chat" ? "chat" : "admin"}`,
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
