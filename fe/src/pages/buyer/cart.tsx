import React, { useState, useMemo } from "react";
import CartItem from "@/components/cart/cart-item";
import CartSubtotal from "@/components/cart/cart-subtotal";
import { useCart } from "@/contexts/cart-context";
import { ShoppingBag } from "lucide-react";

const CartPage = () => {
  const { cart } = useCart();
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);

  const items = cart?.items || [];

  const isAllSelected =
    items.length > 0 && selectedItemIds.length === items.length;

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedItemIds([]);
    } else {
      setSelectedItemIds(items.map((item) => item._id));
    }
  };

  const handleToggleItem = (itemId: string) => {
    setSelectedItemIds((prev) =>
      prev.includes(itemId)
        ? prev.filter((id) => id !== itemId)
        : [...prev, itemId],
    );
  };

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
                Select all items ({items.length})
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
              </div>
            )}
          </div>
        </div>

        <div className="col-span-12 lg:col-span-4">
          <CartSubtotal
            itemCount={selectedCount}
            totalItemPrice={selectedTotalPrice}
          />
        </div>
      </div>
    </div>
  );
};

export default CartPage;
