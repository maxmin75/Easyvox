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
import { sanitizeChatText } from "@/lib/chat-text";
import {
  DEFAULT_CLIENT_SYSTEM_PROMPT,
  DEFAULT_EASYVOX_SYSTEM_PROMPT,
  EASYVOX_INFO_PROMPT,
  EASYVOX_PRICING_PROMPT,
  EASYVOX_QUOTE_PROMPT,
  EASYVOX_SERVICE_DETAILS_PROMPT,
} from "@/lib/systemPrompt";
import { mockProducts } from "@/lib/mockProducts";
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
  anonymousTest: z.boolean().optional(),
  useEasyvoxChat: z.boolean().optional(),
  stream: z.boolean().optional(),
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
      firstName: z.string().min(1).max(120).nullable().optional(),
      lastName: z.string().min(1).max(120).nullable().optional(),
      email: z.string().email().nullable().optional(),
      phone: z.string().min(5).max(40).nullable().optional(),
      website: z.string().max(300).nullable().optional(),
      productInterest: z.string().max(160).nullable().optional(),
      interestType: z.string().max(120).nullable().optional(),
      city: z.string().max(120).nullable().optional(),
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

type ChatSuccessResult = {
  reply: string;
  assistantName: string;
  usageEstimate: UsageEstimate;
  sources: Array<{ id: string; score: number }>;
  provider: string;
  mode?: string;
  appointmentCreated: boolean;
  appointmentId: string | null;
  productCard?: {
    title: string;
    description: string;
    priceLabel: string;
    discountLabel: string | null;
    productUrl: string;
    imageUrl: string | null;
  } | null;
};

function splitReplyInChunks(reply: string): string[] {
  const chunks: string[] = [];
  let cursor = 0;
  const maxChunkLength = 12;
  while (cursor < reply.length) {
    chunks.push(reply.slice(cursor, cursor + maxChunkLength));
    cursor += maxChunkLength;
  }
  return chunks;
}

function jsonOrStreamResponse(payload: ChatSuccessResult, stream: boolean) {
  if (!stream) {
    return NextResponse.json(payload);
  }

  const encoder = new TextEncoder();
  const readable = new ReadableStream<Uint8Array>({
    async start(controller) {
      const write = (event: unknown) => {
        controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
      };

      write({ type: "meta", assistantName: payload.assistantName });
      for (const chunk of splitReplyInChunks(payload.reply)) {
        write({ type: "delta", text: chunk });
        await new Promise((resolve) => setTimeout(resolve, 8));
      }
      write({
        type: "done",
        payload: {
          assistantName: payload.assistantName,
          usageEstimate: payload.usageEstimate,
          sources: payload.sources,
          provider: payload.provider,
          mode: payload.mode ?? null,
          appointmentCreated: payload.appointmentCreated,
          appointmentId: payload.appointmentId,
          productCard: payload.productCard ?? null,
          reply: payload.reply,
        },
      });
      controller.close();
    },
  });

  return new NextResponse(readable, {
    headers: {
      "content-type": "application/x-ndjson; charset=utf-8",
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive",
      "x-accel-buffering": "no",
    },
  });
}

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
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
  website?: string | null;
  productInterest?: string | null;
  interestType?: string | null;
  city?: string | null;
};

type PurchaseEmailCandidate = {
  leadId: string;
  recipientEmail: string;
  vars: PurchaseEmailTemplateVars;
};

type ConversationMemoryRow = {
  userMessage: string;
  assistantMessage: string;
};

const MAX_CONVERSATION_MEMORY_MESSAGES = 8;
const MAX_MEMORY_ENTRY_LENGTH = 500;

function isEasyvoxPricingQuestion(message: string): boolean {
  const normalized = message.toLowerCase();
  return [
    "prezzo",
    "prezzi",
    "costo",
    "costi",
    "quanto costa",
    "quanto costano",
    "tariffa",
    "tariffe",
    "abbonamento",
    "abbonamenti",
    "setup",
    "mensile",
    "canone",
  ].some((keyword) => normalized.includes(keyword));
}

function isEasyvoxInfoQuestion(message: string): boolean {
  const normalized = message.toLowerCase();
  return [
    "easyvox",
    "come funziona",
    "cosa fa",
    "che cosa fa",
    "che servizi",
    "servizi offre",
    "informazioni",
    "spiegami",
    "presentami",
    "dimmi di piu",
  ].some((keyword) => normalized.includes(keyword));
}

function isEasyvoxSpecificServiceQuestion(message: string): boolean {
  const normalized = message.toLowerCase();
  return [
    "ai conversazionale",
    "presentazione prodotti",
    "presentazione servizi",
    "raccolta contatti",
    "crm interno",
    "memoria cliente",
    "automazione email",
    "automazione processi",
    "addestramento",
    "chat embeddabile",
    "istanza easyvox",
    "installazione su istanza",
    "installazione in locale",
    "server dedicato",
    "start & go",
    "setup iniziale",
    "customizzazione",
  ].some((keyword) => normalized.includes(keyword));
}

function isEasyvoxQuoteQuestion(message: string): boolean {
  const normalized = message.toLowerCase();
  return [
    "preventivo",
    "stima",
    "proposta economica",
    "offerta economica",
    "quanto verrebbe",
    "quanto mi costerebbe",
    "fammi un preventivo",
  ].some((keyword) => normalized.includes(keyword));
}

function normalizeEasyvoxLookup(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s&]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

type ServiceLookupItem = {
  name: string;
  description: string;
};

type CatalogAnswerProduct = {
  slug?: string;
  name: string;
  description: string;
  relatedProductIds?: string[];
  priceLabel?: string;
  discountLabel?: string;
  url?: string;
  imageUrl?: string | null;
};

const PRODUCT_CONTEXT_PREFIX = "[[PRODUCT_CONTEXT:";

function buildProductContextMarker(product: CatalogAnswerProduct) {
  const slug = (product.slug || normalizeEasyvoxLookup(product.name).replace(/\s+/g, "-")).trim();
  const title = product.name.trim();
  return `${PRODUCT_CONTEXT_PREFIX}slug=${slug};title=${title}]]`;
}

function stripProductContextMarker(value: string) {
  return value.replace(/\n?\[\[PRODUCT_CONTEXT:[^[\]]+\]\]/g, "").trim();
}

function extractProductContextMarker(value: string): { slug: string; title: string } | null {
  const match = value.match(/\[\[PRODUCT_CONTEXT:slug=([^;\]]+);title=([^[\]]+)\]\]/);
  if (!match) return null;
  return {
    slug: match[1]?.trim() ?? "",
    title: match[2]?.trim() ?? "",
  };
}

function extractLastProductContext(history: ConversationMemoryRow[]) {
  for (let index = history.length - 1; index >= 0; index -= 1) {
    const parsed = extractProductContextMarker(history[index]?.assistantMessage ?? "");
    if (parsed?.slug || parsed?.title) return parsed;
  }
  return null;
}

function isProductFollowUpQuestion(message: string) {
  const normalized = normalizeEasyvoxLookup(message);
  if (!normalized) return false;
  return [
    "quanto costa",
    "prezzo",
    "sconto",
    "link",
    "url",
    "immagine",
    "foto",
    "descrizione",
    "dettagli",
    "dimmi di piu",
    "parlami di piu",
    "fammi sapere",
    "questa scheda",
    "questo prodotto",
    "quello",
    "questo",
    "lo voglio",
    "mi interessa",
  ].some((keyword) => normalized.includes(keyword));
}

function resolveContextualProduct(
  message: string,
  products: CatalogAnswerProduct[],
  lastContext: { slug: string; title: string } | null,
) {
  const explicit = getSelectedEasyvoxService(message, products);
  if (explicit) return explicit;
  if (!lastContext || !isProductFollowUpQuestion(message)) return null;

  return (
    products.find((product) => product.slug && product.slug === lastContext.slug) ??
    products.find((product) => normalizeEasyvoxLookup(product.name) === normalizeEasyvoxLookup(lastContext.title)) ??
    null
  );
}

function getSelectedEasyvoxService(message: string, products: ServiceLookupItem[]) {
  const normalizedMessage = normalizeEasyvoxLookup(message);
  const explicitMatch = normalizedMessage.match(/^info prodotto\s+(.+)$/i);
  const explicitName = explicitMatch?.[1]?.trim();

  if (explicitName) {
    return (
      products.find((product) => normalizeEasyvoxLookup(product.name) === explicitName) ??
      products.find((product) => normalizeEasyvoxLookup(product.name).includes(explicitName)) ??
      null
    );
  }

  return (
    products.find((product) => normalizedMessage.includes(normalizeEasyvoxLookup(product.name))) ?? null
  );
}

function buildEasyvoxSelectedServiceDirective(message: string, products: ServiceLookupItem[]): string {
  const selectedService = getSelectedEasyvoxService(message, products);
  if (!selectedService) return "";

  return `\n\nQuando l'utente chiede info prodotto o informazioni su un servizio selezionato dal catalogo, rispondi usando principalmente questa scheda servizio.

Servizio selezionato: ${selectedService.name}
Descrizione ufficiale:
${selectedService.description}

Istruzioni:
- concentra la risposta su questo solo servizio
- usa il contenuto sopra come base principale
- spiega in modo chiaro e concreto cosa fa e perche e utile
- non accorciare troppo: usa circa 50-90 parole, salvo richiesta diversa
- non allargarti agli altri servizi se non richiesto`;
}

function isCatalogListQuestion(message: string): boolean {
  const normalized = normalizeEasyvoxLookup(message);
  return [
    "catalogo",
    "prodotti",
    "mostrami i prodotti",
    "fammi vedere i prodotti",
    "elenco prodotti",
    "lista prodotti",
  ].some((keyword) => normalized.includes(keyword));
}

function formatCatalogProductReply(product: CatalogAnswerProduct) {
  const parts = [
    `**${product.name}**`,
    product.description,
    product.priceLabel ? `Prezzo: ${product.priceLabel}` : null,
    product.discountLabel ? `Sconto: ${product.discountLabel}` : null,
    product.relatedProductIds?.length ? `Prodotti correlati: ${product.relatedProductIds.join(", ")}` : null,
    product.url ? `Link: ${product.url}` : null,
  ].filter(Boolean);

  return parts.join("\n\n");
}

function toProductCard(product: CatalogAnswerProduct): ChatSuccessResult["productCard"] {
  if (!product.url) return null;
  return {
    title: product.name,
    description: product.description,
    priceLabel: product.priceLabel ?? "Prezzo non disponibile",
    discountLabel: product.discountLabel ?? null,
    productUrl: product.url,
    imageUrl: product.imageUrl ?? null,
  };
}

function formatCatalogListReply(products: CatalogAnswerProduct[]) {
  const lines = products.slice(0, 8).map((product, index) => {
    const meta = [product.priceLabel, product.discountLabel].filter(Boolean).join(" | ");
    return `${index + 1}. ${product.name}${meta ? ` - ${meta}` : ""}`;
  });

  return `Ecco i prodotti disponibili:\n${lines.join("\n")}`;
}

function normalizeCustomerName(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

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

function normalizeCrmText(value: string | null | undefined, maxLength = 120): string | null {
  if (!value) return null;
  const compact = value.replace(/\s+/g, " ").trim();
  if (!compact) return null;
  return compact.slice(0, maxLength);
}

function splitFullName(value: string | null | undefined): { firstName: string | null; lastName: string | null } {
  const normalized = normalizeCrmText(value, 120);
  if (!normalized) return { firstName: null, lastName: null };
  const parts = normalized.split(" ").filter(Boolean);
  if (parts.length === 1) return { firstName: parts[0], lastName: null };
  return {
    firstName: parts[0] ?? null,
    lastName: parts.slice(1).join(" ") || null,
  };
}

function composeFullName(contact: CrmContact): string | null {
  const fromParts = [contact.firstName, contact.lastName].filter(Boolean).join(" ").trim();
  return normalizeCrmText(contact.name || fromParts, 120);
}

function inferInterestType(message: string): string | null {
  const normalized = message.toLowerCase();
  if (/(preventivo|offerta|proposta economica|quotazione)/.test(normalized)) return "preventivo";
  if (/(demo|dimostrazione)/.test(normalized)) return "demo";
  if (/(acquist|comprare|ordine|ordinare)/.test(normalized)) return "acquisto";
  if (/(appuntamento|call|richiam|incontro)/.test(normalized)) return "contatto commerciale";
  if (/(informazioni|info|approfond)/.test(normalized)) return "approfondimento";
  if (/(interessat|mi interessa|vorrei sapere)/.test(normalized)) return "interesse generico";
  return null;
}

function extractNamedField(message: string, labels: string[]): string | null {
  for (const label of labels) {
    const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const match = message.match(new RegExp(`${escaped}\\s*[:,-]?\\s*([^\\n,;]+)`, "i"));
    if (match?.[1]) return normalizeCrmText(match[1]);
  }
  return null;
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
  const nameFromLabel =
    extractNamedField(message, ["nome e cognome", "nominativo", "contatto"]) ??
    extractNamedField(message, ["nome"]);
  const normalizedName = normalizeCrmText(nameFromLabel || name, 120);
  const nameParts = splitFullName(normalizedName);
  const city = extractNamedField(message, ["citta", "città", "city"]);
  const productInterest =
    extractNamedField(message, ["prodotto", "servizio", "interessato a", "interesse per"]) ??
    null;

  return {
    name: normalizedName,
    firstName: nameParts.firstName,
    lastName: nameParts.lastName,
    email,
    phone: phoneRaw ? phoneRaw.replace(/\s+/g, " ").trim() : null,
    website: normalizeWebsite(websiteRaw),
    productInterest,
    interestType: inferInterestType(message),
    city,
  };
}

function mergeCrmContact(aiContact: CrmContact | null | undefined, regexContact: CrmContact): CrmContact {
  const mergedName = normalizeCrmText(aiContact?.name?.trim() || regexContact.name || null, 120);
  const mergedParts = splitFullName(mergedName);
  return {
    name: mergedName,
    firstName:
      normalizeCrmText(aiContact?.firstName?.trim() || regexContact.firstName || mergedParts.firstName, 120),
    lastName:
      normalizeCrmText(aiContact?.lastName?.trim() || regexContact.lastName || mergedParts.lastName, 120),
    email: aiContact?.email?.trim() || regexContact.email || null,
    phone: aiContact?.phone?.trim() || regexContact.phone || null,
    website: normalizeWebsite(aiContact?.website?.trim() || regexContact.website || null),
    productInterest: normalizeCrmText(
      aiContact?.productInterest?.trim() || regexContact.productInterest || null,
      160,
    ),
    interestType: normalizeCrmText(
      aiContact?.interestType?.trim() || regexContact.interestType || null,
      120,
    ),
    city: normalizeCrmText(aiContact?.city?.trim() || regexContact.city || null, 120),
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

function compactMemoryText(value: string, maxLength = MAX_MEMORY_ENTRY_LENGTH): string {
  const compact = stripProductContextMarker(value).replace(/\s+/g, " ").trim();
  if (!compact) return "";
  if (compact.length <= maxLength) return compact;
  return `${compact.slice(0, Math.max(0, maxLength - 3)).trimEnd()}...`;
}

function buildConversationMemory(history: ConversationMemoryRow[]): string {
  if (history.length === 0) return "";
  return history
    .map((entry, index) => {
      const userMessage = compactMemoryText(entry.userMessage);
      const assistantMessage = compactMemoryText(entry.assistantMessage);
      return `Turno ${index + 1}\nUtente: ${userMessage || "-"}\nAssistente: ${assistantMessage || "-"}`;
    })
    .join("\n\n");
}

async function detectAppointmentIntent(
  message: string,
  nowIso: string,
  runtimeSettings: Awaited<ReturnType<typeof getRuntimeSettings>>,
  conversationMemory: string,
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
  "crmContact": {
    "name": string|null,
    "firstName": string|null,
    "lastName": string|null,
    "email": string|null,
    "phone": string|null,
    "website": string|null,
    "productInterest": string|null,
    "interestType": string|null,
    "city": string|null
  } | null,
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
- se riconosci anche cognome, prodotto/servizio di interesse, tipo di interesse o citta, valorizzali in crmContact.
- Se l'intento non è appuntamento, imposta intent="general" e assistantReply con stringa vuota.
`,
      userPrompt: `Data corrente ISO: ${nowIso}
Memoria recente conversazione:
${conversationMemory || "Nessuna memoria disponibile."}

Messaggio utente:
${message}`,
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
  const stream = parsed.data.stream === true;
  const anonymousTest = parsed.data.anonymousTest === true;
  const payloadCustomerName = parsed.data.customerName?.trim() ?? "";
  const payloadCustomerEmail = parsed.data.customerEmail?.trim().toLowerCase() ?? "";
  const authCustomerEmail = authUser?.email?.trim().toLowerCase() ?? "";
  const authCustomerName =
    authUser?.name?.trim() ||
    authCustomerEmail.split("@")[0]?.replace(/[._-]+/g, " ").trim() ||
    "";
  const effectiveAnonymousTest = anonymousTest && !authCustomerEmail;
  let effectiveCustomerName = effectiveAnonymousTest ? "" : payloadCustomerName || authCustomerName;
  let effectiveCustomerEmail = effectiveAnonymousTest ? "" : payloadCustomerEmail || authCustomerEmail;

  if (!effectiveAnonymousTest && (!effectiveCustomerName || !effectiveCustomerEmail)) {
    return jsonError("Prima di iniziare la chat devi scegliere nome+email oppure test anonimo.", 400);
  }

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
      const defaultEasyvoxClient = await prisma.client.findUnique({
        where: { slug: "vox" },
        select: { id: true },
      });
      const savedEasyvoxProducts = defaultEasyvoxClient
        ? await prisma.product.findMany({
            where: { clientId: defaultEasyvoxClient.id },
            orderBy: { createdAt: "desc" },
            include: {
              images: {
                orderBy: { sortOrder: "asc" },
                take: 1,
                include: {
                  fileAsset: {
                    select: { id: true },
                  },
                },
              },
            },
          })
        : [];
      const easyvoxProducts =
        savedEasyvoxProducts.length > 0
          ? savedEasyvoxProducts.map((product) => ({
              slug: product.slug,
              name: product.title,
              description: `${product.description}\nPrezzo: EUR ${Number(product.price).toFixed(2)}\nSconto: ${product.discountPercent}%\nURL: ${product.productUrl}`,
              priceLabel: `EUR ${Number(product.price).toFixed(2)}`,
              discountLabel: `${product.discountPercent}%`,
              relatedProductIds:
                typeof product.structuredOutput === "object" &&
                product.structuredOutput &&
                !Array.isArray(product.structuredOutput) &&
                typeof (product.structuredOutput as { product?: { relatedProductIds?: unknown } }).product === "object"
                  ? ((((product.structuredOutput as { product?: { relatedProductIds?: unknown } }).product?.relatedProductIds as unknown[]) ?? [])
                      .map((item) => String(item))
                      .filter(Boolean))
                  : [],
              url: product.productUrl,
              imageUrl: product.images[0]?.fileAsset
                ? `/api/public/files/${product.images[0].fileAsset.id}?clientId=${defaultEasyvoxClient?.id ?? ""}`
                : null,
            }))
          : mockProducts.map((product) => ({
              slug: product.slug || normalizeEasyvoxLookup(product.name).replace(/\s+/g, "-"),
              name: product.name,
              description: product.description,
              relatedProductIds: product.relatedProductIds,
              priceLabel: product.priceLabel,
              url: product.productUrl,
            }));
      const selectedProduct = resolveContextualProduct(parsed.data.message, easyvoxProducts, null);
      if (selectedProduct) {
        return jsonOrStreamResponse({
          reply: formatCatalogProductReply(selectedProduct),
          assistantName: "Assistant",
          usageEstimate: { inputTokens: null, outputTokens: null },
          sources: [],
          provider: systemRuntimeSettings.provider,
          mode: "easyvox-chat",
          appointmentCreated: false,
          appointmentId: null,
          productCard: toProductCard(selectedProduct),
        }, stream);
      }
      if (isCatalogListQuestion(parsed.data.message) && easyvoxProducts.length > 0) {
        return jsonOrStreamResponse({
          reply: formatCatalogListReply(easyvoxProducts),
          assistantName: "Assistant",
          usageEstimate: { inputTokens: null, outputTokens: null },
          sources: [],
          provider: systemRuntimeSettings.provider,
          mode: "easyvox-chat",
          appointmentCreated: false,
          appointmentId: null,
          productCard: null,
        }, stream);
      }
      const easyvoxCustomerLine =
        effectiveCustomerName || effectiveCustomerEmail
          ? `\nCliente: ${effectiveCustomerName || "Cliente"}${effectiveCustomerEmail ? ` (${effectiveCustomerEmail})` : ""}.`
          : "";
      const easyvoxSystemPrompt =
        systemRuntimeSettings.easyvoxSystemPrompt?.trim() ||
        DEFAULT_EASYVOX_SYSTEM_PROMPT;
      const infoDirective = isEasyvoxInfoQuestion(parsed.data.message)
        ? `\n\n${EASYVOX_INFO_PROMPT}`
        : "";
      const serviceDetailsDirective = isEasyvoxSpecificServiceQuestion(parsed.data.message)
        ? `\n\n${EASYVOX_SERVICE_DETAILS_PROMPT}`
        : "";
      const selectedServiceDirective = buildEasyvoxSelectedServiceDirective(parsed.data.message, easyvoxProducts);
      const quoteDirective = isEasyvoxQuoteQuestion(parsed.data.message)
        ? `\n\n${EASYVOX_QUOTE_PROMPT}`
        : "";
      const pricingDirective = isEasyvoxPricingQuestion(parsed.data.message)
        ? `\n\n${EASYVOX_PRICING_PROMPT}`
        : "";
      const completion = await completeChatWithProvider(
        {
          systemPrompt: `${easyvoxSystemPrompt}${infoDirective}${serviceDetailsDirective}${selectedServiceDirective}${quoteDirective}${pricingDirective}
Rivolgiti sempre al cliente per nome quando appropriato.${easyvoxCustomerLine}
Puoi usare markdown semplice quando aiuta la leggibilita: paragrafi brevi, elenchi puntati o numerati, grassetto leggero per evidenziare passaggi chiave. Evita tabelle e HTML.`,
          userPrompt: parsed.data.message,
        },
        systemRuntimeSettings,
      );
      const reply = sanitizeChatText(completion.reply);

      return jsonOrStreamResponse({
        reply,
        assistantName: "Assistant",
        usageEstimate: completion.usageEstimate,
        sources: [],
        provider: systemRuntimeSettings.provider,
        mode: "easyvox-chat",
        appointmentCreated: false,
        appointmentId: null,
        productCard: null,
      }, stream);
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
      isSuspended: true,
    },
  });

  if (!client) return jsonError("Tenant non trovato", 404);
  if (client.isSuspended) return jsonError("Tenant sospeso. Chat temporaneamente non disponibile.", 423);
  const access = authUser ? await getTenantAccess(client.id, authUser.id) : null;
  const isOwner = access?.isOwner ?? false;
  const hasTenantAccess = access?.hasAccess ?? false;

  if (client.requireUserAuthForChat && !authUser) {
    return jsonError("Accesso richiesto: effettua login con email e password.", 401);
  }
  if (client.requireUserAuthForChat && !hasTenantAccess) {
    return jsonError("Non autorizzato per questo tenant.", 403);
  }
  if (client.requireUserAuthForChat && authCustomerEmail) {
    effectiveCustomerEmail = authCustomerEmail;
    if (!effectiveCustomerName) {
      effectiveCustomerName = authCustomerName || "Cliente";
    }
  }

  if (authUser && hasTenantAccess) {
    await touchTenantMembership(client.id, authUser.id, isOwner);
  }

  if (client.requireProfiling && !effectiveAnonymousTest && (!effectiveCustomerName || !effectiveCustomerEmail)) {
    return jsonError("Profilazione obbligatoria: nome ed email sono richiesti prima di chattare.", 400);
  }
  if (!effectiveAnonymousTest && !effectiveCustomerName) {
    return jsonError("Prima di iniziare la chat e richiesto almeno il nome del cliente.", 400);
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
      const tenantTx = tx as typeof tx & {
        chatCustomer: {
          upsert: (args: {
            where: {
              clientId_normalizedName: {
                clientId: string;
                normalizedName: string;
              };
            };
            update: {
              name: string;
              email?: string | undefined;
              lastSessionId: string;
            };
            create: {
              clientId: string;
              name: string;
              normalizedName: string;
              email: string | null;
              lastSessionId: string;
            };
            select: { id: true; name: true };
          }) => Promise<{ id: string; name: string }>;
        };
        conversation: {
          findMany: typeof tx.conversation.findMany;
          create: (args: {
            data: {
              clientId: string;
              customerId: string | null;
              sessionId: string;
              userMessage: string;
              assistantMessage: string;
            };
          }) => Promise<unknown>;
        };
      };
      const chunks = await retrieveTopChunks(tx, resolvedClientId, embedding, 5);
      const context = chunks.map((chunk, index) => `[${index + 1}] ${chunk.content}`).join("\n\n");
      const nowIso = new Date().toISOString();
      const customerName = effectiveCustomerName;
      const customerEmail = effectiveCustomerEmail;
      const normalizedCustomerName = normalizeCustomerName(customerName);
      const chatCustomer = !effectiveAnonymousTest && normalizedCustomerName
        ? await tenantTx.chatCustomer.upsert({
            where: {
              clientId_normalizedName: {
                clientId: resolvedClientId,
                normalizedName: normalizedCustomerName,
              },
            },
            update: {
              name: customerName,
              email: customerEmail || undefined,
              lastSessionId: parsed.data.sessionId,
            },
            create: {
              clientId: resolvedClientId,
              name: customerName,
              normalizedName: normalizedCustomerName,
              email: customerEmail || null,
              lastSessionId: parsed.data.sessionId,
            },
            select: {
              id: true,
              name: true,
            },
          })
        : null;
      const previousMessages = await tenantTx.conversation.findMany({
        where: {
          clientId: resolvedClientId,
          ...(chatCustomer
            ? { customerId: chatCustomer.id }
            : { sessionId: parsed.data.sessionId }),
        },
        orderBy: { createdAt: "desc" },
        take: MAX_CONVERSATION_MEMORY_MESSAGES,
        select: {
          userMessage: true,
          assistantMessage: true,
        },
      });
      const chronologicalMessages = previousMessages.reverse();
      const conversationMemory = buildConversationMemory(chronologicalMessages);
      const lastProductContext = extractLastProductContext(chronologicalMessages);
      const catalogProducts = await tx.product.findMany({
        where: { clientId: resolvedClientId },
        orderBy: { createdAt: "desc" },
        include: {
          images: {
            orderBy: { sortOrder: "asc" },
            take: 1,
            include: {
              fileAsset: {
                select: { id: true },
              },
            },
          },
        },
      });

      const intentAnalysis = await detectAppointmentIntent(
        parsed.data.message,
        nowIso,
        runtimeSettings,
        conversationMemory,
      ).catch(() => null);
      const regexCrm = extractCrmFromMessage(parsed.data.message);
      const mergedCrm = mergeCrmContact(intentAnalysis?.data.crmContact, regexCrm);
      let finalReply = "";
      let usageEstimate: UsageEstimate = { inputTokens: null, outputTokens: null };
      let appointmentCreated = false;
      let appointmentId: string | null = null;
      let productCard: ChatSuccessResult["productCard"] = null;
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
        const selectedCatalogProductRecord = getSelectedEasyvoxService(
          parsed.data.message,
          catalogProducts.map((product) => ({
            slug: product.slug,
            name: product.title,
            description: product.description,
            priceLabel: `EUR ${Number(product.price).toFixed(2)}`,
            discountLabel: `${product.discountPercent}%`,
            url: product.productUrl,
            imageUrl: product.images[0]?.fileAsset
              ? `/api/public/files/${product.images[0].fileAsset.id}?clientId=${resolvedClientId}`
              : null,
          })),
        );
        const contextualCatalogProduct = resolveContextualProduct(
          parsed.data.message,
          catalogProducts.map((product) => ({
            slug: product.slug,
            name: product.title,
            description: product.description,
            priceLabel: `EUR ${Number(product.price).toFixed(2)}`,
            discountLabel: `${product.discountPercent}%`,
            url: product.productUrl,
            imageUrl: product.images[0]?.fileAsset
              ? `/api/public/files/${product.images[0].fileAsset.id}?clientId=${resolvedClientId}`
              : null,
          })),
          lastProductContext,
        );
        const activeProduct = contextualCatalogProduct ?? selectedCatalogProductRecord;
        if (activeProduct) {
          finalReply = formatCatalogProductReply(activeProduct);
          usageEstimate = intentAnalysis?.usageEstimate ?? { inputTokens: null, outputTokens: null };
          productCard = toProductCard(activeProduct);
        } else if (isCatalogListQuestion(parsed.data.message) && catalogProducts.length > 0) {
          finalReply = formatCatalogListReply(
            catalogProducts.map((product) => ({
              name: product.title,
              description: product.description,
              priceLabel: `EUR ${Number(product.price).toFixed(2)}`,
              discountLabel: `${product.discountPercent}%`,
              url: product.productUrl,
              imageUrl: product.images[0]?.fileAsset
                ? `/api/public/files/${product.images[0].fileAsset.id}?clientId=${resolvedClientId}`
                : null,
            })),
          );
          usageEstimate = intentAnalysis?.usageEstimate ?? { inputTokens: null, outputTokens: null };
        } else {
        const customerDirective = customerName
          ? `Rivolgiti al cliente per nome quando appropriato: ${customerName}.`
          : anonymousTest
          ? "La sessione e anonima. Non fingere di conoscere il cliente e non chiedere dati personali se non sono necessari."
          : "Se non conosci il nome del cliente, chiedilo con naturalezza solo quando utile.";
        const selectedCatalogProduct = buildEasyvoxSelectedServiceDirective(
          parsed.data.message,
          catalogProducts.map((product) => ({
            name: product.title,
            description: `${product.description}\nPrezzo: EUR ${Number(product.price).toFixed(2)}\nSconto: ${product.discountPercent}%\nURL: ${product.productUrl}`,
          })),
        );
        const catalogDirective =
          catalogProducts.length > 0
            ? `\nCatalogo prodotti attivo:\n${catalogProducts
                .slice(0, 20)
                .map(
                  (product, index) =>
                    `${index + 1}. ${product.title} - EUR ${Number(product.price).toFixed(2)} - sconto ${product.discountPercent}% - ${product.productUrl}`,
                )
                .join("\n")}\nSe la richiesta riguarda prodotti o catalogo, usa prima questi elementi e invita l'utente ad aprire il dettaglio prodotto desiderato.`
            : "";
        const systemPrompt = `${client.systemPrompt ?? DEFAULT_CLIENT_SYSTEM_PROMPT}\n\nSe non sai qualcosa, dichiaralo esplicitamente.\n${customerDirective}${catalogDirective}${selectedCatalogProduct}\nPuoi usare markdown semplice quando migliora la leggibilita: paragrafi brevi, elenchi puntati o numerati, e **grassetto** solo per concetti chiave. Evita tabelle e HTML.`;
        const userPrompt = `Contesto RAG:
${context || "Nessun documento disponibile."}

Memoria cliente e conversazione recente:
${conversationMemory || "Nessuna memoria disponibile."}

Messaggio utente:
${parsed.data.message}`;

        const completion = await completeChatWithProvider(
          {
            systemPrompt,
            userPrompt,
          },
          runtimeSettings,
        );
        finalReply = sanitizeChatText(completion.reply);
        usageEstimate = intentAnalysis
          ? mergeUsage(intentAnalysis.usageEstimate, completion.usageEstimate)
          : completion.usageEstimate;
        }
      }

      await tenantTx.conversation.create({
        data: {
          clientId: resolvedClientId,
          customerId: chatCustomer?.id ?? null,
          sessionId: parsed.data.sessionId,
          userMessage: parsed.data.message,
          assistantMessage: productCard
            ? `${sanitizeChatText(finalReply)}\n\n${buildProductContextMarker({
                slug: catalogProducts.find((product) => product.productUrl === productCard.productUrl)?.slug,
                name: productCard.title,
                description: productCard.description,
                priceLabel: productCard.priceLabel,
                discountLabel: productCard.discountLabel ?? undefined,
                url: productCard.productUrl,
                imageUrl: productCard.imageUrl,
              })}`
            : sanitizeChatText(finalReply),
        },
      });

      const customerNameParts = splitFullName(customerName);
      const resolvedCrm: CrmContact = {
        ...mergedCrm,
        name: composeFullName(mergedCrm) || normalizeCrmText(customerName, 120) || "Contatto chat",
        firstName: mergedCrm.firstName || customerNameParts.firstName,
        lastName: mergedCrm.lastName || customerNameParts.lastName,
        email: mergedCrm.email?.trim() || customerEmail || null,
        productInterest: mergedCrm.productInterest || productCard?.title || null,
        interestType: mergedCrm.interestType || inferInterestType(parsed.data.message),
      };

      let leadSnapshot: {
        id: string;
        name: string;
        firstName: string | null;
        lastName: string | null;
        email: string | null;
        phone: string | null;
        website: string | null;
        productInterest: string | null;
        interestType: string | null;
        city: string | null;
        purchaseEmailSentAt: Date | null;
      } | null = await tx.lead.findFirst({
        where: { clientId: resolvedClientId, sessionId: parsed.data.sessionId },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          name: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          website: true,
          productInterest: true,
          interestType: true,
          city: true,
          purchaseEmailSentAt: true,
        },
      });

      if (leadSnapshot) {
        leadSnapshot = await tx.lead.update({
          where: { id: leadSnapshot.id },
          data: {
            name: resolvedCrm.name || leadSnapshot.name,
            firstName: resolvedCrm.firstName || leadSnapshot.firstName,
            lastName: resolvedCrm.lastName || leadSnapshot.lastName,
            email: resolvedCrm.email || leadSnapshot.email,
            phone: resolvedCrm.phone?.trim() || leadSnapshot.phone,
            website: resolvedCrm.website?.trim() || leadSnapshot.website,
            productInterest: resolvedCrm.productInterest || leadSnapshot.productInterest,
            interestType: resolvedCrm.interestType || leadSnapshot.interestType,
            city: resolvedCrm.city || leadSnapshot.city,
            message: parsed.data.message,
          },
          select: {
            id: true,
            name: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            website: true,
            productInterest: true,
            interestType: true,
            city: true,
            purchaseEmailSentAt: true,
          },
        });
      } else {
        leadSnapshot = await tx.lead.create({
          data: {
            clientId: resolvedClientId,
            sessionId: parsed.data.sessionId,
            name: resolvedCrm.name || "Contatto chat",
            firstName: resolvedCrm.firstName || null,
            lastName: resolvedCrm.lastName || null,
            email: resolvedCrm.email || null,
            phone: resolvedCrm.phone?.trim() || null,
            website: resolvedCrm.website?.trim() || null,
            productInterest: resolvedCrm.productInterest || null,
            interestType: resolvedCrm.interestType || null,
            city: resolvedCrm.city || null,
            message: parsed.data.message,
          },
          select: {
            id: true,
            name: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            website: true,
            productInterest: true,
            interestType: true,
            city: true,
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
        productCard,
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

    return jsonOrStreamResponse(safeResult, stream);
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Errore interno chat";
    return jsonError(detail, 500);
  }
}
