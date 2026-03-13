"use client";

import { type UiAction } from "@/lib/ai-ui-actions/contracts";
import { ProductGrid } from "@/components/ai-ui-actions/ProductGrid";
import { ProductModal } from "@/components/ai-ui-actions/ProductModal";
import { BookingModal } from "@/components/ai-ui-actions/BookingModal";
import { SupportForm } from "@/components/ai-ui-actions/SupportForm";
import { ServicePurchaseSidebar } from "@/components/ai-ui-actions/ServicePurchaseSidebar";
import styles from "@/components/ai-ui-actions/actions.module.css";

type ActionRendererProps = {
  actions: UiAction[];
  clientSlug?: string;
};

export function ActionRenderer({ actions, clientSlug }: ActionRendererProps) {
  if (actions.length === 0) return null;

  return (
    <div className={styles.stack}>
      {actions.map((action, index) => {
        const key = `${action.type}-${index}`;

        if (action.type === "SHOW_PRODUCTS") {
          return (
            <ProductGrid
              key={key}
              query={action.payload.query}
              category={action.payload.category}
              clientSlug={clientSlug}
            />
          );
        }

        if (action.type === "OPEN_PRODUCT") {
          return <ProductModal key={key} productId={action.payload.productId} clientSlug={clientSlug} />;
        }

        if (action.type === "OPEN_BOOKING_MODAL") {
          return (
            <BookingModal
              key={key}
              date={action.payload.date}
              time={action.payload.time}
              service={action.payload.service}
            />
          );
        }

        if (action.type === "OPEN_SUPPORT_FORM") {
          return <SupportForm key={key} topic={action.payload.topic} />;
        }

        if (action.type === "OPEN_CHECKOUT") {
          return <ServicePurchaseSidebar key={key} cartId={action.payload.cartId} />;
        }

        return (
          <section key={key} className={styles.card}>
            <p className={styles.muted}>Nessuna action UI da mostrare.</p>
          </section>
        );
      })}
    </div>
  );
}
