import api from "@/lib/axios";

export interface CartItem {
  _id: string;
  product: {
    _id: string;
    sellerId: string;
    title: string;
    description: string;
    price: number;
    quantity?: number;
    stock: number;
    image: string;
  };
  quantity: number;
  priceSnapShot: number;
  selectedVariants?: { name: string; value: string }[];
  variantSku?: string;
  availableStock?: number;
  seller: {
    _id: string;
    name: string;
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
