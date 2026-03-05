import React, { useState, useMemo } from "react";
import CartItem from "@/components/cart/cart-item";
import CartSubtotal from "@/components/cart/cart-subtotal";
import { useCart } from "@/contexts/cart-context";
import { ShoppingBag, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const CartPage = () => {
  const { cart } = useCart();
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  const navigate = useNavigate();

  const items = useMemo(() => cart?.items || [], [cart?.items]);

  // Group items by seller
  const groupedItems = useMemo(() => {
    const groups: Record<string, { sellerName: string; items: typeof items }> =
      {};
    items.forEach((item) => {
      const sellerId = item.seller?._id || "unknown";
      if (!groups[sellerId]) {
        groups[sellerId] = {
          sellerName: item.seller?.username || "Unknown Seller",
          items: [],
        };
      }
      groups[sellerId].items.push(item);
    });
    return groups;
  }, [items]);

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

  const handleToggleSellerSelection = (sellerId: string) => {
    const sellerItems = groupedItems[sellerId].items;
    const sellerPurchasableIds = sellerItems
      .filter((item) => {
        const availableStock = item.availableStock ?? 0;
        return !item.isOutOfStock && item.quantity <= availableStock;
      })
      .map((item) => item._id);

    const allSellerPurchasableSelected = sellerPurchasableIds.every((id) =>
      selectedItemIds.includes(id),
    );

    if (allSellerPurchasableSelected) {
      // Deselect all for this seller
      setSelectedItemIds((prev) =>
        prev.filter((id) => !sellerPurchasableIds.includes(id)),
      );
    } else {
      // Select all for this seller
      setSelectedItemIds((prev) => {
        const next = new Set([...prev, ...sellerPurchasableIds]);
        return Array.from(next);
      });
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
      if (
        next.length === prev.length &&
        next.every((id, idx) => id === prev[idx])
      ) {
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
          {/* Global Select All Section */}
          {items.length > 0 && (
            <div className="flex items-center gap-3 bg-white p-4 rounded-xl border border-gray-200 shadow-sm mb-4">
              <input
                type="checkbox"
                id="select-all-global"
                checked={isAllSelected}
                onChange={handleToggleSelectAll}
                className="w-5 h-5 rounded border-gray-300 accent-blue-600 focus:ring-blue-500 cursor-pointer"
              />
              <label
                htmlFor="select-all-global"
                className="text-base font-bold text-gray-800 cursor-pointer select-none"
              >
                Select all items ({purchasableItems.length})
              </label>
            </div>
          )}

          {/* Cart Items Grouped by Seller */}
          <div className="space-y-8">
            {Object.keys(groupedItems).length > 0 ? (
              Object.entries(groupedItems).map(([sellerId, group]) => {
                const sellerPurchasableIds = group.items
                  .filter((item) => {
                    const availableStock = item.availableStock ?? 0;
                    return (
                      !item.isOutOfStock && item.quantity <= availableStock
                    );
                  })
                  .map((item) => item._id);

                const isSellerAllSelected =
                  sellerPurchasableIds.length > 0 &&
                  sellerPurchasableIds.every((id) =>
                    selectedItemIds.includes(id),
                  );

                return (
                  <div
                    key={sellerId}
                    className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"
                  >
                    {/* Seller Header */}
                    <div className="flex items-center gap-3 p-4 bg-gray-50/50 border-b border-gray-100">
                      <input
                        type="checkbox"
                        id={`select-seller-${sellerId}`}
                        checked={isSellerAllSelected}
                        onChange={() => handleToggleSellerSelection(sellerId)}
                        disabled={sellerPurchasableIds.length === 0}
                        className="w-5 h-5 rounded border-gray-300 accent-blue-600 focus:ring-blue-500 cursor-pointer disabled:opacity-30"
                      />
                      <label
                        htmlFor={`select-seller-${sellerId}`}
                        className="flex items-center gap-2 font-bold text-gray-900 cursor-pointer select-none"
                      >
                        <Store className="h-4 w-4 text-blue-600" />
                        {group.sellerName}
                      </label>
                    </div>

                    {/* Group Items */}
                    <div className="p-4 space-y-4">
                      {group.items.map((item) => (
                        <CartItem
                          key={item._id}
                          item={item}
                          isSelected={selectedItemIds.includes(item._id)}
                          onToggle={() => handleToggleItem(item._id)}
                        />
                      ))}
                    </div>
                  </div>
                );
              })
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

        <div className="col-span-12 lg:col-span-4 sticky top-5 h-fit">
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
