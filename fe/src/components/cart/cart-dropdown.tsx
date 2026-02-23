import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { LogIn, ShoppingCart } from "lucide-react";
import type { PropsWithChildren } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useCart } from "@/contexts/cart-context";
import { CartDropdownItem } from "./cart-dropdown-item";
import { useAuth } from "@/hooks/use-auth";

export const CartDropdown = ({ children }: PropsWithChildren) => {
  const { cart } = useCart();
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Calculate from cart or default to 0
  const itemCount = cart?.items.length || 0;
  const subtotal = cart?.totalPrice || 0;

  const isCart = location.pathname === "/cart";

  if (isCart) {
    return (
      <div className="relative">
        {children}
        {itemCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white">
            {itemCount > 99 ? "99+" : itemCount}
          </span>
        )}
      </div>
    );
  }
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <div className="relative">
          {children}
          {itemCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white">
              {itemCount > 99 ? "99+" : itemCount}
            </span>
          )}
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[350px]">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span className="font-bold text-lg">Shopping Cart</span>
          {user && (
            <span className="text-muted-foreground text-sm font-normal">
              ({itemCount} items)
            </span>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        <div className="flex flex-col h-full">
          <ScrollArea
            className={`${user ? "h-[300px] p-2" : "h-[200px] p-2 flex-1"}`}
          >
            {user ? (
              cart && cart.items.length > 0 ? (
                <div className="flex flex-col gap-0 divide-y">
                  {cart.items.map((item) => (
                    <CartDropdownItem key={item._id} item={item} />
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2 py-8">
                  <ShoppingCart className="size-12 opacity-20" />
                  <p>Your cart is empty</p>
                </div>
              )
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2 py-8">
                <LogIn className="size-12 opacity-20" />
                <p>You have to login to view your cart</p>
              </div>
            )}
          </ScrollArea>

          {!user && (
            <div className="p-3 border-t flex gap-2">
              <Button
                onClick={() => navigate("/auth/sign-in")}
                className="w-1/2 cursor-pointer"
              >
                Login
              </Button>
              <Button
                onClick={() => navigate("/auth/sign-up")}
                className="w-1/2 border border-blue-500 text-blue-500 cursor-pointer hover:text-blue-400 hover:bg-white"
                variant="outline"
              >
                Register
              </Button>
            </div>
          )}
        </div>

        {user && (
          <>
            <DropdownMenuSeparator />
            <div className="p-2 space-y-4">
              <div className="flex items-center justify-between font-bold">
                <span>Subtotal</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" asChild>
                  <Link to="/cart">View Cart</Link>
                </Button>
                <Button asChild>
                  <Link to="/checkout">Checkout</Link>
                </Button>
              </div>
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default CartDropdown;
