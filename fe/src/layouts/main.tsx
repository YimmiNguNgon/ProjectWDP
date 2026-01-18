import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import UserMenu from "@/components/user-menu";
import { useAuth } from "@/hooks/use-auth";
import { useMessage, type Message } from "@/hooks/use-message";
import { SocketContext } from "@/hooks/use-socket";
import { Bell, Search, ShoppingCart, X } from "lucide-react";
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
  { name: "Watchlist", to: "#" },
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
                )
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
              {/* My eBay dropdown */}
              <MyEbayMenu />
              {/* Admin Menu - only show for admin users */}
              {user?.role === "admin" && <AdminMenu />}
              <button
                onClick={() => toast.info("Notifications coming soon!")}
                className="hover:opacity-70"
              >
                <Bell className="size-4" />
              </button>
              <button
                onClick={() => toast.info("Shopping cart coming soon!")}
                className="hover:opacity-70"
              >
                <ShoppingCart className="size-4" />
              </button>
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
            <InputGroup className="h-10">
              <InputGroupAddon>
                <Search />
              </InputGroupAddon>
              <InputGroupInput type="text" placeholder="Search for anything" />
              <InputGroupAddon align={"inline-end"}>
                <Button variant={"ghost"} size={"icon-sm"}>
                  <X />
                </Button>
              </InputGroupAddon>
            </InputGroup>
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
  const { conversation, setMessages } = useMessage();

  const socketRef = React.useRef<Socket>(null);

  React.useEffect(() => {
    const url = import.meta.env.VITE_API_BASE_URL;
    const socket = io(url);
    socketRef.current = socket;

    socket.on("connect", () => {
      setSocket(socket);
      socket.emit("auth", { userId: payload?.userId });
    });

    socket.on("disconnect", () => {
      setSocket(undefined);
    });

    socket.on("new_message", (res: { ok: boolean; data: Message }) => {
      const { ok, data } = res;
      if (ok && data) {
        setMessages((messages) => [data, ...messages!]);
      }
    });

    return () => {
      socket.off("new_message");
      socket.disconnect();
    };
  }, [payload, conversation, setMessages]);

  const value = {
    socket,
  };

  return (
    <SocketContext.Provider value={value}>{children}</SocketContext.Provider>
  );
};

const MY_EBAY_ITEMS = [
  { label: "Summary", to: "#" },
  { label: "Recently Viewed", to: "#" },
  { label: "Bids/Offers", to: "#" },
  { label: "Watchlist", to: "#" },
  { label: "Purchase History", to: "activity/purchases" },
  { label: "Feedback Requests", to: "/buyer/feedback-requests" },
  { label: "Buy Again", to: "#" },
  { label: "Selling", to: "#" },
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
      <DropdownMenuContent className="w-48 h-fit" align="end">
        {MY_EBAY_ITEMS.map((item) => (
          <DropdownMenuItem key={item.label} asChild className="cursor-pointer">
            <Link
              to={item.to.startsWith("/") ? item.to : `/my-ebay/${item.to}`}
            >
              {item.label}
            </Link>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

const ADMIN_MENU_ITEMS = [
  { label: "📊 Dashboard", to: "/admin" },
  { label: "👥 User Management", to: "/admin/users" },
  { label: "📦 Product Management", to: "/admin/products" },
  { label: "🛡️ Admin Complaints", to: "/admin/complaints" },
  { label: "⭐ Review Moderation", to: "/admin/reviews" },
  { label: "👥 User Management", to: "/admin/users" },
];

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
