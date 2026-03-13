import { prisma } from "@/lib/prisma";

type ChatEmailVerificationSettings = {
  resendApiKey: string | null;
  from: string | null;
  replyTo: string | null;
};

async function getChatEmailVerificationSettings(): Promise<ChatEmailVerificationSettings> {
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
  };
}

export async function sendChatEmailVerificationEmail(args: {
  to: string;
  customerName: string;
  tenantName: string;
  verifyUrl: string;
}): Promise<{ sent: boolean; id?: string; error?: string }> {
  const settings = await getChatEmailVerificationSettings();
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
      to: [args.to],
      subject: `Conferma la tua email per ${args.tenantName}`,
      text: [
        `Ciao ${args.customerName},`,
        "",
        `clicca questo link per confermare la tua email e completare l'accesso chat su ${args.tenantName}:`,
        args.verifyUrl,
        "",
        "Il link scade tra 24 ore.",
        "Se non hai richiesto tu questa registrazione, puoi ignorare questa email.",
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
