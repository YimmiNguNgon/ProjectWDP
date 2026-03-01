import { type CartItem as CartItemType } from "@/services/cart.service";
import { useCart } from "@/contexts/cart-context";
import { Minus, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

interface CartItemProps {
  item: CartItemType;
  isSelected?: boolean;
  onToggle?: () => void;
}

const formatVND = (amount: number) => amount.toLocaleString("vi-VN") + " VND";

export const CartItem = ({ item, isSelected, onToggle }: CartItemProps) => {
  const { updateQuantity, removeFromCart } = useCart();
  const [quantity, setQuantity] = useState(item.quantity);
  const navigate = useNavigate();

  useEffect(() => {
    setQuantity(item.quantity);
  }, [item.quantity]);

  const description = item.product.description;

  const price = item.priceSnapShot;
  const priceVND = price * 25400; // Approx rate
  const availableStock =
    item.availableStock ?? item.product.quantity ?? item.product.stock;
  const isOutOfStock = Boolean(item.isOutOfStock);
  const isInsufficient = item.availabilityStatus === "insufficient_stock";
  const isPurchasable =
    !isOutOfStock && !isInsufficient && quantity <= availableStock;
  const availabilityMessage = item.availabilityMessage;

  const imageUrl = item.product.image || "";

  const handleDecrease = () => {
    if (quantity > 1) {
      const newQty = quantity - 1;
      setQuantity(newQty);
      updateQuantity(item._id, "decrease");
    } else {
      removeFromCart(item._id);
    }
  };

  const handleIncrease = () => {
    if (!isOutOfStock && quantity < availableStock) {
      const newQty = quantity + 1;
      setQuantity(newQty);
      updateQuantity(item._id, "increase");
    }
  };

  const handleRemove = () => {
    removeFromCart(item._id);
  };

  const handleBuyNow = () => {
    if (!isPurchasable) return;
    navigate("/checkout", {
      state: {
        source: "cart",
        cartItemIds: [item._id],
      },
    });
  };

  return (
    <div
      onClick={() => {
        if (!isPurchasable) return;
        onToggle?.();
      }}
      className={`bg-white rounded-xl border-2 transition-all duration-200 shadow-sm overflow-hidden font-sans w-full mb-4 cursor-pointer hover:shadow-md ${
        isSelected ? "border-blue-300 ring-1 ring-blue-300" : "border-gray-200"
      }`}
    >
      {/* Item body */}
      <div className="p-4 flex gap-4 items-start">
        {/* Product image */}
        <div className="flex-shrink-0 w-28 h-28 rounded-lg bg-gray-100 border border-gray-200 overflow-hidden flex items-center justify-center relative">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={item.product.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <svg
              viewBox="0 0 100 100"
              className="w-20 h-20 text-gray-300"
              fill="currentColor"
            >
              <rect
                x="20"
                y="35"
                width="60"
                height="45"
                rx="5"
                fill="#1a1a1a"
              />
              <path
                d="M35 35 Q35 20 50 20 Q65 20 65 35"
                stroke="#1a1a1a"
                strokeWidth="4"
                fill="none"
                strokeLinecap="round"
              />
              <rect
                x="15"
                y="30"
                width="70"
                height="12"
                rx="3"
                fill="#2a2a2a"
              />
            </svg>
          )}
        </div>

        {/* Product details */}
        <div className="flex-1 min-w-0">
          <Link
            to={`/products/${item.product._id}`}
            onClick={(e) => e.stopPropagation()}
            className="text-lg font-semibold text-blue-700 hover:text-blue-900 hover:underline leading-snug line-clamp-2 block transition-colors"
          >
            {item.product.title}
          </Link>
          <p className="text-sm text-gray-500 mt-0.5 mb-2">{description}</p>

          {/* Pricing */}
          <div className="space-y-0.5">
            <div>
              <span className="text-xl font-bold text-gray-900">
                US ${price.toFixed(2)}
              </span>
              <span className="text-sm text-gray-400 ml-1">
                ({formatVND(priceVND)})
              </span>
            </div>
          </div>

          {/* Quantity + Actions */}
          <div className="flex items-center justify-between mt-3 flex-wrap gap-2">
            {/* Quantity controls */}
            <div className="flex items-center gap-5">
              <div
                className="flex items-center gap-0 border border-gray-300 rounded-lg overflow-hidden h-8 shadow-sm bg-white"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDecrease();
                  }}
                  className="w-8 h-8 flex cursor-pointer items-center justify-center text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors border-r border-gray-300"
                >
                  {quantity === 1 ? (
                    <Trash2 className="size-3.5" />
                  ) : (
                    <Minus className="size-3.5" />
                  )}
                </button>
                <span className="w-8 text-center text-base font-semibold text-gray-800 select-none">
                  {quantity}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleIncrease();
                  }}
                  disabled={isOutOfStock || quantity >= availableStock}
                  className="w-8 h-8 flex cursor-pointer items-center justify-center text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors border-l border-gray-300"
                >
                  <Plus className="size-3.5" />
                </button>
              </div>
              <span className="text-muted-foreground">
                Stock: {availableStock}
              </span>
            </div>
            {availabilityMessage && (
              <div className="w-full text-sm font-medium text-red-600">
                {availabilityMessage}
              </div>
            )}
            {item.selectedVariants && item.selectedVariants.length > 0 && (
              <div className="text-sm text-muted-foreground">
                Variant:{" "}
                {item.selectedVariants
                  .map((v) => `${v.name}: ${v.value}`)
                  .join(", ")}
              </div>
            )}

            {/* Action links */}
            <div className="flex items-center gap-1 text-sm flex-wrap">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleBuyNow();
                }}
                disabled={!isPurchasable}
                className="text-blue-600 cursor-pointer hover:text-blue-800 hover:underline font-medium transition-colors px-1 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Buy it now
              </button>
              <span className="text-gray-300">|</span>
              <button
                onClick={(e) => e.stopPropagation()}
                className="text-blue-600 cursor-pointer hover:text-blue-800 hover:underline font-medium transition-colors px-1"
              >
                Save for later
              </button>
              <span className="text-gray-300">|</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemove();
                }}
                className="text-blue-600 cursor-pointer hover:text-blue-800 hover:underline font-medium transition-colors px-1"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CartItem;
