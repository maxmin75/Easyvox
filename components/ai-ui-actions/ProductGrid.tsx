"use client";

import { useEffect, useState } from "react";
import styles from "@/components/ai-ui-actions/actions.module.css";
import { fetchCatalogProducts, type CatalogProduct } from "@/lib/catalog-client";
import { listFallbackProducts } from "@/lib/providers/productProvider";

type ProductGridProps = {
  query?: string;
  category?: string;
  clientId?: string;
  clientSlug?: string;
};

export function ProductGrid({ query, category, clientId, clientSlug }: ProductGridProps) {
  const [products, setProducts] = useState<CatalogProduct[]>(() => listFallbackProducts());

  useEffect(() => {
    if (!clientId && !clientSlug) return;

    const controller = new AbortController();
    fetchCatalogProducts({ clientId, clientSlug, signal: controller.signal })
      .then(setProducts)
      .catch(() => setProducts(listFallbackProducts()));

    return () => controller.abort();
  }, [clientId, clientSlug]);

  const normalizedQuery = query?.trim().toLowerCase() ?? "";
  const filtered = products.filter((product) => {
    const matchesCategory = !category || category === "all";
    if (!matchesCategory) return false;
    if (!normalizedQuery) return true;
    return (
      product.title.toLowerCase().includes(normalizedQuery) ||
      product.description.toLowerCase().includes(normalizedQuery) ||
      product.slug.toLowerCase().includes(normalizedQuery) ||
      product.id.toLowerCase().includes(normalizedQuery)
    );
  });

  return (
    <section className={styles.card}>
      <h3 className={styles.cardTitle}>Servizi disponibili</h3>
      <p className={styles.muted}>
        Filtri: query <strong>{query ?? "-"}</strong> | category <strong>{category ?? "-"}</strong>
      </p>

      {filtered.length === 0 ? (
        <p className={styles.muted}>Nessun servizio trovato con i filtri attuali.</p>
      ) : (
        <div className={styles.grid}>
          {filtered.map((product) => (
            <article key={product.id} className={styles.productItem}>
              <span className={styles.badge}>{product.discountPercent > 0 ? `-${product.discountPercent}%` : "Prodotto"}</span>
              <h4 className={styles.cardTitle}>{product.title}</h4>
              <p className={styles.muted}>{product.shortDescription}</p>
              <div className={styles.metaRow}>
                <span>{product.discountedPriceFormatted}</span>
                <span>{product.images.length} immagini</span>
              </div>
              <div className={styles.metaRow}>
                <span>ID: {product.id}</span>
                <span>{product.relatedProductIds.join(", ") || product.productUrl}</span>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
