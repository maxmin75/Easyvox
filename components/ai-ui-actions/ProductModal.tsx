"use client";

import { productProvider } from "@/lib/providers/productProvider";
import styles from "@/components/ai-ui-actions/actions.module.css";

type ProductModalProps = {
  productId: string;
};

export function ProductModal({ productId }: ProductModalProps) {
  const product = productProvider.getById(productId);

  if (!product) {
    return (
      <section className={styles.card}>
        <h3 className={styles.cardTitle}>Dettaglio prodotto</h3>
        <p className={styles.muted}>Prodotto non trovato: {productId}</p>
      </section>
    );
  }

  return (
    <section className={styles.card}>
      <h3 className={styles.cardTitle}>Dettaglio prodotto</h3>
      <article className={styles.productItem}>
        <span className={styles.badge}>{product.category}</span>
        <h4 className={styles.cardTitle}>{product.name}</h4>
        <p className={styles.muted}>{product.description}</p>
        <div className={styles.metaRow}>
          <span>Prezzo: € {product.price}</span>
          <span>Stock: {product.stock}</span>
        </div>
        <div className={styles.metaRow}>
          <span>ID: {product.id}</span>
          <span>Consegna: {product.deliveryDays} giorni</span>
        </div>
      </article>
    </section>
  );
}
