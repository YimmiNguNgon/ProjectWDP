import { useCart } from "@/contexts/cart-context";
import { Button } from "../ui/button";

interface CartSubtotalProps {
  itemCount?: number;
  totalItemPrice?: number;
  onCheckout?: () => void;
  checkoutDisabled?: boolean;
}

const CartSubtotal = ({
  itemCount: propsItemCount,
  totalItemPrice: propsTotalItemPrice,
  onCheckout,
  checkoutDisabled = false,
}: CartSubtotalProps) => {
  const { cart } = useCart();

  const itemCount = propsItemCount ?? cart?.totalItems ?? 0;
  const totalItemPrice = propsTotalItemPrice ?? cart?.totalPrice ?? 0;

  const subtotal = totalItemPrice === 0 ? 0 : totalItemPrice + 0;
  return (
    <div className="flex flex-col bg-gray-400/10 p-10 rounded-md">
      {/* Title */}
      <h1 className="text-3xl font-bold">Order Summary</h1>

      {/* Subtotal */}
      <div className="flex flex-col mt-6">
        <div className="flex items-center justify-between text-xl">
          <p>Items {`(${itemCount})`}:</p>
          <p>${totalItemPrice}</p>
        </div>
        {/* <div className="flex items-center justify-between text-xl my-2">
          <p>Shipping:</p>
          <p>Free</p>
        </div> */}
        <div className="flex items-center justify-between text-xl">
          <p>Discount:</p>
          <p>$0</p>
        </div>
      </div>
      <div className="border border-gray-300 my-6"></div>
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between font-semibold text-xl">
          <p>Subtotal:</p>
          <p>${subtotal}</p>
        </div>
        <Button
          className="text-lg cursor-pointer"
          size="lg"
          onClick={onCheckout}
          disabled={checkoutDisabled}
        >
          Go to Checkout
        </Button>
      </div>
    </div>
  );
};

export default CartSubtotal;
