"use client";

import { useState } from "react";
import styles from "@/components/ai-ui-actions/actions.module.css";

type ServicePurchaseSidebarProps = {
  cartId?: string;
};

export function ServicePurchaseSidebar({ cartId = "service-cart" }: ServicePurchaseSidebarProps) {
  const [closed, setClosed] = useState(false);

  if (closed) return null;

  return (
    <aside className={styles.leftSidebarModal} role="dialog" aria-label="Acquista il servizio">
      <div className={styles.leftSidebarHeader}>
        <h3 className={styles.cardTitle}>Acquista il servizio</h3>
        <button type="button" className={styles.buttonGhost} onClick={() => setClosed(true)}>
          Chiudi
        </button>
      </div>

      <p className={styles.muted}>Completa la richiesta di acquisto dal pannello laterale.</p>
      <p className={styles.muted}>Riferimento carrello: {cartId}</p>

      <div className={styles.field}>
        <label className={styles.label} htmlFor="service-buyer-name">
          Nome
        </label>
        <input id="service-buyer-name" className={styles.input} placeholder="Mario Rossi" />
      </div>

      <div className={styles.field}>
        <label className={styles.label} htmlFor="service-buyer-email">
          Email
        </label>
        <input id="service-buyer-email" type="email" className={styles.input} placeholder="mario@email.it" />
      </div>

      <button type="button" className={styles.button}>
        Conferma acquisto
      </button>
    </aside>
  );
}
