"use client";

import { productProvider } from "@/lib/providers/productProvider";
import styles from "@/components/ai-ui-actions/actions.module.css";

type ProductGridProps = {
  query?: string;
  category?: string;
};

export function ProductGrid({ query, category }: ProductGridProps) {
  const products = productProvider.listProducts({ query, category });

  return (
    <section className={styles.card}>
      <h3 className={styles.cardTitle}>Prodotti disponibili</h3>
      <p className={styles.muted}>
        Filtri: query <strong>{query ?? "-"}</strong> | category <strong>{category ?? "-"}</strong>
      </p>

      {products.length === 0 ? (
        <p className={styles.muted}>Nessun prodotto trovato con i filtri attuali.</p>
      ) : (
        <div className={styles.grid}>
          {products.map((product) => (
            <article key={product.id} className={styles.productItem}>
              <span className={styles.badge}>{product.category}</span>
              <h4 className={styles.cardTitle}>{product.name}</h4>
              <p className={styles.muted}>{product.description}</p>
              <div className={styles.metaRow}>
                <span>€ {product.price}</span>
                <span>Stock: {product.stock}</span>
              </div>
              <div className={styles.metaRow}>
                <span>ID: {product.id}</span>
                <span>{product.deliveryDays} gg</span>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
