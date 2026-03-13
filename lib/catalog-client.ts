export type CatalogProduct = {
  id: string;
  clientId: string;
  slug: string;
  title: string;
  shortDescription: string;
  description: string;
  longDescription: string;
  price: number;
  priceFormatted: string;
  discountPercent: number;
  discountedPrice: number;
  discountedPriceFormatted: string;
  productUrl: string;
  relatedProductIds: string[];
  structuredOutput: unknown;
  knowledgeDocumentId: string | null;
  createdAt: string;
  updatedAt: string;
  images: Array<{
    id: string;
    fileAssetId: string;
    filename: string;
    mimeType: string;
    sizeBytes: number;
    sortOrder: number;
    url: string;
    createdAt: string;
  }>;
};

export async function fetchCatalogProducts(input: {
  clientId?: string;
  clientSlug?: string;
  signal?: AbortSignal;
}) {
  const params = new URLSearchParams();
  if (input.clientId) params.set("clientId", input.clientId);
  if (input.clientSlug) params.set("clientSlug", input.clientSlug);

  const response = await fetch(`/api/products?${params.toString()}`, {
    signal: input.signal,
    cache: "no-store",
  });
  const data = (await response.json()) as { products?: CatalogProduct[]; error?: string };

  if (!response.ok) {
    throw new Error(data.error ?? "Errore caricamento catalogo");
  }

  return data.products ?? [];
}
