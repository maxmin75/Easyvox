"use client";

import { useState } from "react";
import styles from "@/components/ai-ui-actions/actions.module.css";

type CheckoutDrawerProps = {
  cartId?: string;
};

export function CheckoutDrawer({ cartId = "guest-cart" }: CheckoutDrawerProps) {
  const [placed, setPlaced] = useState(false);

  return (
    <section className={styles.card}>
      <h3 className={styles.cardTitle}>Checkout</h3>
      <p className={styles.muted}>Cart ID: {cartId}</p>

      {placed ? (
        <p className={styles.muted}>Ordine confermato (mock). Grazie per l&apos;acquisto.</p>
      ) : (
        <div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="checkout-name">
              Nome completo
            </label>
            <input id="checkout-name" className={styles.input} placeholder="Mario Rossi" />
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="checkout-address">
              Indirizzo
            </label>
            <input id="checkout-address" className={styles.input} placeholder="Via Roma 12, Milano" />
          </div>

          <div className={styles.buttonRow}>
            <button className={styles.buttonGhost} type="button">
              Annulla
            </button>
            <button className={styles.button} type="button" onClick={() => setPlaced(true)}>
              Conferma pagamento
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
