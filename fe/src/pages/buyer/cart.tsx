import CartItem from "@/components/cart/cart-item";
import CartSubtotal from "@/components/cart/cart-subtotal";
import { useCart } from "@/contexts/cart-context";

const CartPage = () => {
  const { cart } = useCart();
  return (
    <div>
      <h1 className="font-bold text-4xl">Cart</h1>
      <div className="grid grid-cols-12 gap-16 mt-4">
        <div className="col-span-7 ">
          {/* Cart Items */}
          {cart?.items.map((item) => (
            <CartItem item={item} />
          ))}
          {/* Related Items */}
        </div>
        <div className="col-span-5">
          {/* Cart Title & static component */}
          {/* Cart Summary */}
          {/* Subtotal info & checkout button */}
          <CartSubtotal />
        </div>
      </div>
    </div>
  );
};

export default CartPage;
