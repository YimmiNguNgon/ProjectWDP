import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import UserMenu from "@/components/user-menu";
import { SearchContainer } from "@/components/search-container";
import { useAuth } from "@/hooks/use-auth";
import { MessageContext, type Message } from "@/hooks/use-message";
import { SocketContext } from "@/hooks/use-socket";
import { ShoppingCart } from "lucide-react";
import type { PropsWithChildren } from "react";
import React from "react";
import { Link, Outlet, useNavigate } from "react-router-dom";
import io, { type Socket } from "socket.io-client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { WatchlistPreview } from "@/components/watchlist/watchlist-preview";
import CartDropdown from "@/components/cart/cart-dropdown";
import NotificationBell from "@/components/notification-bell";

const LEFT_NAV_ITEMS = [
  { name: "Browse Products", to: "/products" },
  { name: "Daily Deals", to: "/products" },
  { name: "Brand Outlet", to: "/products" },
  { name: "Gift Cards", to: "/products" },
  { name: "Help & Contact", to: "#" },
] as const;

const RIGHT_NAV_ITEMS = [
  { name: "Ship to", to: "#" },
  { name: "Sell", to: "#" },
];

export function Protected() {
  const { user } = useAuth();
  const navigate = useNavigate();

  if (!user) return navigate("/auth/sign-in");

  return <Outlet />;
}

export function MainLayout() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const socketCtx = React.useContext(SocketContext);

  return (
    <div className="flex flex-col gap-4 min-h-dvh">
      <header className="border-b bg-background">
        <section className="border-b h-8">
          <Container className="h-full flex items-center justify-between">
            <div className="flex gap-4">
              {user ? (
                <UserMenu />
              ) : (
                <Link
                  to={"/auth/sign-in"}
                  className="text-primary font-medium text-sm"
                >
                  Sign In
                </Link>
              )}
              {LEFT_NAV_ITEMS.map((item) =>
                item.to === "#" ? (
                  <button
                    key={item.name}
                    onClick={() =>
                      toast.info(`${item.name} feature coming soon!`)
                    }
                    className="font-medium text-sm hover:underline cursor-pointer"
                  >
                    {item.name}
                  </button>
                ) : (
                  <Link
                    key={item.name}
                    to={item.to}
                    className="font-medium text-sm hover:underline cursor-pointer"
                  >
                    {item.name}
                  </Link>
                ),
              )}
            </div>
            <div className="flex gap-4 items-center">
              {RIGHT_NAV_ITEMS.map((item) => (
                <button
                  key={item.name}
                  onClick={() =>
                    toast.info(`${item.name} feature coming soon!`)
                  }
                  className="font-medium text-sm hover:underline cursor-pointer"
                >
                  {item.name}
                </button>
              ))}
              {/* Watchlist Dropdown */}
              <WatchlistPreview />
              {/* My eBay dropdown */}
              <MyEbayMenu />
              {/* Admin Menu - only show for admin users */}
              {user?.role === "admin" && <AdminMenu />}
              {/* Seller Menu - only show for seller users */}
              {user?.role === "seller" && <SellerMenu />}
              {/* Notification Bell */}
              {user && (
                <NotificationBell socket={socketCtx?.socket ?? undefined} />
              )}
              <CartDropdown>
                <button className="hover:opacity-70 cursor-pointer">
                  <ShoppingCart className="size-4" />
                </button>
              </CartDropdown>
            </div>
          </Container>
        </section>
        <section className="h-18">
          <Container className="h-full flex items-center justify-between gap-4">
            <Link to={"/"} className="flex">
              <img
                src="/ebay-logo-txt.png"
                alt="ebay logo"
                className="h-12 w-auto"
              />
            </Link>
            <SearchContainer className="h-10" />
            <Button size={"lg"} onClick={() => navigate("/products")}>
              Search
            </Button>
          </Container>
        </section>
      </header>
      <main className="flex-1">
        <Container>
          <Outlet />
        </Container>
      </main>
      <footer className="border-t border-gray-200 bg-gray-50 mt-12">
        <div className="mx-auto max-w-7xl px-4 py-8">
          {/* Footer links grid */}
          <div className="grid grid-cols-4 gap-8 mb-8">
            <div>
              <h3 className="font-semibold text-gray-900 mb-3">Buy</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>
                  <Link to="#" className="hover:text-blue-600">
                    Registration
                  </Link>
                </li>
                <li>
                  <Link to="#" className="hover:text-blue-600">
                    eBay Money Back Guarantee
                  </Link>
                </li>
                <li>
                  <Link to="#" className="hover:text-blue-600">
                    Bidding & Buying Help
                  </Link>
                </li>
                <li>
                  <Link to="#" className="hover:text-blue-600">
                    Stores
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-3">Sell</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>
                  <Link to="#" className="hover:text-blue-600">
                    Start Selling
                  </Link>
                </li>
                <li>
                  <Link to="#" className="hover:text-blue-600">
                    Learn to Sell
                  </Link>
                </li>
                <li>
                  <Link to="#" className="hover:text-blue-600">
                    Selling Policies
                  </Link>
                </li>
                <li>
                  <Link to="#" className="hover:text-blue-600">
                    Seller Centre
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-3">
                Stay Connected
              </h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>
                  <Link to="#" className="hover:text-blue-600">
                    eBay Blogs
                  </Link>
                </li>
                <li>
                  <Link to="#" className="hover:text-blue-600">
                    eBay on Facebook
                  </Link>
                </li>
                <li>
                  <Link to="#" className="hover:text-blue-600">
                    eBay on Twitter
                  </Link>
                </li>
                <li>
                  <Link to="#" className="hover:text-blue-600">
                    Mobile Apps
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-3">About eBay</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>
                  <Link to="#" className="hover:text-blue-600">
                    Company Info
                  </Link>
                </li>
                <li>
                  <Link to="#" className="hover:text-blue-600">
                    News
                  </Link>
                </li>
                <li>
                  <Link to="#" className="hover:text-blue-600">
                    Investors
                  </Link>
                </li>
                <li>
                  <Link to="#" className="hover:text-blue-600">
                    Careers
                  </Link>
                </li>
              </ul>
            </div>
          </div>
          {/* Bottom bar */}
          <div className="border-t border-gray-200 pt-6 flex items-center justify-between text-xs text-gray-600">
            <p>&copy; 2025 eBay Inc. All rights reserved.</p>
            <div className="flex gap-4">
              <Link to="#" className="hover:text-blue-600">
                Privacy
              </Link>
              <Link to="#" className="hover:text-blue-600">
                Cookies
              </Link>
              <Link to="#" className="hover:text-blue-600">
                Terms
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export const SocketProvider = ({ children }: PropsWithChildren) => {
  const [socket, setSocket] = React.useState<Socket>();
  const { payload } = useAuth();
  const msgCtx = React.useContext(MessageContext);

  const socketRef = React.useRef<Socket>(null);

  // Effect 1: Tao socket 1 lan duy nhat
  React.useEffect(() => {
    const url = import.meta.env.VITE_API_BASE_URL;
    const newSocket = io(url, { autoConnect: true });
    socketRef.current = newSocket;

    newSocket.on("connect", () => {
      setSocket(newSocket);
    });

    newSocket.on("disconnect", () => {
      setSocket(undefined);
    });

    newSocket.on("new_message", (res: { ok: boolean; data: Message }) => {
      const { ok, data } = res;
      if (ok && data && msgCtx?.setMessages) {
        msgCtx.setMessages((messages) => [data, ...messages!]);
      }
    });

    return () => {
      newSocket.off("new_message");
      newSocket.disconnect();
    };
    // Chi chay 1 lan khi mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Effect 2: Emit auth moi khi payload thay doi (login/logout)
  React.useEffect(() => {
    const sock = socketRef.current;
    if (!sock) return;

    if (payload?.userId) {
      // Neu socket da connect thi emit ngay, neu chua thi cho connect
      if (sock.connected) {
        sock.emit("auth", { userId: payload.userId });
      } else {
        const onConnect = () => {
          sock.emit("auth", { userId: payload.userId });
        };
        sock.once("connect", onConnect);
        return () => {
          sock.off("connect", onConnect);
        };
      }
    }
  }, [payload?.userId]);

  const value = React.useMemo(() => ({ socket }), [socket]);

  return (
    <SocketContext.Provider value={value}>{children}</SocketContext.Provider>
  );
};

const MY_EBAY_ITEMS = [
  { label: "Summary", to: "#" },
  { label: "Recently Viewed", to: "#" },
  { label: "Bids/Offers", to: "#" },
  { label: "Watchlist", to: "activity/watchlist" },
  { label: "Purchase History", to: "activity/purchases" },
  { label: "Feedback Requests", to: "/buyer/feedback-requests" },
  { label: "Buy Again", to: "#" },
  { label: "--- Selling ---", to: "", disabled: true }, // Section divider
  { label: "My Listings", to: "/seller/my-listings" },
  { label: "Inventory", to: "/seller/inventory" },
  { label: "Sold Items", to: "/seller/sold" },
  { label: "Promotion Requests", to: "/seller/promotion-requests" },
  { label: "--- Account ---", to: "", disabled: true }, // Section divider
  { label: "Saved Feed", to: "#" },
  { label: "Saved Searches", to: "#" },
  { label: "Saved Sellers", to: "#" },
  { label: "Payment", to: "#" },
  { label: "My Garage", to: "#" },
  { label: "Preferences", to: "#" },
  { label: "My Collection", to: "#" },
  { label: "Messages", to: "messages" },
  { label: "PSA Vault", to: "#" },
];

function MyEbayMenu() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="font-medium cursor-pointer text-sm outline-none">
        My eBay
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="w-48 max-h-96 overflow-y-auto"
        align="end"
      >
        {MY_EBAY_ITEMS.map((item, index) => {
          // Section divider
          if (item.disabled) {
            return (
              <div
                key={index}
                className="px-2 py-1.5 text-xs font-semibold text-gray-500"
              >
                {item.label.replace(/---/g, "").trim()}
              </div>
            );
          }

          return (
            <DropdownMenuItem
              key={item.label}
              asChild
              className="cursor-pointer"
            >
              <Link
                to={item.to.startsWith("/") ? item.to : `/my-ebay/${item.to}`}
              >
                {item.label}
              </Link>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function AdminMenu() {
  return (
    <Link
      to="/admin"
      className="font-medium text-sm text-red-600 hover:text-red-700"
    >
      Admin Panel
    </Link>
  );
}

function SellerMenu() {
  return (
    <Link
      to="/seller"
      className="font-medium text-sm text-red-600 hover:text-red-700"
    >
      Seller Panel
    </Link>
  );
}
