import { Link, Outlet, useLocation } from "react-router-dom";
import { LayoutDashboard, Package, Truck, Home, AlertTriangle, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { useContext, useEffect, useState } from "react";
import { SocketContext } from "@/hooks/use-socket";
import NotificationBell from "@/components/notification-bell";
import { getShipperStats } from "@/api/shipper";

const navigation = [
  { name: "Dashboard",        href: "/shipper",            icon: LayoutDashboard },
  { name: "Available Orders", href: "/shipper/available",  icon: Package },
  { name: "My Deliveries",    href: "/shipper/my-orders",  icon: Truck },
  { name: "Delivery Disputes",href: "/shipper/disputes",   icon: AlertTriangle },
];

const STATUS_DOT: Record<string, string> = {
  available: "bg-green-400",
  shipping:  "bg-blue-400",
};

export default function ShipperLayout() {
  const location = useLocation();
  const { user } = useAuth();
  const socketCtx = useContext(SocketContext);
  const [shipperStatus, setShipperStatus] = useState<string>("available");

  const refreshStatus = () => {
    getShipperStats()
      .then((res) => setShipperStatus(res.data.shipperStatus ?? "available"))
      .catch(() => {});
  };

  useEffect(() => {
    refreshStatus();
  }, [location.pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  // Refresh when backend notifies status changed (e.g., after decline)
  useEffect(() => {
    const socket = socketCtx?.socket;
    if (!socket) return;
    const handler = (data: { type: string }) => {
      if (data.type === "shipper_status_updated" || data.type === "order_assigned") {
        refreshStatus();
      }
    };
    socket.on("notification", handler);
    return () => { socket.off("notification", handler); };
  }, [socketCtx?.socket]); // eslint-disable-line react-hooks/exhaustive-deps

  const currentNav = navigation.find(
    (nav) =>
      nav.href === location.pathname ||
      (nav.href !== "/shipper" && location.pathname.startsWith(nav.href)),
  );

  const dotClass = STATUS_DOT[shipperStatus] ?? "bg-gray-300";

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* ── Sidebar ── */}
      <aside className="w-60 flex-shrink-0 bg-white border-r border-gray-100 flex flex-col min-h-screen shadow-sm">
        {/* Brand */}
        <div className="px-5 pt-6 pb-4">
          {/* Icon + label row */}
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center shadow-sm flex-shrink-0">
              <Truck className="w-4 h-4 text-white" />
            </div>
            <p className="text-xs text-gray-400 font-medium tracking-wide">Shipper Panel</p>
          </div>
          {/* Username below */}
          <p className="text-sm font-bold text-gray-900 truncate mb-4 pl-0.5">
            {user?.username || user?.email?.split("@")[0]}
          </p>

          {/* Status pill */}
          <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-xl">
            <span className="relative flex h-2.5 w-2.5 flex-shrink-0">
              {(shipperStatus === "available" || shipperStatus === "pending_acceptance") && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-60" />
              )}
              <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${dotClass}`} />
            </span>
            <span className="text-xs font-medium text-gray-600 capitalize">
              {shipperStatus === "pending_acceptance" ? "Available" : shipperStatus}
            </span>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 space-y-0.5">
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
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all",
                  isActive
                    ? "bg-orange-50 text-orange-600"
                    : "text-gray-500 hover:bg-gray-50 hover:text-gray-800",
                )}
              >
                <Icon className={cn("h-4 w-4 flex-shrink-0", isActive ? "text-orange-500" : "text-gray-400")} />
                <span className="flex-1">{item.name}</span>
                {isActive && <ChevronRight className="h-3.5 w-3.5 text-orange-400" />}
              </Link>
            );
          })}
        </nav>

        {/* Bottom */}
        <div className="px-3 pb-5 pt-3 border-t border-gray-100">
          <Link
            to="/"
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-400 hover:bg-gray-50 hover:text-gray-700 transition-all"
          >
            <Home className="h-4 w-4" />
            <span>Back to Home</span>
          </Link>
        </div>
      </aside>

      {/* ── Main ── */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Top bar */}
        <header className="bg-white border-b border-gray-100 px-6 py-3.5 flex items-center gap-3 shadow-sm">
          <h2 className="text-base font-bold text-gray-900 flex-1">{currentNav?.name ?? "Dashboard"}</h2>
          <NotificationBell socket={socketCtx?.socket ?? undefined} />
        </header>
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
