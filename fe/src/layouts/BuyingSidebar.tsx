import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  Clock,
  RotateCcw,
  ShoppingBag,
  Heart,
  Search,
  MessageSquare,
  Store,
} from "lucide-react";

const NAV_ITEMS = [
  { to: "/my-ebay/activity/purchases", label: "Purchases", icon: ShoppingBag },
  { to: "/my-ebay/activity/watchlist", label: "Watchlist", icon: Heart },
  { to: "/my-ebay/recently-viewed", label: "Recently Viewed", icon: Clock },
  { to: "/my-ebay/complaints", label: "Returns & Complaints", icon: RotateCcw },
  { to: "/my-ebay/saved-searches", label: "Saved Searches", icon: Search },
  { to: "/my-ebay/feedback-requests", label: "Feedback Requests", icon: MessageSquare },
  { to: "/my-ebay/saved-sellers", label: "Saved Sellers", icon: Store },
];

export default function BuyingSidebar() {
  const location = useLocation();

  const isActive = (path: string) =>
    location.pathname === path || location.pathname.startsWith(path + "/");

  return (
    <aside className="w-56 shrink-0">
      <nav className="flex flex-col gap-0.5">
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
              isActive(to)
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <Icon className={cn("h-4 w-4 shrink-0", isActive(to) ? "text-primary" : "")} />
            {label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
