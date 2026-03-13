import type { Prisma } from "@prisma/client";
import { createEmbeddingWithProvider } from "@/lib/ai/provider";
import { getRuntimeSettings } from "@/lib/runtime-settings";
import { chunkText } from "@/lib/rag/chunking";
import { embeddingToVectorLiteral } from "@/lib/rag/embeddings";

export type ProductStructuredOutput = {
  schemaVersion: "1.0";
  type: "product";
  product: {
    id: string;
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
    url: string;
    currency: "EUR";
    relatedProductIds: string[];
    images: Array<{
      fileAssetId: string;
      filename: string;
      mimeType: string;
      sortOrder: number;
      url?: string | null;
      source?: "uploaded" | "external";
    }>;
  };
};

export type CatalogProductRecord = {
  id: string;
  clientId: string;
  slug: string;
  title: string;
  description: string;
  price: Prisma.Decimal;
  discountPercent: number;
  productUrl: string;
  structuredOutput: Prisma.JsonValue;
  knowledgeDocumentId: string | null;
  createdAt: Date;
  updatedAt: Date;
  images: Array<{
    id: string;
    sortOrder: number;
    fileAsset: {
      id: string;
      filename: string;
      mimeType: string;
      sizeBytes: number;
      createdAt: Date;
    };
  }>;
};

export type CatalogProductView = {
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
  structuredOutput: ProductStructuredOutput;
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

export function slugifyProduct(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function formatEuroPrice(value: number): string {
  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
    .format(value)
    .replace(/\u00a0/g, " ");
}

function summarizeProductDescription(value: string): string {
  const normalized = value.trim().replace(/\s+/g, " ");
  if (normalized.length <= 160) return normalized;
  return `${normalized.slice(0, 157).trimEnd()}...`;
}

export function buildProductStructuredOutput(product: {
  id: string;
  slug: string;
  title: string;
  description: string;
  shortDescription?: string;
  price: number;
  discountPercent: number;
  productUrl: string;
  relatedProductIds?: string[];
  images: Array<{
    fileAssetId: string;
    filename: string;
    mimeType: string;
    sortOrder: number;
    url?: string | null;
    source?: "uploaded" | "external";
  }>;
}): ProductStructuredOutput {
  const discountPercent = Math.max(0, Math.min(100, product.discountPercent));
  const discountedPrice = Number((product.price * (1 - discountPercent / 100)).toFixed(2));
  const shortDescription = product.shortDescription?.trim() || summarizeProductDescription(product.description);
  const priceFormatted = formatEuroPrice(Number(product.price.toFixed(2)));
  const discountedPriceFormatted = formatEuroPrice(discountedPrice);
  const relatedProductIds = Array.from(
    new Set((product.relatedProductIds ?? []).map((item) => item.trim()).filter(Boolean)),
  ).filter((item) => item !== product.id);

  return {
    schemaVersion: "1.0",
    type: "product",
    product: {
      id: product.id,
      slug: product.slug,
      title: product.title,
      shortDescription,
      description: product.description,
      longDescription: product.description,
      price: Number(product.price.toFixed(2)),
      priceFormatted,
      discountPercent,
      discountedPrice,
      discountedPriceFormatted,
      url: product.productUrl,
      currency: "EUR",
      relatedProductIds,
      images: product.images.map((image) => ({
        fileAssetId: image.fileAssetId,
        filename: image.filename,
        mimeType: image.mimeType,
        sortOrder: image.sortOrder,
        url: image.url ?? null,
        source: image.source ?? "uploaded",
      })),
    },
  };
}

function normalizeStructuredOutput(product: {
  id: string;
  slug: string;
  title: string;
  description: string;
  price: Prisma.Decimal;
  discountPercent: number;
  productUrl: string;
  structuredOutput: Prisma.JsonValue;
  images: Array<{
    fileAsset: {
      id: string;
      filename: string;
      mimeType: string;
    };
    sortOrder: number;
  }>;
}): ProductStructuredOutput {
  const fallback = buildProductStructuredOutput({
    id: product.id,
    slug: product.slug,
    title: product.title,
    description: product.description,
    price: Number(product.price),
    discountPercent: product.discountPercent,
    productUrl: product.productUrl,
    images: product.images.map((image) => ({
      fileAssetId: image.fileAsset.id,
      filename: image.fileAsset.filename,
      mimeType: image.fileAsset.mimeType,
      sortOrder: image.sortOrder,
    })),
  });

  const raw =
    typeof product.structuredOutput === "object" && product.structuredOutput && !Array.isArray(product.structuredOutput)
      ? (product.structuredOutput as Partial<ProductStructuredOutput>)
      : null;
  const rawProduct =
    raw && typeof raw.product === "object" && raw.product && !Array.isArray(raw.product)
      ? (raw.product as Partial<ProductStructuredOutput["product"]>)
      : null;

  return {
    ...fallback,
    schemaVersion: raw?.schemaVersion === "1.0" ? "1.0" : fallback.schemaVersion,
    type: raw?.type === "product" ? "product" : fallback.type,
    product: {
      ...fallback.product,
      ...(rawProduct ?? {}),
      id: fallback.product.id,
      slug: rawProduct?.slug?.trim() || fallback.product.slug,
      title: rawProduct?.title?.trim() || fallback.product.title,
      shortDescription: rawProduct?.shortDescription?.trim() || fallback.product.shortDescription,
      description: rawProduct?.description?.trim() || rawProduct?.longDescription?.trim() || fallback.product.description,
      longDescription: rawProduct?.longDescription?.trim() || rawProduct?.description?.trim() || fallback.product.longDescription,
      price: fallback.product.price,
      priceFormatted: rawProduct?.priceFormatted?.trim() || fallback.product.priceFormatted,
      discountPercent: fallback.product.discountPercent,
      discountedPrice: fallback.product.discountedPrice,
      discountedPriceFormatted:
        rawProduct?.discountedPriceFormatted?.trim() || fallback.product.discountedPriceFormatted,
      url: rawProduct?.url?.trim() || fallback.product.url,
      currency: "EUR",
      relatedProductIds: Array.isArray(rawProduct?.relatedProductIds)
        ? rawProduct.relatedProductIds.map((item) => String(item).trim()).filter(Boolean)
        : fallback.product.relatedProductIds,
      images:
        Array.isArray(rawProduct?.images) && rawProduct.images.length > 0
          ? rawProduct.images.map((image, index) => ({
              fileAssetId:
                typeof image?.fileAssetId === "string" && image.fileAssetId.trim()
                  ? image.fileAssetId.trim()
                  : `external-${index}`,
              filename:
                typeof image?.filename === "string" && image.filename.trim()
                  ? image.filename.trim()
                  : `image-${index + 1}`,
              mimeType:
                typeof image?.mimeType === "string" && image.mimeType.trim()
                  ? image.mimeType.trim()
                  : "image/jpeg",
              sortOrder: typeof image?.sortOrder === "number" ? image.sortOrder : index,
              url: typeof image?.url === "string" && image.url.trim() ? image.url.trim() : null,
              source: image?.source === "external" ? "external" : "uploaded",
            }))
          : fallback.product.images,
    },
  };
}

function buildProductKnowledgeText(structured: ProductStructuredOutput) {
  const imageLines =
    structured.product.images.length > 0
      ? structured.product.images
          .map(
            (image, index) =>
              `${index + 1}. ${image.filename} (${image.mimeType}) fileAssetId=${image.fileAssetId}${image.url ? ` url=${image.url}` : ""}`,
          )
          .join("\n")
      : "Nessuna immagine caricata";

  return [
    `PRODUCT_CARD`,
    `Titolo: ${structured.product.title}`,
    `Slug: ${structured.product.slug}`,
    `Descrizione breve: ${structured.product.shortDescription}`,
    `Descrizione estesa: ${structured.product.longDescription}`,
    `Prezzo: ${structured.product.priceFormatted}`,
    `Sconto: ${structured.product.discountPercent}%`,
    `Prezzo scontato: ${structured.product.discountedPriceFormatted}`,
    `URL: ${structured.product.url}`,
    `Prodotti correlati: ${structured.product.relatedProductIds.join(", ") || "Nessuno"}`,
    `Immagini:\n${imageLines}`,
    `Structured Output JSON:`,
    JSON.stringify(structured, null, 2),
  ].join("\n\n");
}

export async function syncProductKnowledge(
  tx: Prisma.TransactionClient,
  input: {
    clientId: string;
    productId: string;
    title: string;
    structuredOutput: ProductStructuredOutput;
    knowledgeDocumentId?: string | null;
  },
) {
  const runtimeSettings = await getRuntimeSettings();
  const knowledgeText = buildProductKnowledgeText(input.structuredOutput);
  const chunks = chunkText(knowledgeText);
  if (chunks.length === 0) {
    throw new Error("Structured output prodotto vuoto");
  }

  let documentId = input.knowledgeDocumentId ?? null;

  if (documentId) {
    await tx.$executeRaw`DELETE FROM chunks WHERE document_id = ${documentId}::uuid`;
    await tx.document.update({
      where: { id: documentId },
      data: {
        title: input.title,
        source: `product:${input.productId}`,
      },
    });
  } else {
    const document = await tx.document.create({
      data: {
        clientId: input.clientId,
        title: input.title,
        source: `product:${input.productId}`,
      },
    });
    documentId = document.id;
  }

  for (const chunk of chunks) {
    const embedding = await createEmbeddingWithProvider(chunk, runtimeSettings);
    const vector = embeddingToVectorLiteral(embedding);

    await tx.$executeRaw`
      INSERT INTO chunks (client_id, document_id, content, metadata, embedding)
      VALUES (
        ${input.clientId}::uuid,
        ${documentId}::uuid,
        ${chunk},
        ${JSON.stringify({ source: `product:${input.productId}`, kind: "product-catalog" })}::jsonb,
        ${vector}::vector
      )
    `;
  }

  if (documentId !== input.knowledgeDocumentId) {
    await tx.product.update({
      where: { id: input.productId },
      data: { knowledgeDocumentId: documentId },
    });
  }

  return { documentId, chunkCount: chunks.length };
}

export async function deleteProductKnowledge(
  tx: Prisma.TransactionClient,
  knowledgeDocumentId: string | null | undefined,
) {
  if (!knowledgeDocumentId) return;
  await tx.$executeRaw`DELETE FROM chunks WHERE document_id = ${knowledgeDocumentId}::uuid`;
  await tx.document.deleteMany({
    where: { id: knowledgeDocumentId },
  });
}

export function serializeCatalogProduct(product: CatalogProductRecord): CatalogProductView {
  const structured = normalizeStructuredOutput(product);
  const uploadedImages = product.images.map((image) => ({
    id: image.id,
    fileAssetId: image.fileAsset.id,
    filename: image.fileAsset.filename,
    mimeType: image.fileAsset.mimeType,
    sizeBytes: image.fileAsset.sizeBytes,
    sortOrder: image.sortOrder,
    url: `/api/public/files/${image.fileAsset.id}?clientId=${product.clientId}`,
    createdAt: image.fileAsset.createdAt.toISOString(),
  }));
  const uploadedImageKeys = new Set(uploadedImages.map((image) => image.fileAssetId));
  const externalImages = structured.product.images
    .filter((image) => image.url && !uploadedImageKeys.has(image.fileAssetId))
    .map((image, index) => ({
      id: `external-${product.id}-${index}`,
      fileAssetId: image.fileAssetId,
      filename: image.filename,
      mimeType: image.mimeType,
      sizeBytes: 0,
      sortOrder: image.sortOrder,
      url: image.url ?? "",
      createdAt: product.updatedAt.toISOString(),
    }));

  return {
    id: product.id,
    clientId: product.clientId,
    slug: product.slug,
    title: product.title,
    shortDescription: structured.product.shortDescription,
    description: structured.product.description,
    longDescription: structured.product.longDescription,
    price: Number(product.price),
    priceFormatted: structured.product.priceFormatted,
    discountPercent: product.discountPercent,
    discountedPrice: Number((Number(product.price) * (1 - product.discountPercent / 100)).toFixed(2)),
    discountedPriceFormatted: structured.product.discountedPriceFormatted,
    productUrl: product.productUrl,
    relatedProductIds: structured.product.relatedProductIds,
    structuredOutput: structured,
    knowledgeDocumentId: product.knowledgeDocumentId,
    createdAt: product.createdAt.toISOString(),
    updatedAt: product.updatedAt.toISOString(),
    images: [...uploadedImages, ...externalImages].sort((left, right) => left.sortOrder - right.sortOrder),
  };
}
