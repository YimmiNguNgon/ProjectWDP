import React, { createContext, useContext, useEffect, useState } from "react";
import { cartService, type Cart } from "@/services/cart.service";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

interface CartContextProps {
  cart: Cart | null;
  loading: boolean;
  addToCart: (
    productId: string,
    quantity: number,
    selectedVariants?: { name: string; value: string }[],
  ) => Promise<void>;
  updateQuantity: (
    itemId: string,
    action: "increase" | "decrease",
    quantity?: number
  ) => Promise<void>;
  removeFromCart: (itemId: string) => Promise<void>;
  refreshCart: () => Promise<void>;
}

const CartContext = createContext<CartContextProps | undefined>(undefined);

export const CartProvider = ({ children }: { children: React.ReactNode }) => {
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  const fetchCart = async () => {
    if (!user) {
      setCart(null);
      return;
    }
    
    try {
      setLoading(true);
      const cartData = await cartService.getMyCart();
      setCart(cartData);
    } catch (error) {
      console.error("Failed to fetch cart:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCart();
  }, [user]);

  const addToCart = async (
    productId: string,
    quantity: number,
    selectedVariants?: { name: string; value: string }[],
  ) => {
    if (!user) {
      toast.error("Please login to add items to cart");
      return;
    }

    try {
      await cartService.addToCart(productId, quantity, selectedVariants);
      toast.success("Added to cart");
      await fetchCart();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to add to cart");
    }
  };

  const updateQuantity = async (
    itemId: string,
    action: "increase" | "decrease",
    quantity?: number
  ) => {
    try {
      await cartService.updateCartItemQuantity(itemId, action, quantity);
      await fetchCart();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to update cart");
    }
  };

  const removeFromCart = async (itemId: string) => {
    try {
      await cartService.deleteCartItem(itemId);
      toast.success("Item removed from cart");
      await fetchCart();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to remove item");
    }
  };

  return (
    <CartContext.Provider
      value={{
        cart,
        loading,
        addToCart,
        updateQuantity,
        removeFromCart,
        refreshCart: fetchCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
};
