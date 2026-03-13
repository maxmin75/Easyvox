import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonError } from "@/lib/api/errors";
import { serializeCatalogProduct } from "@/lib/catalog";

export const runtime = "nodejs";

async function resolveClientId(request: NextRequest) {
  const clientId = request.headers.get("x-client-id")?.trim();
  if (clientId) return clientId;

  const clientSlug = request.headers.get("x-client-slug")?.trim().toLowerCase();
  if (clientSlug) {
    const client = await prisma.client.findUnique({
      where: { slug: clientSlug },
      select: { id: true },
    });
    return client?.id ?? null;
  }

  const queryClientId = request.nextUrl.searchParams.get("clientId")?.trim();
  if (queryClientId) return queryClientId;

  const queryClientSlug = request.nextUrl.searchParams.get("clientSlug")?.trim().toLowerCase();
  if (queryClientSlug) {
    const client = await prisma.client.findUnique({
      where: { slug: queryClientSlug },
      select: { id: true },
    });
    return client?.id ?? null;
  }

  return null;
}

export async function GET(request: NextRequest) {
  const clientId = await resolveClientId(request);
  if (!clientId) return jsonError("Tenant prodotto non risolto", 400);

  const products = await prisma.product.findMany({
    where: { clientId },
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

  return NextResponse.json({ products: products.map(serializeCatalogProduct) });
}
