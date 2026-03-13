import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prismaAdmin } from "@/lib/prisma-admin";
import { requireAdminUser } from "@/lib/api/admin";
import { jsonError } from "@/lib/api/errors";
import {
  buildProductStructuredOutput,
  deleteProductKnowledge,
  serializeCatalogProduct,
  slugifyProduct,
  syncProductKnowledge,
} from "@/lib/catalog";
import { withTenant } from "@/lib/db/tenant";

export const runtime = "nodejs";

const productInputSchema = z.object({
  agentId: z.string().uuid(),
  productId: z.string().uuid().optional(),
  title: z.string().trim().min(1).max(160),
  shortDescription: z.string().trim().min(1).max(220),
  description: z.string().trim().min(1).max(4000),
  price: z.coerce.number().finite().min(0),
  discountPercent: z.coerce.number().int().min(0).max(100).default(0),
  productUrl: z.string().trim().url().max(1000),
  slug: z.string().trim().min(1).max(80).optional(),
  relatedProductIds: z.array(z.string().trim().min(1).max(80)).max(12).default([]),
  imageAssetIds: z.array(z.string().uuid()).max(12).default([]),
  externalImageUrls: z.array(z.string().trim().url().max(2000)).max(12).default([]),
}).superRefine((value, ctx) => {
  if (value.imageAssetIds.length + value.externalImageUrls.length === 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["imageAssetIds"],
      message: "Serve almeno un'immagine caricata o esterna",
    });
  }
});

const listSchema = z.object({
  agentId: z.string().uuid(),
});

const deleteSchema = z.object({
  agentId: z.string().uuid(),
  productId: z.string().uuid(),
});

async function ensureAgent(agentId: string) {
  return prismaAdmin.client.findUnique({
    where: { id: agentId },
    select: { id: true },
  });
}

async function fetchProduct(agentId: string, productId: string) {
  return prismaAdmin.product.findFirst({
    where: { id: productId, clientId: agentId },
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
}

function getErrorDetail(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export async function GET(request: NextRequest) {
  const { denied } = await requireAdminUser(request);
  if (denied) return denied;

  const parsed = listSchema.safeParse({
    agentId: request.nextUrl.searchParams.get("agentId"),
  });
  if (!parsed.success) return jsonError("agentId non valido", 400);

  const agent = await ensureAgent(parsed.data.agentId);
  if (!agent) return jsonError("Agente non trovato", 404);

  try {
    const products = await prismaAdmin.product.findMany({
      where: { clientId: agent.id },
      orderBy: { createdAt: "desc" },
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

    return NextResponse.json(products.map(serializeCatalogProduct));
  } catch (error) {
    return jsonError(getErrorDetail(error, "Errore caricamento prodotti"), 500);
  }
}

export async function POST(request: NextRequest) {
  const { denied } = await requireAdminUser(request);
  if (denied) return denied;

  const body = await request.json().catch(() => null);
  const parsed = productInputSchema.safeParse(body);
  if (!parsed.success) return jsonError("Payload prodotto non valido", 400);

  const agent = await ensureAgent(parsed.data.agentId);
  if (!agent) return jsonError("Agente non trovato", 404);

  const assetCount = parsed.data.imageAssetIds.length
    ? await prismaAdmin.fileAsset.count({
        where: {
          clientId: agent.id,
          id: { in: parsed.data.imageAssetIds },
        },
      })
    : 0;
  if (parsed.data.imageAssetIds.length > 0 && assetCount !== parsed.data.imageAssetIds.length) {
    return jsonError("Una o piu immagini non appartengono a questo agente", 400);
  }

  const slug = slugifyProduct(parsed.data.slug || parsed.data.title);
  if (!slug) return jsonError("Slug prodotto non valido", 400);

  try {
    const product = await withTenant(agent.id, async (tx) => {
      const created = await tx.product.create({
        data: {
          clientId: agent.id,
          slug,
          title: parsed.data.title,
          description: parsed.data.description,
          price: parsed.data.price,
          discountPercent: parsed.data.discountPercent,
          productUrl: parsed.data.productUrl,
          structuredOutput: {},
        },
      });

      if (parsed.data.imageAssetIds.length > 0) {
        await tx.productImage.createMany({
          data: parsed.data.imageAssetIds.map((fileAssetId, index) => ({
            productId: created.id,
            fileAssetId,
            sortOrder: index,
          })),
        });
      }

      const imageAssets = parsed.data.imageAssetIds.length
        ? await tx.fileAsset.findMany({
            where: { clientId: agent.id, id: { in: parsed.data.imageAssetIds } },
            select: { id: true, filename: true, mimeType: true },
          })
        : [];
      const orderMap = new Map(parsed.data.imageAssetIds.map((id, index) => [id, index]));
      imageAssets.sort((left, right) => (orderMap.get(left.id) ?? 0) - (orderMap.get(right.id) ?? 0));
      const externalImages = parsed.data.externalImageUrls.map((url, index) => {
        const normalizedUrl = url.trim();
        const filename = normalizedUrl.split("/").pop()?.split("?")[0] || `external-image-${index + 1}.jpg`;
        return {
          fileAssetId: `external-${index + 1}`,
          filename,
          mimeType: "image/jpeg",
          sortOrder: parsed.data.imageAssetIds.length + index,
          url: normalizedUrl,
          source: "external" as const,
        };
      });

      const structuredOutput = buildProductStructuredOutput({
        id: created.id,
        slug,
        title: parsed.data.title,
        description: parsed.data.description,
        shortDescription: parsed.data.shortDescription,
        price: parsed.data.price,
        discountPercent: parsed.data.discountPercent,
        productUrl: parsed.data.productUrl,
        relatedProductIds: parsed.data.relatedProductIds,
        images: [
          ...imageAssets.map((image) => ({
            fileAssetId: image.id,
            filename: image.filename,
            mimeType: image.mimeType,
            sortOrder: orderMap.get(image.id) ?? 0,
            source: "uploaded" as const,
          })),
          ...externalImages,
        ],
      });

      await tx.product.update({
        where: { id: created.id },
        data: { structuredOutput },
      });

      const fullProduct = await tx.product.findUniqueOrThrow({
        where: { id: created.id },
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

      return serializeCatalogProduct(fullProduct);
    });

    let warning: string | null = null;
    try {
      await withTenant(agent.id, async (tx) =>
        syncProductKnowledge(tx, {
          clientId: agent.id,
          productId: product.id,
          title: `Prodotto: ${parsed.data.title}`,
          structuredOutput: product.structuredOutput,
        }),
      );
    } catch (error) {
      warning = `Prodotto salvato, ma sync knowledge non riuscita: ${getErrorDetail(error, "errore sconosciuto")}`;
    }

    return NextResponse.json({ product, warning }, { status: 201 });
  } catch (error) {
    return jsonError(getErrorDetail(error, "Errore creazione prodotto"), 500);
  }
}

export async function PUT(request: NextRequest) {
  const { denied } = await requireAdminUser(request);
  if (denied) return denied;

  const body = await request.json().catch(() => null);
  const parsed = productInputSchema.extend({
    productId: z.string().uuid(),
  }).safeParse(body);
  if (!parsed.success) return jsonError("Payload prodotto non valido", 400);

  const agent = await ensureAgent(parsed.data.agentId);
  if (!agent) return jsonError("Agente non trovato", 404);

  const existing = await fetchProduct(agent.id, parsed.data.productId);
  if (!existing) return jsonError("Prodotto non trovato", 404);

  const assetCount = parsed.data.imageAssetIds.length
    ? await prismaAdmin.fileAsset.count({
        where: {
          clientId: agent.id,
          id: { in: parsed.data.imageAssetIds },
        },
      })
    : 0;
  if (parsed.data.imageAssetIds.length > 0 && assetCount !== parsed.data.imageAssetIds.length) {
    return jsonError("Una o piu immagini non appartengono a questo agente", 400);
  }

  const slug = slugifyProduct(parsed.data.slug || parsed.data.title);
  if (!slug) return jsonError("Slug prodotto non valido", 400);

  try {
    const product = await withTenant(agent.id, async (tx) => {
      await tx.product.update({
        where: { id: existing.id },
        data: {
          slug,
          title: parsed.data.title,
          description: parsed.data.description,
          price: parsed.data.price,
          discountPercent: parsed.data.discountPercent,
          productUrl: parsed.data.productUrl,
        },
      });

      await tx.productImage.deleteMany({
        where: { productId: existing.id },
      });
      if (parsed.data.imageAssetIds.length > 0) {
        await tx.productImage.createMany({
          data: parsed.data.imageAssetIds.map((fileAssetId, index) => ({
            productId: existing.id,
            fileAssetId,
            sortOrder: index,
          })),
        });
      }

      const imageAssets = parsed.data.imageAssetIds.length
        ? await tx.fileAsset.findMany({
            where: { clientId: agent.id, id: { in: parsed.data.imageAssetIds } },
            select: { id: true, filename: true, mimeType: true },
          })
        : [];
      const orderMap = new Map(parsed.data.imageAssetIds.map((id, index) => [id, index]));
      imageAssets.sort((left, right) => (orderMap.get(left.id) ?? 0) - (orderMap.get(right.id) ?? 0));
      const externalImages = parsed.data.externalImageUrls.map((url, index) => {
        const normalizedUrl = url.trim();
        const filename = normalizedUrl.split("/").pop()?.split("?")[0] || `external-image-${index + 1}.jpg`;
        return {
          fileAssetId: `external-${index + 1}`,
          filename,
          mimeType: "image/jpeg",
          sortOrder: parsed.data.imageAssetIds.length + index,
          url: normalizedUrl,
          source: "external" as const,
        };
      });

      const structuredOutput = buildProductStructuredOutput({
        id: existing.id,
        slug,
        title: parsed.data.title,
        description: parsed.data.description,
        shortDescription: parsed.data.shortDescription,
        price: parsed.data.price,
        discountPercent: parsed.data.discountPercent,
        productUrl: parsed.data.productUrl,
        relatedProductIds: parsed.data.relatedProductIds,
        images: [
          ...imageAssets.map((image) => ({
            fileAssetId: image.id,
            filename: image.filename,
            mimeType: image.mimeType,
            sortOrder: orderMap.get(image.id) ?? 0,
            source: "uploaded" as const,
          })),
          ...externalImages,
        ],
      });

      await tx.product.update({
        where: { id: existing.id },
        data: { structuredOutput },
      });

      const fullProduct = await tx.product.findUniqueOrThrow({
        where: { id: existing.id },
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

      return serializeCatalogProduct(fullProduct);
    });

    let warning: string | null = null;
    try {
      await withTenant(agent.id, async (tx) =>
        syncProductKnowledge(tx, {
          clientId: agent.id,
          productId: existing.id,
          title: `Prodotto: ${parsed.data.title}`,
          structuredOutput: product.structuredOutput,
          knowledgeDocumentId: existing.knowledgeDocumentId,
        }),
      );
    } catch (error) {
      warning = `Prodotto aggiornato, ma sync knowledge non riuscita: ${getErrorDetail(error, "errore sconosciuto")}`;
    }

    return NextResponse.json({ product, warning });
  } catch (error) {
    return jsonError(getErrorDetail(error, "Errore aggiornamento prodotto"), 500);
  }
}

export async function DELETE(request: NextRequest) {
  const { denied } = await requireAdminUser(request);
  if (denied) return denied;

  const parsed = deleteSchema.safeParse({
    agentId: request.nextUrl.searchParams.get("agentId"),
    productId: request.nextUrl.searchParams.get("productId"),
  });
  if (!parsed.success) return jsonError("Parametri non validi", 400);

  const existing = await fetchProduct(parsed.data.agentId, parsed.data.productId);
  if (!existing) return jsonError("Prodotto non trovato", 404);

  try {
    await withTenant(parsed.data.agentId, async (tx) => {
      await tx.product.delete({
        where: { id: existing.id },
      });
      await deleteProductKnowledge(tx, existing.knowledgeDocumentId);
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(getErrorDetail(error, "Eliminazione prodotto fallita"), 500);
  }
}
