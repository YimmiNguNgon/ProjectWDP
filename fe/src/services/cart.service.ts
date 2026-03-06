import api from "@/lib/axios";

export interface CartItem {
  _id: string;
  product: {
    _id: string;
    sellerId: string;
    title: string;
    description: string;
    price: number;
    basePrice?: number;
    salePrice?: number | null;
    saleStartDate?: string | null;
    saleEndDate?: string | null;
    originalPrice?: number | null;
    discountPercent?: number | null;
    promotionType?: "normal" | "outlet" | "daily_deal";
    isOnSale?: boolean;
    quantity?: number;
    stock: number;
    image: string;
  };
  quantity: number;
  priceSnapShot: number;
  originalPriceSnapShot?: number | null;
  isOnSale?: boolean;
  selectedVariants?: { name: string; value: string }[];
  variantSku?: string;
  availableStock?: number;
  isOutOfStock?: boolean;
  availabilityStatus?:
    | "ok"
    | "out_of_stock"
    | "insufficient_stock"
    | "unavailable";
  availabilityMessage?: string;
  seller: {
    _id: string;
    username: string;
  };
}

export interface Cart {
  _id: string;
  user: string;
  items: CartItem[];
  totalItems: number;
  totalPrice: number;
  status: "active" | "completed" | "cancelled";
}

export const cartService = {
  getMyCart: async () => {
    const response = await api.get("/api/cart");
    return response.data.cart;
  },

  addToCart: async (
    productId: string,
    quantity: number,
    selectedVariants?: { name: string; value: string }[],
  ) => {
    const response = await api.post("/api/cart", {
      productId,
      quantity,
      selectedVariants,
    });
    return response.data;
  },

  updateCartItemQuantity: async (
    itemId: string,
    action: "increase" | "decrease",
    quantity?: number,
  ) => {
    const response = await api.patch(`/api/cart/item/${itemId}`, {
      action,
      quantity,
    });
    return response.data;
  },

  deleteCartItem: async (itemId: string) => {
    const response = await api.delete(`/api/cart/item/${itemId}`);
    return response.data;
  },
};
