import api from "@/lib/axios";

export interface ProductVariant {
  name: string;
  options: {
    value: string;
    price?: number;
    quantity?: number;
    sku?: string;
  }[];
}

export interface ProductVariantCombination {
  key: string;
  selections: { name: string; value: string }[];
  quantity: number;
  price?: number;
  sku?: string;
}

export interface Product {
  _id: string;
  sellerId: string;
  title: string;
  description: string;
  price: number;
  image?: string;
  images?: string[];
  categoryId?: any;
  quantity: number;
  condition: string;
  status: string;
  listingStatus: "active" | "paused" | "ended" | "deleted";
  lowStockThreshold: number;
  variants?: ProductVariant[];
  variantCombinations?: ProductVariantCombination[];
  averageRating: number;
  ratingCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface InventorySummary {
  totalProducts: number;
  activeProducts: number;
  lowStockCount: number;
  lowStockProducts: Product[];
  outOfStock: number;
}

export interface CreateProductPayload {
  title: string;
  description?: string;
  price: number;
  quantity: number;
  condition?: string;
  categoryId: string;
  image?: string;
  images?: string[];
  variants?: ProductVariant[];
  variantCombinations?: ProductVariantCombination[];
}

/**
 * Create new product
 */
export async function createProduct(data: CreateProductPayload) {
  const response = await api.post("/api/products", data);
  return response.data;
}

/**
 * Get seller's product listings
 */
export async function getMyListings(params?: {
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}) {
  const response = await api.get("/api/products/seller/my-listings", { params });
  return response.data;
}

/**
 * Update product
 */
export async function updateProduct(productId: string, data: Partial<Product>) {
  const response = await api.put(`/api/products/${productId}`, data);
  return response.data;
}

/**
 * Update listing status
 */
export async function updateListingStatus(
  productId: string,
  listingStatus: "active" | "paused" | "ended"
) {
  const response = await api.patch(`/api/products/${productId}/status`, {
    listingStatus,
  });
  return response.data;
}

/**
 * Delete product (soft delete)
 */
export async function deleteProduct(productId: string) {
  const response = await api.delete(`/api/products/${productId}`);
  return response.data;
}

/**
 * Get inventory summary
 */
export async function getInventorySummary(): Promise<{ data: InventorySummary }> {
  const response = await api.get("/api/products/seller/inventory");
  return response.data;
}

/**
 * Get low stock products
 */
export async function getLowStockProducts() {
  const response = await api.get("/api/products/seller/low-stock");
  return response.data;
}
