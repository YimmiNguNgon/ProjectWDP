import { Button } from "@/components/ui/button";
import { type CartItem as CartItemType } from "@/services/cart.service";
import { useCart } from "@/contexts/cart-context";
import { Minus, Plus, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";

interface CartItemProps {
  item: CartItemType;
}

export const CartDropdownItem = ({ item }: CartItemProps) => {
  const { updateQuantity, removeFromCart } = useCart();
  const availableStock = item.availableStock ?? item.product.stock ?? 0;
  const isOutOfStock = Boolean(item.isOutOfStock);

  const handleIncrease = () => {
    if (isOutOfStock) return;
    updateQuantity(item._id, "increase");
  };

  const handleDecrease = () => {
    if (item.quantity > 1) {
      updateQuantity(item._id, "decrease");
    } else {
      removeFromCart(item._id);
    }
  };

  const handleRemove = () => {
    removeFromCart(item._id);
  };

  return (
    <div className="flex gap-4 py-3 group">
      <div className="h-20 w-20 overflow-hidden rounded-md border shrink-0">
        <img
          src={item.product?.image}
          alt={item.product?.title}
          className="h-full w-full object-cover"
        />
      </div>
      <div className="flex flex-1 flex-col justify-between">
        <div className="flex justify-between gap-2">
          <div className="flex flex-col gap-1 mb-1">
            <Link
              to={`/products/${item.product._id}`}
              className="text-sm font-medium leading-tight line-clamp-2 hover:underline"
            >
              {item.product.title}
            </Link>
            <p className="text-sm text-muted-foreground line-clamp-1">
              {item.product.description}
            </p>
          </div>
          <p className="text-sm font-bold whitespace-nowrap">
            ${(item.priceSnapShot * item.quantity).toFixed(2)}
          </p>
        </div>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-2 border rounded-md p-0.5">
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5 rounded-sm cursor-pointer"
              onClick={handleDecrease}
            >
              <Minus className="size-3" />
            </Button>
            <span className="w-4 text-center text-xs font-medium text-foreground">
              {item.quantity}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5 rounded-sm cursor-pointer"
              onClick={handleIncrease}
              disabled={isOutOfStock || item.quantity >= availableStock}
            >
              <Plus className="size-3" />
            </Button>
          </div>
          {item.availabilityMessage && (
            <span className="text-[11px] font-medium text-red-600">
              {item.availabilityMessage}
            </span>
          )}
          <button
            onClick={handleRemove}
            className="text-red-500 cursor-pointer hover:text-red-600 hover:bg-red-50 p-1 rounded transition-colors opacity-0 group-hover:opacity-100"
            title="Remove item"
          >
            <Trash2 className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
