"use client";

import { useEffect, useState } from "react";
import styles from "@/components/ai-ui-actions/actions.module.css";
import { fetchCatalogProducts, type CatalogProduct } from "@/lib/catalog-client";
import { getFallbackProduct } from "@/lib/providers/productProvider";

type ProductModalProps = {
  productId: string;
  clientId?: string;
  clientSlug?: string;
};

export function ProductModal({ productId, clientId, clientSlug }: ProductModalProps) {
  const [product, setProduct] = useState<CatalogProduct | null>(() => getFallbackProduct(productId));

  useEffect(() => {
    if (!clientId && !clientSlug) return;

    const controller = new AbortController();
    fetchCatalogProducts({ clientId, clientSlug, signal: controller.signal })
      .then((products) => setProduct(products.find((item) => item.id === productId) ?? null))
      .catch(() => setProduct(getFallbackProduct(productId)));

    return () => controller.abort();
  }, [clientId, clientSlug, productId]);

  if (!product) {
    return (
      <section className={styles.card}>
        <h3 className={styles.cardTitle}>Dettaglio servizio</h3>
        <p className={styles.muted}>Servizio non trovato: {productId}</p>
      </section>
    );
  }

  return (
    <section className={styles.card}>
      <h3 className={styles.cardTitle}>Dettaglio servizio</h3>
      <article className={styles.productItem}>
        <span className={styles.badge}>{product.discountPercent > 0 ? `-${product.discountPercent}%` : "Prodotto"}</span>
        <h4 className={styles.cardTitle}>{product.title}</h4>
        {product.images[0]?.url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.images[0].url}
            alt={product.title}
            style={{ width: "100%", maxHeight: 240, objectFit: "cover", borderRadius: 14 }}
          />
        ) : null}
        <p className={styles.muted}>{product.shortDescription}</p>
        <p className={styles.muted}>{product.longDescription}</p>
        <div className={styles.metaRow}>
          <span>Prezzo: {product.priceFormatted}</span>
          <span>Sconto: {product.discountPercent}%</span>
        </div>
        <div className={styles.metaRow}>
          <span>ID: {product.id}</span>
          <span>URL: {product.productUrl}</span>
        </div>
        <div className={styles.metaRow}>
          <span>Slug: {product.slug}</span>
          <span>Correlati: {product.relatedProductIds.join(", ") || "nessuno"}</span>
        </div>
      </article>
    </section>
  );
}
