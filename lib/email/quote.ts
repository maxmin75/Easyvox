import type { PurchaseEmailRuntimeSettings } from "@/lib/email/purchase";
import type { QuotePayload } from "@/lib/quote-pdf";

const EASYVOX_QUOTE_INTERNAL_EMAIL = "gianluca.pistorello@gmail.com";

function supportLabel(support: QuotePayload["support"]): string {
  if (support === "istanza") return "Istanza EasyVox";
  if (support === "server") return "Server dedicato con dominio";
  return "Macchina locale";
}

function trainingLabel(training: QuotePayload["training"]): string {
  if (training === "soft") return "Soft";
  if (training === "medium") return "Medium";
  return "Enterprise";
}

async function sendEmail(args: {
  settings: PurchaseEmailRuntimeSettings;
  to: string;
  subject: string;
  text: string;
  pdfBytes: Uint8Array;
  fileName: string;
}) {
  const { settings, to, subject, text, pdfBytes, fileName } = args;

  if (!settings.enabled) {
    return { sent: false, error: "Invio email disabilitato" };
  }
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
      to: [to],
      subject,
      text,
      reply_to: settings.replyTo || undefined,
      attachments: [
        {
          filename: fileName,
          content: Buffer.from(pdfBytes).toString("base64"),
        },
      ],
    }),
  });

  const data = (await response.json().catch(() => null)) as { id?: string; message?: string } | null;
  if (!response.ok) {
    return { sent: false, error: data?.message ?? `Errore invio email (${response.status})` };
  }

  return { sent: true, id: data?.id ?? null };
}

export async function sendQuoteEmails(args: {
  settings: PurchaseEmailRuntimeSettings;
  payload: QuotePayload;
  pdfBytes: Uint8Array;
  fileName: string;
}) {
  const { settings, payload, pdfBytes, fileName } = args;
  const summary = [
    `Nome: ${payload.name}`,
    `Ditta: ${payload.company}`,
    `Citta: ${payload.city}`,
    `Email: ${payload.email}`,
    `Telefono: ${payload.phone}`,
    `Supporto: ${supportLabel(payload.support)}`,
    `Tipologia AI: Primum open source`,
    `Addestramento: ${trainingLabel(payload.training)}`,
    `Customizzazione: ${payload.customizations?.trim() || "su richiesta"}`,
  ].join("\n");

  const internalSubject = `Nuovo preventivo EasyVox - ${payload.company}`;
  const internalText = `E stato generato un nuovo preventivo EasyVox.\n\n${summary}`;
  const customerSubject = `Preventivo EasyVox - ${payload.company}`;
  const customerText = `In allegato trovi il preventivo EasyVox richiesto.\n\n${summary}`;

  const recipients = Array.from(new Set([EASYVOX_QUOTE_INTERNAL_EMAIL, payload.email.trim().toLowerCase()]));
  const results = [];

  for (const to of recipients) {
    const isInternal = to === EASYVOX_QUOTE_INTERNAL_EMAIL;
    const result = await sendEmail({
      settings,
      to,
      subject: isInternal ? internalSubject : customerSubject,
      text: isInternal ? internalText : customerText,
      pdfBytes,
      fileName,
    });
    results.push({ to, ...result });
  }

  return results;
}
