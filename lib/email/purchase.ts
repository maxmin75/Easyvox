import { prisma } from "@/lib/prisma";

export const DEFAULT_PURCHASE_KEYWORDS = [
  "acquisto",
  "acquistare",
  "comprare",
  "attiva",
  "attivare",
  "procedi",
  "abbonamento",
  "pagare",
  "pagamento",
];

export const DEFAULT_PURCHASE_EMAIL_SUBJECT =
  "Conferma richiesta attivazione {{clientName}}";

export const DEFAULT_PURCHASE_EMAIL_BODY = `Ciao {{customerName}},

abbiamo ricevuto la tua richiesta per attivare {{clientName}}.

Riepilogo:
- Email: {{customerEmail}}
- Telefono: {{customerPhone}}
- Sito: {{customerWebsite}}
- Messaggio: {{message}}

Ti contatteremo al piu presto per completare l'attivazione.

Grazie,
Team {{clientName}}`;

export type PurchaseEmailRuntimeSettings = {
  enabled: boolean;
  resendApiKey: string | null;
  from: string | null;
  replyTo: string | null;
  subjectTemplate: string;
  bodyTemplate: string;
  purchaseIntentKeywords: string[];
};

export type PurchaseEmailTemplateVars = {
  clientName: string;
  assistantName: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerWebsite: string;
  message: string;
  date: string;
};

export function parseKeywords(raw: string | null | undefined): string[] {
  const items = (raw ?? "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);

  return items.length > 0 ? Array.from(new Set(items)) : DEFAULT_PURCHASE_KEYWORDS;
}

export function renderTemplate(template: string, vars: PurchaseEmailTemplateVars): string {
  return template.replace(/{{\s*([a-zA-Z0-9_]+)\s*}}/g, (_, key: keyof PurchaseEmailTemplateVars) => {
    const value = vars[key];
    return value == null ? "" : String(value);
  });
}

export function isPurchaseIntentMessage(message: string, keywords: string[]): boolean {
  const text = message.trim().toLowerCase();
  if (!text) return false;
  return keywords.some((keyword) => keyword && text.includes(keyword.toLowerCase()));
}

export async function getPurchaseEmailRuntimeSettings(): Promise<PurchaseEmailRuntimeSettings> {
  const setting = await prisma.appSetting.findUnique({
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

  return {
    enabled: setting?.purchaseEmailEnabled ?? false,
    resendApiKey: process.env.RESEND_API_KEY ?? setting?.resendApiKey ?? null,
    from: process.env.PURCHASE_EMAIL_FROM ?? setting?.purchaseEmailFrom ?? null,
    replyTo: setting?.purchaseEmailReplyTo ?? null,
    subjectTemplate:
      setting?.purchaseEmailSubjectTemplate?.trim() || DEFAULT_PURCHASE_EMAIL_SUBJECT,
    bodyTemplate: setting?.purchaseEmailBodyTemplate?.trim() || DEFAULT_PURCHASE_EMAIL_BODY,
    purchaseIntentKeywords: parseKeywords(setting?.purchaseIntentKeywords),
  };
}

export async function sendPurchaseIntentEmail(args: {
  settings: PurchaseEmailRuntimeSettings;
  to: string;
  vars: PurchaseEmailTemplateVars;
}): Promise<{ sent: boolean; id?: string; error?: string }> {
  const { settings, to, vars } = args;

  if (!settings.enabled) {
    return { sent: false, error: "Invio email acquisto disabilitato" };
  }
  if (!settings.resendApiKey) {
    return { sent: false, error: "Resend API key mancante" };
  }
  if (!settings.from) {
    return { sent: false, error: "Email mittente mancante" };
  }

  const subject = renderTemplate(settings.subjectTemplate, vars);
  const text = renderTemplate(settings.bodyTemplate, vars);

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${settings.resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: settings.from,
      to: [to],
      subject,
      text,
      reply_to: settings.replyTo || undefined,
    }),
  });

  const data = (await response.json().catch(() => null)) as { id?: string; message?: string } | null;
  if (!response.ok) {
    return { sent: false, error: data?.message ?? `Errore invio email (${response.status})` };
  }

  return { sent: true, id: data?.id };
}
