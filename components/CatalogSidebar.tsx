"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { fetchCatalogProducts, type CatalogProduct } from "@/lib/catalog-client";
import { listFallbackProducts } from "@/lib/providers/productProvider";
import styles from "@/components/catalog-sidebar.module.css";

type SortMode = "recent" | "priced" | "discount";
const DEFAULT_CATALOG_CLIENT_SLUG = "vox";

function productNumericId(productId: string) {
  const numericPart = Number.parseInt(productId.replace(/\D/g, ""), 10);
  return Number.isNaN(numericPart) ? 0 : numericPart;
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

export function CatalogSidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);
  const panelRef = useRef<HTMLElement | null>(null);
  const [catalogProducts, setCatalogProducts] = useState<CatalogProduct[]>(() => listFallbackProducts());
  const [query, setQuery] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("recent");
  const [expandedProductId, setExpandedProductId] = useState<string | null>(null);
  const [detailProductId, setDetailProductId] = useState<string | null>(null);

  const filteredProducts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const filtered = catalogProducts.filter((product) => {
      if (!normalizedQuery) return true;
      return (
        product.title.toLowerCase().includes(normalizedQuery) ||
        product.description.toLowerCase().includes(normalizedQuery) ||
        product.id.toLowerCase().includes(normalizedQuery) ||
        product.slug.toLowerCase().includes(normalizedQuery)
      );
    });

    const sorted = [...filtered];
    sorted.sort((left, right) => {
      if (sortMode === "priced") return left.discountedPrice - right.discountedPrice;
      if (sortMode === "discount") return right.discountPercent - left.discountPercent;
      return productNumericId(right.id) - productNumericId(left.id);
    });
    return sorted;
  }, [catalogProducts, query, sortMode]);

  useEffect(() => {
    const controller = new AbortController();
    fetchCatalogProducts({ clientSlug: DEFAULT_CATALOG_CLIENT_SLUG, signal: controller.signal })
      .then((products) => {
        if (products.length > 0) setCatalogProducts(products);
      })
      .catch(() => null);
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (panelRef.current?.contains(target)) return;
      setIsOpen(false);
      setIsMobileFiltersOpen(false);
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
        setIsMobileFiltersOpen(false);
      }
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown, { passive: true });
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [isOpen]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const onCatalogOpen = (event: Event) => {
      const customEvent = event as CustomEvent<{ query?: string }>;
      setIsOpen(true);
      setIsMobileFiltersOpen(false);
      setExpandedProductId(null);
      setDetailProductId(null);
      setQuery(customEvent.detail?.query?.trim() ?? "");
    };

    window.addEventListener("easyvox:catalog-open", onCatalogOpen);
    return () => {
      window.removeEventListener("easyvox:catalog-open", onCatalogOpen);
    };
  }, []);

  function handleSelectProduct(product: CatalogProduct) {
    if (typeof window === "undefined") return;
    setIsOpen(false);
    setIsMobileFiltersOpen(false);
    setExpandedProductId(null);
    setDetailProductId(null);
    const message = `Info prodotto: ${product.title}`;
    window.dispatchEvent(
      new CustomEvent("easyvox:catalog-select", {
        detail: {
          productId: product.id,
          productName: product.title,
          message,
        },
      }),
    );
  }

  return (
    <aside ref={panelRef} className={`${styles.panel} ${isOpen ? styles.panelOpen : ""}`} aria-label="Catalogo">
      <button
        type="button"
        className={styles.tab}
        aria-expanded={isOpen}
        aria-controls="catalog-content"
        onClick={() => setIsOpen((current) => !current)}
      >
        Catalogo
      </button>
      <div id="catalog-content" className={styles.content}>
        <div className={styles.header}>
          <h2 className={styles.title}>Catalogo prodotti</h2>
          <p className={styles.meta}>{filteredProducts.length} elementi</p>
          <button
            type="button"
            className={styles.mobileFiltersButton}
            aria-expanded={isMobileFiltersOpen}
            aria-controls="catalog-filters"
            onClick={() => setIsMobileFiltersOpen((current) => !current)}
          >
            Filtri di ricerca
          </button>
          <div
            id="catalog-filters"
            className={`${styles.filters} ${isMobileFiltersOpen ? styles.filtersOpen : ""}`}
          >
            <input
              type="search"
              className={styles.searchInput}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Cerca prodotto..."
              aria-label="Cerca prodotto"
            />
            <div className={styles.selectRow}>
              <select
                className={styles.select}
                value={sortMode}
                onChange={(event) => setSortMode(event.target.value as SortMode)}
                aria-label="Ordina per"
              >
                <option value="recent">Piu recenti</option>
                <option value="priced">Prezzo piu basso</option>
                <option value="discount">Sconto piu alto</option>
              </select>
            </div>
          </div>
        </div>
        <div className={styles.list}>
          {filteredProducts.map((product) => (
            <article
              key={product.id}
              className={`${styles.item} ${expandedProductId === product.id ? styles.itemExpanded : ""}`}
              onClick={() => setExpandedProductId(product.id)}
            >
              <div className={styles.itemTop}>
                <span className={styles.badge}>{product.discountPercent > 0 ? `-${product.discountPercent}%` : "Prodotto"}</span>
                <span className={styles.id}>{product.id}</span>
              </div>
              <h3 className={styles.itemTitle}>{product.title}</h3>
              <p className={styles.description}>{product.shortDescription}</p>
              <div className={styles.itemBottom}>
                <span>Prezzo: {product.discountedPriceFormatted}</span>
                <span>Immagini: {product.images.length}</span>
              </div>
              <div className={styles.itemBottom}>
                <span>URL: {product.productUrl}</span>
                <span>Slug: {product.slug}</span>
              </div>
              <div className={styles.actionsRow}>
                <button
                  type="button"
                  className={styles.primaryButton}
                  onClick={(event) => {
                    event.stopPropagation();
                    handleSelectProduct(product);
                  }}
                >
                  Seleziona
                </button>
                <button
                  type="button"
                  className={styles.secondaryButton}
                  onClick={(event) => {
                    event.stopPropagation();
                    setDetailProductId((current) => (current === product.id ? null : product.id));
                  }}
                >
                  {detailProductId === product.id ? "Chiudi dettaglio" : "Vedi dettaglio"}
                </button>
              </div>
              {expandedProductId === product.id || detailProductId === product.id ? (
                <div className={styles.expandedContent}>
                  <p className={styles.extendedDescription}>{product.shortDescription}</p>
                  {detailProductId === product.id ? (
                    <section className={styles.techCard} aria-label={`Dettaglio tecnico ${product.title}`}>
                      <div className={styles.detailImage} aria-hidden="true">
                        <span>{product.images[0]?.filename ?? "Immagine in arrivo"}</span>
                      </div>
                      <h4 className={styles.techTitle}>{product.title}</h4>
                      <p className={styles.techDescription}>{product.shortDescription}</p>
                      <dl className={styles.specs}>
                        {technicalFeatures(product).map((feature) => (
                          <div key={feature.label} className={styles.specRow}>
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
  );
}
