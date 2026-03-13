"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { ActionRenderer } from "@/components/ai-ui-actions/ActionRenderer";
import { Particles } from "@/components/ui/particles";
import { type UiAction } from "@/lib/ai-ui-actions/contracts";
import { fetchCatalogProducts, type CatalogProduct } from "@/lib/catalog-client";
import { listFallbackProducts } from "@/lib/providers/productProvider";
import styles from "@/app/ai-ui-chat/page.module.css";

const DEFAULT_CHAT_CLIENT_SLUG = "vox";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
  actions: UiAction[];
};

function makeId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function technicalFeatures(product: CatalogProduct) {
  return [
    { label: "Prezzo", value: product.priceFormatted },
    { label: "Sconto", value: `${product.discountPercent}%` },
    { label: "Prezzo scontato", value: product.discountedPriceFormatted },
    { label: "URL", value: product.productUrl },
    { label: "Correlati", value: product.relatedProductIds.join(", ") || "Nessuno" },
  ];
}

export default function AiUiChatPage() {
  const conversationId = useMemo(() => makeId(), []);
  const catalogPanelRef = useRef<HTMLElement | null>(null);
  const [catalogProducts, setCatalogProducts] = useState<CatalogProduct[]>(() => listFallbackProducts());
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [isCatalogOpen, setIsCatalogOpen] = useState(false);
  const [expandedProductId, setExpandedProductId] = useState<string | null>(null);
  const [detailProductId, setDetailProductId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: makeId(),
      role: "assistant",
      text: "Ciao, posso mostrare prodotti strutturati, dettaglio, booking, supporto e checkout.",
      actions: [],
    },
  ]);

  useEffect(() => {
    const controller = new AbortController();
    fetchCatalogProducts({ clientSlug: DEFAULT_CHAT_CLIENT_SLUG, signal: controller.signal })
      .then((products) => {
        if (products.length > 0) setCatalogProducts(products);
      })
      .catch(() => null);
    return () => controller.abort();
  }, []);

  async function sendUserMessage(userText: string) {
    if (!userText || loading) return;
    const nextUserMessage: ChatMessage = {
      id: makeId(),
      role: "user",
      text: userText,
      actions: [],
    };

    setMessages((current) => [...current, nextUserMessage]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/ai-ui-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId,
          userMessage: userText,
        }),
      });

      const data = (await res.json()) as { message?: string; actions?: UiAction[] };
      setMessages((current) => [
        ...current,
        {
          id: makeId(),
          role: "assistant",
          text: typeof data?.message === "string" ? data.message : "Risposta non valida dal server.",
          actions: Array.isArray(data?.actions) ? data.actions : [],
        },
      ]);
    } catch {
      setMessages((current) => [
        ...current,
        {
          id: makeId(),
          role: "assistant",
          text: "Errore di rete. Riprova.",
          actions: [],
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const userText = input.trim();
    if (!userText || loading) return;
    setInput("");
    await sendUserMessage(userText);
  }

  async function handleSelectProduct(product: CatalogProduct) {
    setIsCatalogOpen(false);
    setExpandedProductId(null);
    setDetailProductId(null);
    await sendUserMessage(`Info prodotto: ${product.title}`);
  }

  useEffect(() => {
    if (!isCatalogOpen) return;

    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (catalogPanelRef.current?.contains(target)) return;
      setIsCatalogOpen(false);
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsCatalogOpen(false);
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown, { passive: true });
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [isCatalogOpen]);

  return (
    <main className={styles.page}>
      <div className={styles.pageBackground} aria-hidden="true">
        <Particles
          className={styles.pageParticles}
          quantity={120}
          staticity={30}
          ease={90}
          size={1.75}
          color="#6f8fff"
        />
      </div>
      <div className={styles.container}>
        <header className={styles.header}>
          <h1 className={styles.title}>AI UI Actions Playground</h1>
          <p className={styles.subtitle}>
            Il catalogo prodotti viene letto dal backend e ogni prodotto ha un JSON strutturato salvato in knowledge.
          </p>
        </header>

        <section className={styles.chatBox}>
          <div className={styles.messages}>
            {messages.map((message) => (
              <article
                key={message.id}
                className={`${styles.message} ${message.role === "user" ? styles.user : styles.assistant}`}
              >
                {message.text}
              </article>
            ))}
          </div>

          <form className={styles.form} onSubmit={handleSubmit}>
            <input
              className={styles.input}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Scrivi: mostra prodotti, apri prodotto, supporto..."
              disabled={loading}
            />
            <button className={styles.button} type="submit" disabled={loading}>
              {loading ? "Invio..." : "Invia"}
            </button>
          </form>
        </section>

        <section className={styles.actions}>
          {messages
            .filter((message) => message.role === "assistant" && message.actions.length > 0)
            .map((message) => (
              <ActionRenderer
                key={`actions-${message.id}`}
                actions={message.actions}
                clientSlug={DEFAULT_CHAT_CLIENT_SLUG}
              />
            ))}
        </section>
      </div>

      <aside
        ref={catalogPanelRef}
        className={`${styles.catalogPanel} ${isCatalogOpen ? styles.catalogPanelOpen : ""}`}
        aria-label="Catalogo"
      >
        <button
          type="button"
          className={styles.catalogTab}
          aria-expanded={isCatalogOpen}
          aria-controls="catalog-content"
          onClick={() => setIsCatalogOpen((current) => !current)}
        >
          Catalogo
        </button>
        <div id="catalog-content" className={styles.catalogContent}>
          <div className={styles.catalogHeader}>
            <h2 className={styles.catalogTitle}>Catalogo prodotti</h2>
            <p className={styles.catalogMeta}>{catalogProducts.length} elementi</p>
          </div>
          <div className={styles.catalogList}>
            {catalogProducts.map((product) => (
              <article
                key={product.id}
                className={`${styles.catalogItem} ${expandedProductId === product.id ? styles.catalogItemExpanded : ""}`}
                onClick={() => setExpandedProductId(product.id)}
              >
                <div className={styles.catalogItemTop}>
                  <span className={styles.catalogBadge}>{product.discountPercent > 0 ? `-${product.discountPercent}%` : "Prodotto"}</span>
                  <span className={styles.catalogId}>{product.id}</span>
                </div>
                <h3 className={styles.catalogItemTitle}>{product.title}</h3>
                <p className={styles.catalogDescription}>{product.shortDescription}</p>
                <div className={styles.catalogItemBottom}>
                  <span>Prezzo: {product.discountedPriceFormatted}</span>
                  <span>Immagini: {product.images.length}</span>
                </div>
                <div className={styles.catalogActionsRow}>
                  <button
                    type="button"
                    className={styles.catalogPrimaryButton}
                    disabled={loading}
                    onClick={(event) => {
                      event.stopPropagation();
                      void handleSelectProduct(product);
                    }}
                  >
                    Seleziona
                  </button>
                  <button
                    type="button"
                    className={styles.catalogSecondaryButton}
                    onClick={(event) => {
                      event.stopPropagation();
                      setDetailProductId((current) => (current === product.id ? null : product.id));
                    }}
                  >
                    {detailProductId === product.id ? "Chiudi dettaglio" : "Vedi dettaglio"}
                  </button>
                </div>
                {expandedProductId === product.id || detailProductId === product.id ? (
                  <div className={styles.catalogExpandedContent}>
                    <p className={styles.catalogExtendedDescription}>{product.shortDescription}</p>
                    {detailProductId === product.id ? (
                      <section className={styles.catalogTechCard} aria-label={`Dettaglio tecnico ${product.title}`}>
                        <div className={styles.catalogDetailImage} aria-hidden="true">
                          <span>{product.images[0]?.filename ?? "Immagine in arrivo"}</span>
                        </div>
                        <h4 className={styles.catalogTechTitle}>{product.title}</h4>
                        <p className={styles.catalogTechDescription}>{product.shortDescription}</p>
                        <dl className={styles.catalogSpecs}>
                          {technicalFeatures(product).map((feature) => (
                            <div key={feature.label} className={styles.catalogSpecRow}>
                              <dt>{feature.label}</dt>
                              <dd>{feature.value}</dd>
                            </div>
                          ))}
                        </dl>
                      </section>
                    ) : null}
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        </div>
      </aside>
    </main>
  );
}
