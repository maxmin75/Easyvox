import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export type QuoteSupportType = "istanza" | "server" | "macchina locale";
export type QuoteAiType = "primum open source";
export type QuoteTrainingType = "soft" | "medium" | "enterprise";

export type QuotePayload = {
  name: string;
  company: string;
  city: string;
  email: string;
  phone: string;
  support: QuoteSupportType;
  aiType: QuoteAiType;
  training: QuoteTrainingType;
  customizations?: string | null;
};

type QuoteAmounts = {
  setupInitial: number;
  monthly: number;
  training: number;
};

const SETUP_INITIAL = 1500;
const MONTHLY_BY_SUPPORT: Record<QuoteSupportType, number> = {
  istanza: 100,
  server: 180,
  "macchina locale": 0,
};
const TRAINING_BY_TYPE: Record<QuoteTrainingType, number> = {
  soft: 1000,
  medium: 2000,
  enterprise: 3000,
};

function euro(value: number): string {
  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value);
}

function supportLabel(support: QuoteSupportType): string {
  if (support === "istanza") return "Istanza EasyVox";
  if (support === "server") return "Server dedicato con dominio";
  return "Macchina locale del cliente";
}

function trainingLabel(training: QuoteTrainingType): string {
  if (training === "soft") return "Addestramento AI soft";
  if (training === "medium") return "Addestramento AI medium";
  return "Addestramento AI enterprise";
}

export function calculateQuoteAmounts(payload: QuotePayload): QuoteAmounts {
  return {
    setupInitial: SETUP_INITIAL,
    monthly: MONTHLY_BY_SUPPORT[payload.support],
    training: TRAINING_BY_TYPE[payload.training],
  };
}

export function buildQuoteSummary(payload: QuotePayload): string {
  const amounts = calculateQuoteAmounts(payload);
  const monthlyLine =
    amounts.monthly > 0
      ? `Canone mensile: ${euro(amounts.monthly)} / mese`
      : "Canone mensile: infrastruttura su macchina locale del cliente";

  return [
    `Preventivo EasyVox per ${payload.company}`,
    `Nome: ${payload.name}`,
    `Citta: ${payload.city}`,
    `Email: ${payload.email}`,
    `Telefono: ${payload.phone}`,
    `Supporto: ${supportLabel(payload.support)}`,
    `Tipologia AI: Primum open source`,
    `Addestramento: ${trainingLabel(payload.training)} (${euro(amounts.training)})`,
    `Setup iniziale Start & Go: ${euro(amounts.setupInitial)}`,
    monthlyLine,
    `Customizzazione: ${payload.customizations?.trim() || "su richiesta"}`,
  ].join("\n");
}

export async function buildQuotePdf(payload: QuotePayload): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595.28, 841.89]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const { width, height } = page.getSize();
  const amounts = calculateQuoteAmounts(payload);
  const totalInitial = amounts.setupInitial + amounts.training;

  let cursorY = height - 56;
  const left = 48;
  const maxWidth = width - left * 2;

  const drawLine = (text: string, y: number, size = 11, isBold = false) => {
    page.drawText(text, {
      x: left,
      y,
      size,
      font: isBold ? bold : font,
      color: rgb(0.1, 0.12, 0.16),
      maxWidth,
      lineHeight: size + 3,
    });
  };

  const section = (title: string) => {
    cursorY -= 10;
    page.drawRectangle({
      x: left,
      y: cursorY - 6,
      width: maxWidth,
      height: 24,
      color: rgb(0.94, 0.96, 0.99),
    });
    drawLine(title, cursorY, 12, true);
    cursorY -= 26;
  };

  drawLine("Preventivo EasyVox", cursorY, 20, true);
  cursorY -= 22;
  drawLine("AI orchestratrice aziendale", cursorY, 11, false);
  cursorY -= 20;
  drawLine(`Data: ${new Date().toLocaleDateString("it-IT")}`, cursorY, 10);
  cursorY -= 24;

  section("Dati cliente");
  drawLine(`Nome: ${payload.name}`, cursorY);
  cursorY -= 16;
  drawLine(`Ditta: ${payload.company}`, cursorY);
  cursorY -= 16;
  drawLine(`Citta: ${payload.city}`, cursorY);
  cursorY -= 16;
  drawLine(`Email: ${payload.email}`, cursorY);
  cursorY -= 16;
  drawLine(`Telefono: ${payload.phone}`, cursorY);
  cursorY -= 24;

  section("Configurazione proposta");
  drawLine(`Supporto: ${supportLabel(payload.support)}`, cursorY);
  cursorY -= 16;
  drawLine(`Tipologia AI: Primum open source`, cursorY);
  cursorY -= 16;
  drawLine(`Addestramento: ${trainingLabel(payload.training)}`, cursorY);
  cursorY -= 24;

  section("Costi iniziali");
  drawLine(`Setup iniziale Start & Go: ${euro(amounts.setupInitial)}`, cursorY);
  cursorY -= 16;
  drawLine(`${trainingLabel(payload.training)}: ${euro(amounts.training)}`, cursorY);
  cursorY -= 16;
  drawLine(`Totale iniziale: ${euro(totalInitial)}`, cursorY, 11, true);
  cursorY -= 24;

  section("Costi mensili");
  if (amounts.monthly > 0) {
    drawLine(`${supportLabel(payload.support)}: ${euro(amounts.monthly)} / mese`, cursorY);
  } else {
    drawLine("Canone mensile infrastruttura: su macchina locale del cliente", cursorY);
  }
  cursorY -= 16;
  drawLine(
    amounts.monthly > 0
      ? `Totale mensile: ${euro(amounts.monthly)} / mese`
      : "Totale mensile: nessun canone infrastrutturale EasyVox incluso",
    cursorY,
    11,
    true,
  );
  cursorY -= 24;

  section("Voci su richiesta");
  drawLine(
    payload.customizations?.trim()
      ? `Customizzazione richiesta: ${payload.customizations.trim()}`
      : "Customizzazione: su richiesta",
    cursorY,
  );
  cursorY -= 28;

  drawLine(
    "Nota: il preventivo distingue avvio, infrastruttura e livello di addestramento del sistema.",
    cursorY,
    10,
  );

  return pdf.save();
}
