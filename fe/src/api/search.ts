import api from "@/lib/axios";

export interface Product {
  _id: string;
  title: string;
  description: string;
  price: number;
  image?: string;
  images?: string[];
  sellerId: {
    _id: string;
    username: string;
    avatarUrl?: string;
  };
  categoryId?: {
    _id: string;
    name: string;
    slug: string;
  };
  averageRating: number;
  ratingCount: number;
  status: string;
  createdAt: string;
}

export interface Seller {
  _id: string;
  username: string;
  avatarUrl?: string;
  reputationScore: number;
}

export interface SearchProductsResponse {
  page: number;
  limit: number;
  total: number;
  data: Product[];
}

export interface SearchSellersResponse {
  page: number;
  limit: number;
  total: number;
  data: Seller[];
}

export interface GlobalSearchResponse {
  data: {
    products: Product[];
    sellers: Seller[];
  };
}

/**
 * Search products by name, price, and rating
 */
export const searchProducts = async (
  q: string,
  options?: {
    page?: number;
    limit?: number;
    minPrice?: number;
    maxPrice?: number;
    minRating?: number;
  },
): Promise<SearchProductsResponse> => {
  const params = new URLSearchParams();
  if (q) params.append("search", q);
  if (options?.page) params.append("page", String(options.page));
  if (options?.limit) params.append("limit", String(options.limit));
  if (options?.minPrice !== undefined)
    params.append("minPrice", String(options.minPrice));
  if (options?.maxPrice !== undefined)
    params.append("maxPrice", String(options.maxPrice));
  if (options?.minRating !== undefined)
    params.append("minRating", String(options.minRating));

  const response = await api.get<SearchProductsResponse>(
    `/api/products?${params}`,
  );
  return response.data;
};

/**
 * Search sellers by name
 */
export const searchSellers = async (
  q: string,
  options?: {
    page?: number;
    limit?: number;
  },
): Promise<SearchSellersResponse> => {
  const params = new URLSearchParams();
  if (q) params.append("q", q);
  if (options?.page) params.append("page", String(options.page));
  if (options?.limit) params.append("limit", String(options.limit));

  const response = await api.get<SearchSellersResponse>(
    `/api/search/sellers?${params}`,
  );
  return response.data;
};

/**
 * Global search that returns both products and sellers
 */
export const globalSearch = async (
  q: string,
  options?: {
    productLimit?: number;
    sellerLimit?: number;
  },
): Promise<GlobalSearchResponse> => {
  // Fetch products and sellers in parallel
  const [productsRes, sellersRes] = await Promise.all([
    searchProducts(q, { limit: options?.productLimit }),
    searchSellers(q, { limit: options?.sellerLimit }),
  ]);

  return {
    data: {
      products: productsRes.data,
      sellers: sellersRes.data,
    },
  };
};
