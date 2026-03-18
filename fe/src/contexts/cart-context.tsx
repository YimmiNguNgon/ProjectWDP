import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
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
    quantity?: number,
  ) => Promise<void>;
  removeFromCart: (itemId: string) => Promise<void>;
  toggleSaveForLater: (itemId: string) => Promise<void>;
  refreshCart: () => Promise<void>;
}

const CartContext = createContext<CartContextProps | undefined>(undefined);

export const CartProvider = ({ children }: { children: React.ReactNode }) => {
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const unavailableNotifiedRef = useRef<Set<string>>(new Set());
  const isFetchingRef = useRef(false);

  const fetchCart = useCallback(async (options?: { silent?: boolean }) => {
    if (!user) {
      setCart(null);
      return;
    }

    if (isFetchingRef.current) {
      return;
    }

    try {
      isFetchingRef.current = true;
      if (!options?.silent) {
        setLoading(true);
      }
      const cartData = await cartService.getMyCart();
      setCart(cartData);

      const latestUnavailable = new Set<string>();
      for (const item of cartData?.items || []) {
        const isUnavailable = item.availabilityStatus
          ? ["out_of_stock", "unavailable"].includes(item.availabilityStatus)
          : Boolean(item.isOutOfStock);
        if (isUnavailable) {
          latestUnavailable.add(item._id);
          if (!unavailableNotifiedRef.current.has(item._id)) {
            toast.error(
              item.availabilityMessage ||
                `Product ${item.product?.title || ""} is currently unavailable`,
            );
            unavailableNotifiedRef.current.add(item._id);
          }
        }
      }

      for (const existing of [...unavailableNotifiedRef.current]) {
        if (!latestUnavailable.has(existing)) {
          unavailableNotifiedRef.current.delete(existing);
        }
      }
    } catch (error) {
      console.error("Failed to fetch cart:", error);
    } finally {
      isFetchingRef.current = false;
      if (!options?.silent) {
        setLoading(false);
      }
    }
  }, [user]);

  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  useEffect(() => {
    if (!user || !(cart?.items?.length || 0)) return;

    const pollId = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      fetchCart({ silent: true });
    }, 3000);

    const handleFocusRefresh = () => {
      fetchCart({ silent: true });
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState !== "visible") return;
      fetchCart({ silent: true });
    };

    window.addEventListener("focus", handleFocusRefresh);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.clearInterval(pollId);
      window.removeEventListener("focus", handleFocusRefresh);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [user, cart?.items?.length, fetchCart]);

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
    quantity?: number,
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

  const toggleSaveForLater = async (itemId: string) => {
    try {
      const res = await cartService.toggleSaveForLater(itemId);
      toast.success(res.message);
      await fetchCart();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to toggle save for later item");
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
        toggleSaveForLater,
        refreshCart: () => fetchCart(),
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
