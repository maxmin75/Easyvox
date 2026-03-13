import { mockProducts } from "@/lib/mockProducts";
import type { CatalogProduct } from "@/lib/catalog-client";

function mockToCatalogProduct(product: (typeof mockProducts)[number]): CatalogProduct {
  const numericPrice = Number(product.price) || 0;
  const discountPercent = Number(product.discountPercent) || 0;
  const discountedPrice = Number((numericPrice * (1 - discountPercent / 100)).toFixed(2));
  return {
    id: product.id,
    clientId: "demo",
    slug: product.slug,
    title: product.name,
    shortDescription: product.shortDescription,
    description: product.description,
    longDescription: product.description,
    price: numericPrice,
    priceFormatted: product.priceFormatted,
    discountPercent,
    discountedPrice,
    discountedPriceFormatted:
      discountPercent > 0
        ? new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(discountedPrice)
        : product.priceFormatted,
    productUrl: product.productUrl || "#",
    relatedProductIds: product.relatedProductIds,
    structuredOutput: {
      schemaVersion: "1.0",
      type: "product",
      product: {
        id: product.id,
        slug: product.slug,
        title: product.name,
        shortDescription: product.shortDescription,
        description: product.description,
        longDescription: product.description,
        price: numericPrice,
        priceFormatted: product.priceFormatted,
        discountPercent,
        discountedPrice,
        discountedPriceFormatted:
          discountPercent > 0
            ? new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(discountedPrice)
            : product.priceFormatted,
        url: product.productUrl || "#",
        currency: "EUR",
        relatedProductIds: product.relatedProductIds,
        images: product.image
          ? [
              {
                fileAssetId: `${product.id}-external-image`,
                filename: `${product.slug}.jpg`,
                mimeType: "image/jpeg",
                sortOrder: 0,
                url: product.image,
                source: "external",
              },
            ]
          : [],
      },
    },
    knowledgeDocumentId: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    images: product.image
      ? [
          {
            id: `${product.id}-image`,
            fileAssetId: `${product.id}-external-image`,
            filename: `${product.id}.jpg`,
            mimeType: "image/jpeg",
            sizeBytes: 0,
            sortOrder: 0,
            url: product.image,
            createdAt: new Date().toISOString(),
          },
        ]
      : [],
  };
}

export function listFallbackProducts(): CatalogProduct[] {
  return mockProducts.map(mockToCatalogProduct);
}

export function getFallbackProduct(productId: string): CatalogProduct | null {
  return listFallbackProducts().find((product) => product.id === productId) ?? null;
}
