import api from "@/lib/axios";

export interface RecentlyViewedProduct {
  _id: string;
  title: string;
  price: number;
  images?: string[];
  image?: string;
  isOnSale?: boolean;
  discountPercent?: number;
  originalPrice?: number;
  listingStatus?: string;
  variants?: { name: string; options: { value: string }[] }[];
  variantCombinations?: {
    key: string;
    selections: { name: string; value: string }[];
    price?: number;
    quantity: number;
  }[];
}

export interface RecentlyViewedItem {
  _id: string;
  viewedAt: string;
  product: RecentlyViewedProduct;
}

/**
 * Track a product view for the current authenticated user.
 * Call this when the product detail page mounts.
 */
export const trackRecentlyViewed = async (productId: string): Promise<void> => {
  await api.post("/api/recently-viewed", { productId });
};

/**
 * Fetch the authenticated user's recently viewed products.
 * Returns up to 20 items sorted by viewedAt descending.
 */
export const getRecentlyViewed = async (
  limit = 20
): Promise<{ data: RecentlyViewedItem[]; total: number }> => {
  const res = await api.get<{ data: RecentlyViewedItem[]; total: number }>(
    `/api/recently-viewed?limit=${limit}`
  );
  return res.data;
};

/**
 * Remove a single product from the recently viewed history.
 */
export const removeRecentlyViewed = async (productId: string): Promise<void> => {
  await api.delete(`/api/recently-viewed/${productId}`);
};

/**
 * Clear the entire recently viewed history for the current user.
 */
export const clearRecentlyViewed = async (): Promise<void> => {
  await api.delete("/api/recently-viewed");
};
