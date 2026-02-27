import { Link, Outlet, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Package,
  ShoppingBag,
  DollarSign,
  Star,
  Home,
  MessageSquare,
  TicketPercent,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";

const navigation = [
  { name: "Tong quan", href: "/seller", icon: LayoutDashboard },
  { name: "Quan ly san pham", href: "/seller/products", icon: Package },
  { name: "Quan ly don hang", href: "/seller/orders", icon: ShoppingBag },
  { name: "Quan ly doanh thu", href: "/seller/revenue", icon: DollarSign },
  { name: "Phan hoi khach hang", href: "/seller/reviews", icon: Star },
  { name: "Quan ly Feedback", href: "/seller/feedback", icon: MessageSquare },
  { name: "Voucher", href: "/seller/vouchers", icon: TicketPercent },
];

export default function SellerLayout() {
  const location = useLocation();
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex">
        <div className="w-64 bg-white border-r border-gray-200 min-h-screen">
          <div className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <span className="text-green-600 font-bold">S</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Seller Panel</h1>
                <p className="text-sm text-gray-600">
                  {user?.username || user?.email?.split("@")[0]}
                </p>
              </div>
            </div>
          </div>

          <nav className="px-3 space-y-1">
            {navigation.map((item) => {
              const Icon = item.icon;
              const isActive =
                location.pathname === item.href ||
                (item.href !== "/seller" && location.pathname.startsWith(item.href));

              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-colors group",
                    isActive
                      ? "bg-green-50 text-green-700 border-l-4 border-green-600"
                      : "text-gray-700 hover:bg-gray-50 hover:text-gray-900",
                  )}
                >
                  <Icon
                    className={cn(
                      "h-5 w-5",
                      isActive ? "text-green-600" : "text-gray-400 group-hover:text-gray-600",
                    )}
                  />
                  <div className="flex flex-col">
                    <span>{item.name}</span>
                  </div>
                </Link>
              );
            })}
          </nav>

          <div className="px-3 mt-6 pt-6 border-t border-gray-200">
            <Link
              to="/"
              className="flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
            >
              <Home className="h-5 w-5 text-gray-400" />
              <span>Ve trang chu</span>
            </Link>
          </div>
        </div>

        <div className="flex-1">
          <div className="bg-white border-b border-gray-200">
            <div className="max-w-full mx-auto px-6 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">
                    {navigation.find(
                      (nav) =>
                        nav.href === location.pathname ||
                        (nav.href !== "/seller" && location.pathname.startsWith(nav.href)),
                    )?.name || "Tong quan"}
                  </h2>
                </div>
              </div>
            </div>
          </div>
          <Outlet />
        </div>
      </div>
    </div>
  );
}
