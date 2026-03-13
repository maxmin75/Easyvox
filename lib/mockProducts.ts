import easyvoxCatalog from "@/data/easyvox-catalog.json";

export type MockProduct = {
  id: string;
  slug: string;
  name: string;
  category: string;
  utilityScore: number;
  price: number;
  priceFormatted: string;
  discountPercent: number;
  shortDescription: string;
  description: string;
  priceLabel: string;
  activationLabel: string;
  relatedProductIds: string[];
  productUrl?: string;
  image?: string;
  tags: string[];
};

type RawCatalogProduct = {
  id_prodotto: number;
  slug: string;
  categoria: string;
  titolo: string;
  immagine?: string;
  descrizione_breve: string;
  descrizione_lunga: string;
  prezzo: number;
  prezzo_formattato: string;
  sconto: number;
  tag_prodotto?: string[];
  url?: string;
  prodotti_correlati?: number[];
};

type RawCatalog = {
  brand: string;
  base_url: string;
  currency: string;
  products: RawCatalogProduct[];
};

const rawCatalog = easyvoxCatalog as RawCatalog;
export { rawCatalog as easyvoxCatalogSource };

export const mockProducts: MockProduct[] = rawCatalog.products.map((product) => ({
  id: `evx-${String(product.id_prodotto).padStart(3, "0")}`,
  slug: product.slug,
  name: product.titolo,
  category: product.categoria,
  utilityScore: 10,
  price: product.prezzo,
  priceFormatted: product.prezzo_formattato,
  discountPercent: product.sconto,
  shortDescription: product.descrizione_breve,
  description: product.descrizione_lunga,
  priceLabel: product.prezzo_formattato,
  activationLabel: product.categoria,
  relatedProductIds: (product.prodotti_correlati ?? []).map(
    (relatedId) => `evx-${String(relatedId).padStart(3, "0")}`,
  ),
  productUrl: product.url || rawCatalog.base_url,
  image: product.immagine,
  tags: product.tag_prodotto ?? [],
}));
