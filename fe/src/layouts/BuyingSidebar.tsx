import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";

export default function BuyingSidebar() {
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  // Helper to standard link classes
  const linkClass = (path: string) =>
    cn(
      "block w-full text-lg rounded px-3 py-2 text-left transition-colors",
      isActive(path)
        ? "bg-muted font-bold text-foreground"
        : "hover:bg-muted text-muted-foreground hover:text-foreground font-medium",
    );

  return (
    <aside className="w-64 shrink-0 text-base">
      <nav className="space-y-1">
        <Link to="/coming-soon" className={linkClass("/coming-soon/summary")}>
          Summary
        </Link>
        <Link
          to="/my-ebay/recently-viewed"
          className={linkClass("/my-ebay/recently-viewed")}
        >
          Recently viewed
        </Link>
        <Link
          to="/coming-soon"
          className={linkClass("/coming-soon/bids-offers")}
        >
          Bids &amp; offers
        </Link>
        <Link to="/my-ebay/complaints" className={linkClass("/my-ebay/complaints")}>
          Returns &amp; complaints
        </Link>
        <Link
          to="/my-ebay/activity/purchases"
          className={linkClass("/my-ebay/activity/purchases")}
        >
          Purchases
        </Link>
        <Link
          to="/my-ebay/activity/watchlist"
          className={linkClass("/my-ebay/activity/watchlist")}
        >
          Watchlist
        </Link>
        <Link
          to="/my-ebay/saved-searches"
          className={linkClass("/my-ebay/saved-searches")}
        >
          Saved searches
        </Link>
        <Link
          to="/my-ebay/feedback-requests"
          className={linkClass("/my-ebay/feedback-requests")}
        >
          Feedback requests
        </Link>
        <Link
          to="/my-ebay/saved-sellers"
          className={linkClass("/my-ebay/saved-sellers")}
        >
          Saved sellers
        </Link>
      </nav>
    </aside>
  );
}
