import React, { useState, useMemo } from "react";
import CartItem from "@/components/cart/cart-item";
import CartSubtotal from "@/components/cart/cart-subtotal";
import { useCart } from "@/contexts/cart-context";
import { ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const CartPage = () => {
  const { cart } = useCart();
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  const navigate = useNavigate();

  const items = useMemo(() => cart?.items || [], [cart?.items]);
  const purchasableItems = useMemo(
    () =>
      items.filter((item) => {
        const availableStock = item.availableStock ?? 0;
        return !item.isOutOfStock && item.quantity <= availableStock;
      }),
    [items],
  );
  const purchasableItemIds = useMemo(
    () => purchasableItems.map((item) => item._id),
    [purchasableItems],
  );

  const isAllSelected =
    purchasableItems.length > 0 &&
    selectedItemIds.length === purchasableItems.length;

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedItemIds([]);
    } else {
      setSelectedItemIds(purchasableItems.map((item) => item._id));
    }
  };

  const handleToggleItem = (itemId: string) => {
    const item = items.find((x) => x._id === itemId);
    const availableStock = item?.availableStock ?? 0;
    const isPurchasable =
      !!item && !item.isOutOfStock && item.quantity <= availableStock;
    if (!isPurchasable) return;

    setSelectedItemIds((prev) =>
      prev.includes(itemId)
        ? prev.filter((id) => id !== itemId)
        : [...prev, itemId],
    );
  };

  React.useEffect(() => {
    const allowedIds = new Set(purchasableItemIds);
    setSelectedItemIds((prev) => {
      const next = prev.filter((id) => allowedIds.has(id));
      if (next.length === prev.length && next.every((id, idx) => id === prev[idx])) {
        return prev;
      }
      return next;
    });
  }, [purchasableItemIds]);

  const selectedItems = useMemo(() => {
    return items.filter((item) => selectedItemIds.includes(item._id));
  }, [items, selectedItemIds]);

  const selectedTotalPrice = useMemo(() => {
    return selectedItems.reduce(
      (total, item) => total + item.priceSnapShot * item.quantity,
      0,
    );
  }, [selectedItems]);

  const selectedCount = useMemo(() => {
    return selectedItems.reduce((total, item) => total + item.quantity, 0);
  }, [selectedItems]);

  const handleCheckout = () => {
    if (!selectedItemIds.length) return;
    navigate("/checkout", {
      state: {
        source: "cart",
        cartItemIds: selectedItemIds,
      },
    });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="font-bold text-4xl text-gray-900 mb-8">Shopping Cart</h1>

      <div className="grid grid-cols-12 gap-8 mt-4">
        <div className="col-span-12 lg:col-span-8">
          {/* Select All Section */}
          {items.length > 0 && (
            <div className="flex items-center gap-3 bg-white p-4 rounded-xl border border-gray-200 shadow-sm mb-4">
              <input
                type="checkbox"
                id="select-all"
                checked={isAllSelected}
                onChange={handleToggleSelectAll}
                className="w-5 h-5 rounded border-gray-300 accent-blue-600 focus:ring-blue-500  cursor-pointer"
              />
              <label
                htmlFor="select-all"
                className="text-base font-medium text-gray-700 cursor-pointer"
              >
                Select all purchasable items ({purchasableItems.length})
              </label>
            </div>
          )}

          {/* Cart Items */}
          <div className="space-y-4">
            {items.length > 0 ? (
              items.map((item) => (
                <CartItem
                  key={item._id}
                  item={item}
                  isSelected={selectedItemIds.includes(item._id)}
                  onToggle={() => handleToggleItem(item._id)}
                />
              ))
            ) : (
              <div className="flex flex-col bg-white p-12 rounded-xl border border-gray-200 shadow-sm text-center items-center gap-2">
                <ShoppingBag className="h-20 w-20 text-gray-200" />
                <p className="text-xl text-gray-500">Your cart is empty</p>
                <Button
                  className="cursor-pointer"
                  onClick={() =>
                    navigate("/products?minPrice=0&maxPrice=10000")
                  }
                >
                  Browse Product
                </Button>
              </div>
            )}
          </div>
        </div>

        <div className="col-span-12 lg:col-span-4">
          <CartSubtotal
            itemCount={selectedCount}
            totalItemPrice={selectedTotalPrice}
            onCheckout={handleCheckout}
            checkoutDisabled={!selectedItemIds.length}
          />
        </div>
      </div>
    </div>
  );
};

export default CartPage;
