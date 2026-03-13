type CatalogCategory = "all" | "conversazione" | "crm-automazione" | "infrastruttura";

type CatalogOpenIntent = {
  shouldOpen: boolean;
  category: CatalogCategory;
  query: string;
};

const OPEN_CATALOG_PATTERNS = [
  /\bapri(?:mi)?\s+(?:il\s+)?catalogo\b/i,
  /\bapri(?:mi)?\s+(?:la\s+)?sezione\s+catalogo\b/i,
  /\bmostra(?:mi)?\s+(?:il\s+)?catalogo\b/i,
  /\bfammi\s+vedere\s+(?:il\s+)?catalogo\b/i,
  /\bapri(?:mi)?\s+(?:l[aeo]\s+)?lista\s+servizi\b/i,
  /\bmostra(?:mi)?\s+(?:i\s+)?servizi\b/i,
  /\bfammi\s+vedere\s+(?:i\s+)?servizi\b/i,
  /\belenco\s+servizi\b/i,
  /\blista\s+servizi\b/i,
  /\bservizi\s+disponibili\b/i,
  /\bcosa\s+offre\s+easyvox\b/i,
  /\bcosa\s+fa\s+easyvox\b/i,
];

const CONVERSAZIONE_PATTERNS = [
  /\bai\s+conversazionale\b/i,
  /\bpresentazione\s+prodotti\s+e\s+servizi\b/i,
  /\braccolta\s+contatti\b/i,
  /\bmemoria\s+cliente\b/i,
];

const CRM_AUTOMAZIONE_PATTERNS = [
  /\bcrm\b/i,
  /\bcrm\s+interno\b/i,
  /\bautomazione\s+email\b/i,
  /\bautomazione\s+processi\b/i,
  /\baddestramento\b/i,
];

const INFRASTRUTTURA_PATTERNS = [
  /\bchat\s+embeddabile\b/i,
  /\bistanza\b/i,
  /\binstallazione\s+in\s+locale\b/i,
  /\bserver\s+dedicato\b/i,
  /\bsetup\b/i,
  /\bcustomizzazione\b/i,
];

function extractCategory(message: string): CatalogCategory {
  if (CONVERSAZIONE_PATTERNS.some((pattern) => pattern.test(message))) return "conversazione";
  if (CRM_AUTOMAZIONE_PATTERNS.some((pattern) => pattern.test(message))) return "crm-automazione";
  if (INFRASTRUTTURA_PATTERNS.some((pattern) => pattern.test(message))) return "infrastruttura";
  return "all";
}

function extractQuery(message: string): string {
  const clean = message.trim().toLowerCase();
  if (!clean) return "";

  const knownTerms = [
    "ai conversazionale",
    "presentazione prodotti e servizi",
    "raccolta contatti",
    "crm interno easyvox",
    "crm interno",
    "memoria cliente",
    "automazione email",
    "automazione processi",
    "addestramento dedicato ai",
    "chat embeddabile",
    "installazione su istanza easyvox",
    "installazione in locale",
    "server dedicato con dominio",
    "setup iniziale start & go",
    "customizzazione su richiesta",
  ];

  return knownTerms.find((term) => clean.includes(term)) ?? "";
}

export function getCatalogOpenIntent(message: string): CatalogOpenIntent {
  const normalized = message.trim();
  if (!normalized) {
    return { shouldOpen: false, category: "all", query: "" };
  }

  const shouldOpen = OPEN_CATALOG_PATTERNS.some((pattern) => pattern.test(normalized));
  if (!shouldOpen) {
    return { shouldOpen: false, category: "all", query: "" };
  }

  return {
    shouldOpen: true,
    category: extractCategory(normalized),
    query: extractQuery(normalized),
  };
}
