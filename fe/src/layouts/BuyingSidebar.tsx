import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

export default function BuyingSidebar() {
  const navigate = useNavigate();

  return (
    <aside className="w-56 text-sm flex-shrink-0">
      <nav className="space-y-1">
        <button
          className="w-full cursor-pointer text-lg rounded px-2 py-1 text-left hover:bg-muted"
          onClick={() => toast.info("Summary feature coming soon!")}
        >
          Summary
        </button>
        <button
          className="w-full cursor-pointer text-lg rounded px-2 py-1 text-left hover:bg-muted"
          onClick={() => toast.info("Recently viewed feature coming soon!")}
        >
          Recently viewed
        </button>
        <button
          className="w-full cursor-pointer text-lg rounded px-2 py-1 text-left hover:bg-muted"
          onClick={() => toast.info("Bids & offers feature coming soon!")}
        >
          Bids &amp; offers
        </button>
        <button className="w-full cursor-pointer text-lg rounded bg-muted px-2 py-1 text-left font-semibold">
          Purchases
        </button>
        <button
          className="w-full cursor-pointer text-lg rounded px-2 py-1 text-left hover:bg-muted"
          onClick={() => navigate("/complaints")}
        >
          Returns &amp; complaints
        </button>
        <button
          className="w-full cursor-pointer text-lg rounded px-2 py-1 text-left hover:bg-muted"
          onClick={() => toast.info("Watchlist feature coming soon!")}
        >
          Watchlist
        </button>
        <button
          className="w-full cursor-pointer text-lg rounded px-2 py-1 text-left hover:bg-muted"
          onClick={() => toast.info("Saved searches feature coming soon!")}
        >
          Saved searches
        </button>
        <button
          className="w-full cursor-pointer text-lg rounded px-2 py-1 text-left hover:bg-muted"
          onClick={() => toast.info("Saved sellers feature coming soon!")}
        >
          Saved sellers
        </button>
      </nav>
    </aside>
  );
}
