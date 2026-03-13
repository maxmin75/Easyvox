import { NextRequest, NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/api/admin";
import { jsonError } from "@/lib/api/errors";
import { prismaAdmin } from "@/lib/prisma-admin";
import { withTenant } from "@/lib/db/tenant";
import { buildProductStructuredOutput, serializeCatalogProduct, slugifyProduct, syncProductKnowledge } from "@/lib/catalog";
import { mockProducts } from "@/lib/mockProducts";

export const runtime = "nodejs";

function getErrorDetail(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export async function POST(request: NextRequest) {
  const { denied } = await requireAdminUser(request);
  if (denied) return denied;

  const body = (await request.json().catch(() => null)) as { agentId?: string } | null;
  const agentId = body?.agentId?.trim();
  if (!agentId) return jsonError("agentId non valido", 400);

  const agent = await prismaAdmin.client.findUnique({
    where: { id: agentId },
    select: { id: true },
  });
  if (!agent) return jsonError("Agente non trovato", 404);

  try {
    const importedProducts = [];

    for (const catalogProduct of mockProducts) {
      const slug = slugifyProduct(catalogProduct.slug || catalogProduct.name);
      if (!slug) continue;

      const importedProduct = await withTenant(agent.id, async (tx) => {
        const existing = await tx.product.findFirst({
          where: { clientId: agent.id, slug },
          include: {
            images: {
              orderBy: { sortOrder: "asc" },
              include: {
                fileAsset: {
                  select: {
                    id: true,
                    filename: true,
                    mimeType: true,
                    sizeBytes: true,
                    createdAt: true,
                  },
                },
              },
            },
          },
        });

        const structuredOutput = buildProductStructuredOutput({
          id: existing?.id ?? catalogProduct.id,
          slug,
          title: catalogProduct.name,
          description: catalogProduct.description,
          shortDescription: catalogProduct.shortDescription,
          price: catalogProduct.price,
          discountPercent: catalogProduct.discountPercent,
          productUrl: catalogProduct.productUrl || "https://easyvox.app",
          relatedProductIds: catalogProduct.relatedProductIds,
          images: catalogProduct.image
            ? [
                {
                  fileAssetId: `${catalogProduct.id}-external-image`,
                  filename: `${slug}.jpg`,
                  mimeType: "image/jpeg",
                  sortOrder: 0,
                  url: catalogProduct.image,
                  source: "external",
                },
              ]
            : [],
        });

        const product = existing
          ? await tx.product.update({
              where: { id: existing.id },
              data: {
                title: catalogProduct.name,
                description: catalogProduct.description,
                price: catalogProduct.price,
                discountPercent: catalogProduct.discountPercent,
                productUrl: catalogProduct.productUrl || "https://easyvox.app",
                structuredOutput,
              },
              include: {
                images: {
                  orderBy: { sortOrder: "asc" },
                  include: {
                    fileAsset: {
                      select: {
                        id: true,
                        filename: true,
                        mimeType: true,
                        sizeBytes: true,
                        createdAt: true,
                      },
                    },
                  },
                },
              },
            })
          : await tx.product.create({
              data: {
                clientId: agent.id,
                slug,
                title: catalogProduct.name,
                description: catalogProduct.description,
                price: catalogProduct.price,
                discountPercent: catalogProduct.discountPercent,
                productUrl: catalogProduct.productUrl || "https://easyvox.app",
                structuredOutput,
              },
              include: {
                images: {
                  orderBy: { sortOrder: "asc" },
                  include: {
                    fileAsset: {
                      select: {
                        id: true,
                        filename: true,
                        mimeType: true,
                        sizeBytes: true,
                        createdAt: true,
                      },
                    },
                  },
                },
              },
            });

        try {
          await syncProductKnowledge(tx, {
            clientId: agent.id,
            productId: product.id,
            title: `Prodotto: ${catalogProduct.name}`,
            structuredOutput: product.structuredOutput as ReturnType<typeof buildProductStructuredOutput>,
            knowledgeDocumentId: existing?.knowledgeDocumentId ?? product.knowledgeDocumentId ?? null,
          });
        } catch {
          return serializeCatalogProduct(product);
        }

        const refreshed = await tx.product.findUniqueOrThrow({
          where: { id: product.id },
          include: {
            images: {
              orderBy: { sortOrder: "asc" },
              include: {
                fileAsset: {
                  select: {
                    id: true,
                    filename: true,
                    mimeType: true,
                    sizeBytes: true,
                    createdAt: true,
                  },
                },
              },
            },
          },
        });

        return serializeCatalogProduct(refreshed);
      });

      importedProducts.push(importedProduct);
    }

    return NextResponse.json({
      ok: true,
      importedCount: importedProducts.length,
      products: importedProducts,
    });
  } catch (error) {
    return jsonError(getErrorDetail(error, "Import catalogo EasyVox fallito"), 500);
  }
}
