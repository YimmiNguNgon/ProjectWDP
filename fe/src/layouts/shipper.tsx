import { Link, Outlet, useLocation } from "react-router-dom";
import { LayoutDashboard, Package, Truck, Home, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { useContext, useEffect, useState } from "react";
import { SocketContext } from "@/hooks/use-socket";
import NotificationBell from "@/components/notification-bell";
import { getShipperStats } from "@/api/shipper";

const navigation = [
  { name: "Dashboard", href: "/shipper", icon: LayoutDashboard },
  { name: "Available Orders", href: "/shipper/available", icon: Package },
  { name: "My Deliveries", href: "/shipper/my-orders", icon: Truck },
  { name: "Delivery Disputes", href: "/shipper/disputes", icon: AlertTriangle },
];

const STATUS_CONFIG = {
  available: { label: "Available", className: "bg-green-100 text-green-700" },
  shipping: { label: "Shipping", className: "bg-blue-100 text-blue-700" },
  paused: { label: "Paused", className: "bg-red-100 text-red-700" },
} as const;

export default function ShipperLayout() {
  const location = useLocation();
  const { user } = useAuth();
  const socketCtx = useContext(SocketContext);
  const [shipperStatus, setShipperStatus] = useState<"available" | "shipping" | "paused">("available");

  useEffect(() => {
    getShipperStats()
      .then((res) => setShipperStatus(res.data.shipperStatus ?? "available"))
      .catch(() => {});
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex">
        <div className="w-64 bg-white border-r border-gray-200 min-h-screen">
          <div className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                <span className="text-orange-600 font-bold">S</span>
              </div>
              <div className="flex-1">
                <h1 className="text-xl font-bold text-gray-900">Shipper Panel</h1>
                <p className="text-sm text-gray-600">
                  {user?.username || user?.email?.split("@")[0]}
                </p>
                <span className={`inline-block mt-1 text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_CONFIG[shipperStatus].className}`}>
                  {STATUS_CONFIG[shipperStatus].label}
                </span>
              </div>
              <NotificationBell socket={socketCtx?.socket ?? undefined} />
            </div>
          </div>

          <nav className="px-3 space-y-1">
            {navigation.map((item) => {
              const Icon = item.icon;
              const isActive =
                location.pathname === item.href ||
                (item.href !== "/shipper" && location.pathname.startsWith(item.href));

              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-colors group",
                    isActive
                      ? "bg-orange-50 text-orange-700 border-l-4 border-orange-600"
                      : "text-gray-700 hover:bg-gray-50 hover:text-gray-900",
                  )}
                >
                  <Icon
                    className={cn(
                      "h-5 w-5",
                      isActive ? "text-orange-600" : "text-gray-400 group-hover:text-gray-600",
                    )}
                  />
                  <span>{item.name}</span>
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
              <span>Back to Home</span>
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
                        (nav.href !== "/shipper" && location.pathname.startsWith(nav.href)),
                    )?.name || "Dashboard"}
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
