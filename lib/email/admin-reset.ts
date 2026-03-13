import { prisma } from "@/lib/prisma";

type AdminResetEmailSettings = {
  resendApiKey: string | null;
  from: string | null;
  replyTo: string | null;
};

async function getAdminResetEmailSettings(): Promise<AdminResetEmailSettings> {
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

export async function sendAdminPasswordResetEmail(args: {
  to: string;
  resetUrl: string;
}): Promise<{ sent: boolean; id?: string; error?: string }> {
  const settings = await getAdminResetEmailSettings();
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
      subject: "Recupero password admin EasyVox",
      text: [
        "Hai richiesto il recupero password per l'area admin EasyVox.",
        "",
        `Apri questo link per impostare una nuova password: ${args.resetUrl}`,
        "",
        "Il link scade tra 30 minuti.",
        "Se non hai richiesto tu questa operazione, ignora questa email.",
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
