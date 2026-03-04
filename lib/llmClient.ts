import { AI_UI_SYSTEM_PROMPT } from "@/lib/systemPrompt";

type LlmRequest = {
  conversationId: string;
  userMessage: string;
};

export async function llmClient(request: LlmRequest): Promise<unknown> {
  // Mocked LLM behavior for MVP. The prompt is defined now so a real provider can reuse it later.
  void AI_UI_SYSTEM_PROMPT;

  const message = request.userMessage.toLowerCase();

  if (message.includes("catalogo") || message.includes("prodotti") || message.includes("cerca")) {
    return {
      message: "Ti mostro alcuni prodotti che potrebbero interessarti.",
      actions: [
        {
          type: "SHOW_PRODUCTS",
          payload: {
            query: message.includes("audio") ? "audio" : undefined,
            category: message.includes("smart") ? "smart-home" : undefined,
          },
        },
      ],
    };
  }

  if (message.includes("dettaglio") || message.includes("apri prodotto") || message.includes("p-")) {
    const matched = request.userMessage.match(/p-\d{3}/i)?.[0]?.toLowerCase() ?? "p-001";
    return {
      message: "Apro il dettaglio prodotto richiesto.",
      actions: [{ type: "OPEN_PRODUCT", payload: { productId: matched } }],
    };
  }

  if (message.includes("prenot") || message.includes("booking") || message.includes("appuntamento")) {
    return {
      message: "Possiamo procedere con la prenotazione.",
      actions: [
        {
          type: "OPEN_BOOKING_MODAL",
          payload: {
            service: "Consulenza prodotto",
          },
        },
      ],
    };
  }

  if (message.includes("supporto") || message.includes("assistenza") || message.includes("help")) {
    return {
      message: "Apro il form di supporto per raccogliere i dettagli.",
      actions: [{ type: "OPEN_SUPPORT_FORM", payload: { topic: "Assistenza generale" } }],
    };
  }

  if (message.includes("voglio acquistare il servizio")) {
    return {
      message: "Apro la modale laterale sinistra per acquistare il servizio.",
      actions: [{ type: "OPEN_CHECKOUT", payload: { cartId: "service-purchase" } }],
    };
  }

  if (message.includes("checkout") || message.includes("pagamento") || message.includes("carrello")) {
    return {
      message: "Procediamo al checkout.",
      actions: [{ type: "OPEN_CHECKOUT", payload: { cartId: request.conversationId } }],
    };
  }

  return {
    message: "Posso mostrarti prodotti, aprire un dettaglio, supporto, prenotazione o checkout.",
    actions: [{ type: "NONE", payload: {} }],
  };
}
