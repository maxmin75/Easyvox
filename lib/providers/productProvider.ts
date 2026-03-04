import { mockProducts, type MockProduct } from "@/lib/mockProducts";

export type ProductQuery = {
  query?: string;
  category?: string;
};

export type ProductProvider = {
  listProducts: (filters?: ProductQuery) => MockProduct[];
  getById: (productId: string) => MockProduct | null;
};

function matchesQuery(product: MockProduct, query?: string): boolean {
  if (!query) return true;
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return (
    product.name.toLowerCase().includes(q) ||
    product.description.toLowerCase().includes(q) ||
    product.id.toLowerCase().includes(q)
  );
}

function matchesCategory(product: MockProduct, category?: string): boolean {
  if (!category) return true;
  return product.category.toLowerCase() === category.trim().toLowerCase();
}

export const productProvider: ProductProvider = {
  listProducts(filters) {
    // Isolated mock provider for MVP; replace with DB/integration provider later.
    return mockProducts.filter(
      (product) => matchesQuery(product, filters?.query) && matchesCategory(product, filters?.category),
    );
  },

  getById(productId) {
    const found = mockProducts.find((product) => product.id === productId);
    return found ?? null;
  },
};
