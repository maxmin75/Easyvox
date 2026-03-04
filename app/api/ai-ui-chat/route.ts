import { NextRequest, NextResponse } from "next/server";
import { chatRequestSchema, sanitizeAiResponse } from "@/lib/ai-ui-actions/contracts";
import { checkRateLimit } from "@/lib/ai-ui-actions/rateLimit";
import { llmClient } from "@/lib/llmClient";

export const runtime = "nodejs";

const MAX_REQUESTS = 20;
const WINDOW_MS = 60_000;

function getClientIp(req: NextRequest): string {
  const header = req.headers.get("x-forwarded-for");
  if (header) {
    const first = header.split(",")[0]?.trim();
    if (first) return first;
  }
  return "unknown-ip";
}

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const allowed = checkRateLimit(ip, MAX_REQUESTS, WINDOW_MS);
    if (!allowed) {
      return NextResponse.json(
        {
          message: "Troppi tentativi ravvicinati. Riprova tra qualche secondo.",
          actions: [],
        },
        { status: 429 },
      );
    }

    const body = await req.json();
    const parsed = chatRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          message: "Richiesta non valida.",
          actions: [],
          issues: parsed.error.flatten(),
        },
        { status: 400 },
      );
    }

    const rawAiResponse = await llmClient({
      conversationId: parsed.data.conversationId,
      userMessage: parsed.data.userMessage,
    });

    const response = sanitizeAiResponse(rawAiResponse);
    return NextResponse.json(response);
  } catch (error) {
    console.error("[AI_UI_ACTIONS] /api/ai-ui-chat failed", error);
    return NextResponse.json(
      {
        message: "Errore interno. Riprova più tardi.",
        actions: [],
      },
      { status: 500 },
    );
  }
}
