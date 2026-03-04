import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withTenant } from "@/lib/db/tenant";
import { jsonError } from "@/lib/api/errors";
import { prisma } from "@/lib/prisma";
import { getAuthUserFromRequest } from "@/lib/auth";
import { getRuntimeSettings, getRuntimeSettingsForUser } from "@/lib/runtime-settings";
import { createEmbeddingWithProvider, completeChatWithProvider } from "@/lib/ai/provider";
import { retrieveTopChunks } from "@/lib/rag/retrieval";
import { getTenantAccess, touchTenantMembership } from "@/lib/tenant-users";
import {
  getPurchaseEmailRuntimeSettings,
  isPurchaseIntentMessage,
  sendPurchaseIntentEmail,
  type PurchaseEmailTemplateVars,
} from "@/lib/email/purchase";

export const runtime = "nodejs";

const schema = z.object({
  sessionId: z.string().min(3),
  message: z.string().min(1).max(4000),
  customerName: z.string().trim().min(1).max(120).optional(),
  customerEmail: z.string().email().max(190).optional(),
  useEasyvoxChat: z.boolean().optional(),
});

const appointmentIntentSchema = z.object({
  intent: z.enum(["book_appointment", "list_appointments", "general"]),
  fullName: z.string().min(1).max(120).nullable().optional(),
  email: z.string().email().nullable().optional(),
  phone: z.string().min(5).max(40).nullable().optional(),
  scheduledFor: z.string().max(120).nullable().optional(),
  timezone: z.string().min(2).max(80).nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
  listLimit: z.number().int().min(1).max(20).nullable().optional(),
  crmContact: z
    .object({
      name: z.string().min(1).max(120).nullable().optional(),
      email: z.string().email().nullable().optional(),
      phone: z.string().min(5).max(40).nullable().optional(),
      website: z.string().max(300).nullable().optional(),
    })
    .nullable()
    .optional(),
  missingFields: z.array(z.string()).default([]),
  assistantReply: z.string().min(1),
});

type UsageEstimate = {
  inputTokens: number | null;
  outputTokens: number | null;
};

type AppointmentRecord = {
  id: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  scheduledFor: Date;
};

type AppointmentDelegate = {
  create: (args: {
    data: {
      clientId: string;
      sessionId: string;
      fullName: string;
      email: string | null;
      phone: string | null;
      scheduledFor: Date;
      timezone: string | null;
      notes: string | null;
    };
  }) => Promise<AppointmentRecord>;
};

type CrmContact = {
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  website?: string | null;
};

type PurchaseEmailCandidate = {
  leadId: string;
  recipientEmail: string;
  vars: PurchaseEmailTemplateVars;
};

function extractFirstJsonObject(raw: string): string | null {
  const fenced = raw.match(/```json\s*([\s\S]*?)\s*```/i);
  if (fenced?.[1]) return fenced[1].trim();

  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  return raw.slice(start, end + 1).trim();
}

function mergeUsage(a: UsageEstimate, b: UsageEstimate): UsageEstimate {
  return {
    inputTokens:
      a.inputTokens == null || b.inputTokens == null ? null : a.inputTokens + b.inputTokens,
    outputTokens:
      a.outputTokens == null || b.outputTokens == null ? null : a.outputTokens + b.outputTokens,
  };
}

function normalizeWebsite(value: string | null | undefined): string | null {
  if (!value) return null;
  const raw = value.trim();
  if (!raw) return null;
  if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
  return `https://${raw}`;
}

function extractCrmFromMessage(message: string): CrmContact {
  const email = message.match(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i)?.[0] ?? null;
  const websiteRaw =
    message.match(/\bhttps?:\/\/[^\s,;]+/i)?.[0] ??
    message.match(/\b(?:www\.)?[a-z0-9-]+(?:\.[a-z0-9-]+)+(?:\/[^\s,;]*)?/i)?.[0] ??
    null;
  const phoneRaw = message.match(/(?:\+?\d[\d\s().-]{6,}\d)/)?.[0] ?? null;
  const nameRaw = message.split(/[,\n]/)[0]?.trim() ?? "";
  const name =
    nameRaw.split(" ").length >= 2 && !/\d/.test(nameRaw) && nameRaw.length <= 120 ? nameRaw : null;

  return {
    name,
    email,
    phone: phoneRaw ? phoneRaw.replace(/\s+/g, " ").trim() : null,
    website: normalizeWebsite(websiteRaw),
  };
}

function mergeCrmContact(aiContact: CrmContact | null | undefined, regexContact: CrmContact): CrmContact {
  return {
    name: aiContact?.name?.trim() || regexContact.name || null,
    email: aiContact?.email?.trim() || regexContact.email || null,
    phone: aiContact?.phone?.trim() || regexContact.phone || null,
    website: normalizeWebsite(aiContact?.website?.trim() || regexContact.website || null),
  };
}

function normalizeScheduledFor(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const value = raw.trim();
  if (!value) return null;

  const isoDate = new Date(value);
  if (!Number.isNaN(isoDate.getTime())) {
    return isoDate.toISOString();
  }

  const cleaned = value
    .toLowerCase()
    .replace(/alle/g, " ")
    .replace(/ore/g, " ")
    .replace(/\s+/g, " ");
  const match = cleaned.match(
    /(\d{1,2})[\/.-](\d{1,2})(?:[\/.-](\d{2,4}))?(?:\D+(\d{1,2})[:.](\d{2}))?/,
  );
  if (!match) return null;

  const day = Number(match[1]);
  const month = Number(match[2]);
  const yearRaw = match[3] ? Number(match[3]) : new Date().getFullYear();
  const year = yearRaw < 100 ? 2000 + yearRaw : yearRaw;
  const hours = match[4] ? Number(match[4]) : 9;
  const minutes = match[5] ? Number(match[5]) : 0;

  const parsed = new Date(year, month - 1, day, hours, minutes, 0, 0);
  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month - 1 ||
    parsed.getDate() !== day
  ) {
    return null;
  }

  return parsed.toISOString();
}

async function detectAppointmentIntent(
  message: string,
  nowIso: string,
  runtimeSettings: Awaited<ReturnType<typeof getRuntimeSettings>>,
) {
  const completion = await completeChatWithProvider(
    {
      systemPrompt: `Sei un parser intent per chat assistente commerciale.
Devi rispondere SOLO con JSON valido (senza testo extra) rispettando questo schema:
{
  "intent": "book_appointment" | "list_appointments" | "general",
  "fullName": string|null,
  "email": string|null,
  "phone": string|null,
  "scheduledFor": string|null, // ISO 8601 con timezone offset, es: 2026-03-10T14:30:00+01:00
  "timezone": string|null,
  "notes": string|null,
  "listLimit": number|null,
  "crmContact": { "name": string|null, "email": string|null, "phone": string|null, "website": string|null } | null,
  "missingFields": string[],
  "assistantReply": string
}
Regole:
- usa "book_appointment" solo se l'utente sta chiedendo chiaramente di prenotare/fissare un appuntamento.
- usa "list_appointments" se l'utente chiede di vedere/richiamare/elencare gli appuntamenti.
- se mancano dati minimi per crearlo, indica missingFields tra: fullName, contact, scheduledFor.
- "contact" significa che manca sia email sia telefono.
- se la data è ambigua/non completa, metti scheduledFor = null e aggiungi "scheduledFor" ai missingFields.
- assistantReply deve essere in italiano, breve e operativo. Se mancano dati, chiedili esplicitamente.
- per list_appointments puoi valorizzare listLimit (default 5).
- se riconosci dati CRM nel messaggio utente (nome, email, telefono, sito), valorizza crmContact.
- Se l'intento non è appuntamento, imposta intent="general" e assistantReply con stringa vuota.
`,
      userPrompt: `Data corrente ISO: ${nowIso}\nMessaggio utente:\n${message}`,
    },
    runtimeSettings,
  );

  const jsonCandidate = extractFirstJsonObject(completion.reply);
  if (!jsonCandidate) return null;

  const parsed = appointmentIntentSchema.safeParse(JSON.parse(jsonCandidate));
  if (!parsed.success) return null;

  return { data: parsed.data, usageEstimate: completion.usageEstimate };
}

function getMissingAppointmentFields(data: z.infer<typeof appointmentIntentSchema>) {
  const missing = new Set<string>(
    data.missingFields.filter((field) => field === "fullName" || field === "contact" || field === "scheduledFor"),
  );

  if (!data.fullName?.trim()) missing.add("fullName");
  if (!data.email && !data.phone) missing.add("contact");
  if (!normalizeScheduledFor(data.scheduledFor)) missing.add("scheduledFor");

  return [...missing];
}

export async function POST(request: NextRequest) {
  const systemRuntimeSettings = await getRuntimeSettings();
  const purchaseEmailSettings = await getPurchaseEmailRuntimeSettings();
  const authUser = await getAuthUserFromRequest(request);
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError("Payload non valido", 400);
  let clientId = request.headers.get("x-client-id");
  const clientSlug = request.headers.get("x-client-slug")?.trim().toLowerCase() ?? "";
  const forceEasyvoxChat = parsed.data.useEasyvoxChat === true;
  const payloadCustomerName = parsed.data.customerName?.trim() ?? "";
  const payloadCustomerEmail = parsed.data.customerEmail?.trim().toLowerCase() ?? "";

  if (!clientId && !forceEasyvoxChat && clientSlug) {
    const bySlug = await prisma.client.findUnique({
      where: { slug: clientSlug },
      select: { id: true },
    });
    clientId = bySlug?.id ?? null;
  }

  if (!clientId && !forceEasyvoxChat) {
    if (authUser) {
      const defaultClient = await prisma.client.findFirst({
        where: { ownerId: authUser.id },
        orderBy: { createdAt: "asc" },
        select: { id: true },
      });
      clientId = defaultClient?.id ?? null;
    }
  }

  if (!clientId) {
    try {
      const easyvoxCustomerLine =
        payloadCustomerName || payloadCustomerEmail
          ? `\nCliente: ${payloadCustomerName || "Cliente"}${payloadCustomerEmail ? ` (${payloadCustomerEmail})` : ""}.`
          : "";
      const completion = await completeChatWithProvider(
        {
          systemPrompt:
            `Sei Easyvox chat, helpdesk ufficiale EasyVox per utenti che stanno valutando o attivando il servizio. Rispondi in modo pratico e operativo: onboarding, configurazione, pricing, attivazione, integrazioni, troubleshooting di base. Se mancano dettagli specifici di un'azienda, dichiaralo e proponi i passaggi successivi.
Rivolgiti sempre al cliente per nome quando appropriato.${easyvoxCustomerLine}`,
          userPrompt: parsed.data.message,
        },
        systemRuntimeSettings,
      );

      return NextResponse.json({
        reply: completion.reply,
        assistantName: "Easyvox chat",
        usageEstimate: completion.usageEstimate,
        sources: [],
        provider: systemRuntimeSettings.provider,
        mode: "easyvox-chat",
        appointmentCreated: false,
        appointmentId: null,
      });
    } catch (error) {
      const detail = error instanceof Error ? error.message : "Errore chat provider";
      return jsonError(detail, 500);
    }
  }

  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: {
      id: true,
      name: true,
      ownerId: true,
      assistantName: true,
      systemPrompt: true,
      canTakeAppointments: true,
      requireProfiling: true,
      requireUserAuthForChat: true,
    },
  });

  if (!client) return jsonError("Tenant non trovato", 404);
  const access = authUser ? await getTenantAccess(client.id, authUser.id) : null;
  const isOwner = access?.isOwner ?? false;
  const hasTenantAccess = access?.hasAccess ?? false;

  if (client.requireUserAuthForChat && !authUser) {
    return jsonError("Accesso richiesto: effettua login con email e password.", 401);
  }
  if (client.requireUserAuthForChat && !hasTenantAccess) {
    return jsonError("Non autorizzato per questo tenant.", 403);
  }

  if (authUser && hasTenantAccess) {
    await touchTenantMembership(client.id, authUser.id, isOwner);
  }

  if (client.requireProfiling && (!payloadCustomerName || !payloadCustomerEmail)) {
    return jsonError("Profilazione obbligatoria: nome ed email sono richiesti prima di chattare.", 400);
  }

  const runtimeSettings = hasTenantAccess
    ? await getRuntimeSettingsForUser(client.id, authUser?.id ?? null)
    : systemRuntimeSettings;

  let embedding: number[];
  try {
    embedding = await createEmbeddingWithProvider(parsed.data.message, runtimeSettings);
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Errore embedding provider";
    return jsonError(detail, 500);
  }

  const resolvedClientId = clientId;
  try {
    const result = await withTenant(resolvedClientId, async (tx) => {
      const chunks = await retrieveTopChunks(tx, resolvedClientId, embedding, 5);
      const context = chunks.map((chunk, index) => `[${index + 1}] ${chunk.content}`).join("\n\n");
      const nowIso = new Date().toISOString();
      const customerName = payloadCustomerName;
      const customerEmail = payloadCustomerEmail;

      const intentAnalysis = await detectAppointmentIntent(parsed.data.message, nowIso, runtimeSettings).catch(
        () => null,
      );
      const regexCrm = extractCrmFromMessage(parsed.data.message);
      const mergedCrm = mergeCrmContact(intentAnalysis?.data.crmContact, regexCrm);
      let finalReply = "";
      let usageEstimate: UsageEstimate = { inputTokens: null, outputTokens: null };
      let appointmentCreated = false;
      let appointmentId: string | null = null;
      let purchaseEmailCandidate: PurchaseEmailCandidate | null = null;

      if (intentAnalysis?.data.intent === "list_appointments") {
        if (!client.canTakeAppointments) {
          finalReply = "Per questo agente la funzione appuntamenti e disabilitata.";
          usageEstimate = intentAnalysis.usageEstimate;
        } else {
        const limit = Math.max(1, Math.min(20, intentAnalysis.data.listLimit ?? 5));
        const appointments = await tx.appointment.findMany({
          where: { clientId: resolvedClientId },
          orderBy: { scheduledFor: "asc" },
          take: limit,
          select: {
            fullName: true,
            email: true,
            phone: true,
            scheduledFor: true,
          },
        });

        if (appointments.length === 0) {
          finalReply = "Non risultano appuntamenti salvati al momento.";
        } else {
          const lines = appointments.map((appointment, index) => {
            const when = appointment.scheduledFor.toLocaleString("it-IT", {
              dateStyle: "short",
              timeStyle: "short",
            });
            const contact = appointment.email ?? appointment.phone ?? "contatto non indicato";
            return `${index + 1}. ${appointment.fullName} - ${when} - ${contact}`;
          });
          finalReply = `Ecco gli ultimi appuntamenti:\n${lines.join("\n")}`;
        }

        usageEstimate = intentAnalysis.usageEstimate;
        }
      } else if (intentAnalysis?.data.intent === "book_appointment") {
        if (!client.canTakeAppointments) {
          finalReply = "Per questo agente la presa appuntamenti e disabilitata.";
          usageEstimate = intentAnalysis.usageEstimate;
        } else {
        const effectiveAppointmentData = {
          ...intentAnalysis.data,
          fullName: intentAnalysis.data.fullName?.trim() || customerName || null,
          email: intentAnalysis.data.email?.trim() || customerEmail || null,
        };
        const missingFields = getMissingAppointmentFields(effectiveAppointmentData);

        if (missingFields.length === 0) {
          const scheduledForIso = normalizeScheduledFor(effectiveAppointmentData.scheduledFor);
          if (!scheduledForIso) {
            finalReply = "Per creare l'appuntamento mi serve una data/ora valida (es: 28/03/2026 15:00).";
            usageEstimate = intentAnalysis.usageEstimate;
            return {
              reply: finalReply,
              assistantName: client.assistantName ?? "Assistant",
              usageEstimate,
              sources: chunks.map((chunk) => ({ id: chunk.id, score: chunk.score })),
              provider: runtimeSettings.provider,
              appointmentCreated: false,
              appointmentId: null,
            };
          }

          const appointmentDelegate = (tx as unknown as { appointment?: AppointmentDelegate })
            .appointment;
          if (!appointmentDelegate) {
            throw new Error(
              "Modello appointment non disponibile nel Prisma Client runtime. Riavvia il server dopo prisma generate/migrate.",
            );
          }

          const appointment = await appointmentDelegate.create({
            data: {
              clientId: resolvedClientId,
              sessionId: parsed.data.sessionId,
              fullName: effectiveAppointmentData.fullName!.trim(),
              email: effectiveAppointmentData.email ?? null,
              phone: effectiveAppointmentData.phone ?? null,
              scheduledFor: new Date(scheduledForIso),
              timezone: effectiveAppointmentData.timezone ?? null,
              notes: effectiveAppointmentData.notes ?? null,
            },
          });
          appointmentCreated = true;
          appointmentId = appointment.id;

          const contact = appointment.email ?? appointment.phone ?? "contatto non specificato";
          finalReply = `Perfetto, appuntamento creato.\nNome: ${appointment.fullName}\nQuando: ${appointment.scheduledFor.toISOString()}\nContatto: ${contact}`;
        } else {
          const fallbackMissingMessage = missingFields
            .map((field) => {
              if (field === "fullName") return "nome e cognome";
              if (field === "contact") return "email o telefono";
              return "data e ora precise (con timezone)";
            })
            .join(", ");
          finalReply =
            intentAnalysis.data.assistantReply.trim() ||
            `Per creare l'appuntamento mi servono ancora: ${fallbackMissingMessage}.`;
        }

        usageEstimate = intentAnalysis.usageEstimate;
        }
      } else {
        const customerDirective = customerName
          ? `Rivolgiti al cliente per nome quando appropriato: ${customerName}.`
          : "Se non conosci il nome del cliente, chiedilo con naturalezza solo quando utile.";
        const systemPrompt = `${client.systemPrompt ?? "Rispondi in modo chiaro, accurato e conciso."}\n\nSe non sai qualcosa, dichiaralo esplicitamente.\n${customerDirective}`;
        const userPrompt = `Contesto RAG:\n${context || "Nessun documento disponibile."}\n\nMessaggio utente:\n${parsed.data.message}`;

        const completion = await completeChatWithProvider(
          {
            systemPrompt,
            userPrompt,
          },
          runtimeSettings,
        );
        finalReply = completion.reply;
        usageEstimate = intentAnalysis
          ? mergeUsage(intentAnalysis.usageEstimate, completion.usageEstimate)
          : completion.usageEstimate;
      }

      await tx.conversation.create({
        data: {
          clientId: resolvedClientId,
          sessionId: parsed.data.sessionId,
          userMessage: parsed.data.message,
          assistantMessage: finalReply,
        },
      });

      let leadSnapshot: {
        id: string;
        name: string;
        email: string | null;
        phone: string | null;
        website: string | null;
        purchaseEmailSentAt: Date | null;
      } | null = await tx.lead.findFirst({
        where: { clientId: resolvedClientId, sessionId: parsed.data.sessionId },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          website: true,
          purchaseEmailSentAt: true,
        },
      });

      if (leadSnapshot) {
        leadSnapshot = await tx.lead.update({
          where: { id: leadSnapshot.id },
          data: {
            name: mergedCrm.name?.trim() || customerName || leadSnapshot.name,
            email: mergedCrm.email?.trim() || customerEmail || leadSnapshot.email,
            phone: mergedCrm.phone?.trim() || leadSnapshot.phone,
            website: mergedCrm.website?.trim() || leadSnapshot.website,
            message: parsed.data.message,
          },
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            website: true,
            purchaseEmailSentAt: true,
          },
        });
      } else {
        leadSnapshot = await tx.lead.create({
          data: {
            clientId: resolvedClientId,
            sessionId: parsed.data.sessionId,
            name: mergedCrm.name?.trim() || customerName || "Contatto chat",
            email: mergedCrm.email?.trim() || customerEmail || null,
            phone: mergedCrm.phone?.trim() || null,
            website: mergedCrm.website?.trim() || null,
            message: parsed.data.message,
          },
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            website: true,
            purchaseEmailSentAt: true,
          },
        });
      }

      const purchaseDetected = isPurchaseIntentMessage(
        parsed.data.message,
        purchaseEmailSettings.purchaseIntentKeywords,
      );
      if (purchaseDetected && leadSnapshot) {
        await tx.lead.update({
          where: { id: leadSnapshot.id },
          data: {
            purchaseIntentDetectedAt: new Date(),
            message: parsed.data.message,
          },
        });

        if (
          purchaseEmailSettings.enabled &&
          leadSnapshot.email &&
          !leadSnapshot.purchaseEmailSentAt
        ) {
          purchaseEmailCandidate = {
            leadId: leadSnapshot.id,
            recipientEmail: leadSnapshot.email,
            vars: {
              clientName: client.name,
              assistantName: client.assistantName ?? "Assistant",
              customerName: leadSnapshot.name || "Cliente",
              customerEmail: leadSnapshot.email || "",
              customerPhone: leadSnapshot.phone || "n/d",
              customerWebsite: leadSnapshot.website || "n/d",
              message: parsed.data.message,
              date: new Date().toLocaleString("it-IT"),
            },
          };
        }
      }

      return {
        reply: finalReply,
        assistantName: client.assistantName ?? "Assistant",
        usageEstimate,
        sources: chunks.map((chunk) => ({ id: chunk.id, score: chunk.score })),
        provider: runtimeSettings.provider,
        appointmentCreated,
        appointmentId,
        purchaseEmailCandidate,
      };
    });

    if (result.purchaseEmailCandidate) {
      const sendResult = await sendPurchaseIntentEmail({
        settings: purchaseEmailSettings,
        to: result.purchaseEmailCandidate.recipientEmail,
        vars: result.purchaseEmailCandidate.vars,
      });

      await withTenant(resolvedClientId, (tx) =>
        tx.lead.update({
          where: { id: result.purchaseEmailCandidate!.leadId },
          data: sendResult.sent
            ? { purchaseEmailSentAt: new Date(), purchaseEmailError: null }
            : { purchaseEmailError: (sendResult.error ?? "Invio email fallito").slice(0, 500) },
        }),
      ).catch(() => null);
    }

    const safeResult = { ...result } as typeof result & { purchaseEmailCandidate?: unknown };
    delete safeResult.purchaseEmailCandidate;

    return NextResponse.json(safeResult);
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Errore interno chat";
    return jsonError(detail, 500);
  }
}
