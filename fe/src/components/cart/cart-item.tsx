import { type CartItem as CartItemType } from "@/services/cart.service";
import { useCart } from "@/contexts/cart-context";
import { Minus, Plus, Trash2 } from "lucide-react";
import React, { useState } from "react";
import { Link } from "react-router-dom";

interface CartItemProps {
  item: CartItemType;
}

const formatVND = (amount: number) => amount.toLocaleString("vi-VN") + " VND";

export const CartItem = ({ item }: CartItemProps) => {
  const { updateQuantity, removeFromCart } = useCart();
  const [quantity, setQuantity] = useState(item.quantity);

  // Helper values mapping from item
  const sellerName = item.seller?.name || "Unknown Seller";
  // Mock data for missing fields
  const sellerFeedback = 98;
  const description = item.product.description; // This could come from product description or attributes if available
  const shipping = 0; // Free shipping for now or calculate
  const shippingVND = 0;
  const shippingMethod = "Standard Shipping";
  const inCartCount = 1; // Mock

  const price = item.priceSnapShot;
  const priceVND = price * 25400; // Approx rate

  const imageUrl = item.product.images || ""; // Use the string directly as per Step 102

  const handleDecrease = () => {
    if (quantity > 1) {
      const newQty = quantity - 1;
      setQuantity(newQty);
      updateQuantity(item._id, "decrease");
    } else {
      // If quantity is 1 and user clicks minus, maybe ask to remove?
      // Current UI has specific delete button, so maybe just do nothing or remove?
      removeFromCart(item._id);
    }
  };

  const handleIncrease = () => {
    if (quantity < item.product.stock) {
      const newQty = quantity + 1;
      setQuantity(newQty);
      updateQuantity(item._id, "increase");
    }
  };

  const handleRemove = () => {
    removeFromCart(item._id);
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden font-sans w-full mb-4">
      {/* Seller header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50">
        <div className="flex items-center gap-2">
          {/* Seller avatar placeholder */}
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-rose-500 flex items-center justify-center text-white text-xs font-bold shadow-sm">
            {sellerName.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <p className="text-base font-semibold text-gray-900 leading-tight">
              {sellerName}
            </p>
            <p className="text-sm text-green-600 font-medium">
              {sellerFeedback}% positive feedback
            </p>
          </div>
        </div>
        {/* <button className="text-xs text-blue-600 hover:text-blue-800 hover:underline font-medium transition-colors">
          Pay only this seller
        </button> */}
      </div>

      {/* Item body */}
      <div className="p-4 flex gap-4">
        {/* Product image */}
        <div className="flex-shrink-0 w-28 h-28 rounded-lg bg-gray-100 border border-gray-200 overflow-hidden flex items-center justify-center relative">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={item.product.title}
              className="w-full h-full object-cover"
            />
          ) : (
            /* Placeholder bag SVG */
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
          {/* In other carts badge */}
          {/* <div className="absolute top-1 left-1">
            <span className="bg-blue-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-sm uppercase tracking-wide whitespace-nowrap">
              In {inCartCount} other carts
            </span>
          </div> */}
        </div>

        {/* Product details */}
        <div className="flex-1 min-w-0">
          <Link
            to={`/products/${item.product._id}`} // Assuming ID for now as slug wasn't in new type definition
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
            {/* <div className="flex items-baseline gap-1">
              <span className="text-base font-medium text-gray-700">
                + US ${shipping.toFixed(2)}
              </span>
              <span className="text-sm text-gray-400">
                ({formatVND(shippingVND)})
              </span>
            </div> */}
            {/* <p className="text-sm text-gray-500">{shippingMethod}</p> */}
          </div>

          {/* Quantity + Actions */}
          <div className="flex items-center justify-between mt-3 flex-wrap gap-2">
            {/* Quantity controls */}
            <div className="flex items-center gap-0 border border-gray-300 rounded-lg overflow-hidden h-8 shadow-sm">
              <button
                onClick={handleDecrease}
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
                onClick={handleIncrease}
                disabled={quantity >= item.product.stock}
                className="w-8 h-8 flex cursor-pointer items-center justify-center text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors border-l border-gray-300"
              >
                <Plus className="size-3.5" />
              </button>
            </div>

            {/* Action links */}
            <div className="flex items-center gap-1 text-sm flex-wrap">
              <button
                // onClick={onBuyNow}
                className="text-blue-600 cursor-pointer hover:text-blue-800 hover:underline font-medium transition-colors px-1"
              >
                Buy it now
              </button>
              <span className="text-gray-300">|</span>
              <button
                // onClick={onSaveForLater}
                className="text-blue-600 cursor-pointer hover:text-blue-800 hover:underline font-medium transition-colors px-1"
              >
                Save for later
              </button>
              <span className="text-gray-300">|</span>
              <button
                onClick={handleRemove}
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
