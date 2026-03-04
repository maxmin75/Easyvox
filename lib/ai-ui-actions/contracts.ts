import { z } from "zod";

export const chatRequestSchema = z.object({
  conversationId: z.string().trim().min(1).max(120),
  userMessage: z.string().trim().min(1).max(2000),
});

const showProductsSchema = z.object({
  type: z.literal("SHOW_PRODUCTS"),
  payload: z.object({
    query: z.string().trim().min(1).max(120).optional(),
    category: z.string().trim().min(1).max(80).optional(),
  }),
});

const openProductSchema = z.object({
  type: z.literal("OPEN_PRODUCT"),
  payload: z.object({
    productId: z.string().trim().min(1).max(120),
  }),
});

const openBookingModalSchema = z.object({
  type: z.literal("OPEN_BOOKING_MODAL"),
  payload: z.object({
    date: z.string().trim().min(1).max(40).optional(),
    time: z.string().trim().min(1).max(20).optional(),
    service: z.string().trim().min(1).max(120).optional(),
  }),
});

const openSupportFormSchema = z.object({
  type: z.literal("OPEN_SUPPORT_FORM"),
  payload: z.object({
    topic: z.string().trim().min(1).max(120).optional(),
  }),
});

const openCheckoutSchema = z.object({
  type: z.literal("OPEN_CHECKOUT"),
  payload: z.object({
    cartId: z.string().trim().min(1).max(120).optional(),
  }),
});

const noneActionSchema = z.object({
  type: z.literal("NONE"),
  payload: z.object({}).optional(),
});

export const actionSchema = z.discriminatedUnion("type", [
  showProductsSchema,
  openProductSchema,
  openBookingModalSchema,
  openSupportFormSchema,
  openCheckoutSchema,
  noneActionSchema,
]);

export const aiResponseEnvelopeSchema = z.object({
  message: z.string().trim().min(1).max(4000),
  actions: z.array(z.unknown()).default([]),
});

export type ChatRequest = z.infer<typeof chatRequestSchema>;
export type UiAction = z.infer<typeof actionSchema>;

export type SanitizedAiResponse = {
  message: string;
  actions: UiAction[];
};

export function sanitizeAiResponse(raw: unknown): SanitizedAiResponse {
  const parsed = aiResponseEnvelopeSchema.safeParse(raw);

  if (!parsed.success) {
    console.warn("[AI_UI_ACTIONS] Invalid AI response envelope", parsed.error.flatten());
    return {
      message: "Non sono riuscito a generare una risposta valida. Riprova.",
      actions: [],
    };
  }

  const validActions: UiAction[] = [];

  for (const candidate of parsed.data.actions) {
    const actionParsed = actionSchema.safeParse(candidate);
    if (!actionParsed.success) {
      console.warn("[AI_UI_ACTIONS] Discarded invalid action", actionParsed.error.flatten());
      continue;
    }
    validActions.push(actionParsed.data);
  }

  return {
    message: parsed.data.message,
    actions: validActions,
  };
}
