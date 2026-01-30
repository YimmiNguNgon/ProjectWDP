import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getUserWatchlist, type WatchlistItem } from "@/api/watchlist";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowRight } from "lucide-react";

export function WatchlistPreview() {
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [loading, setLoading] = useState(false);

  const handleOpenChange = (open: boolean) => {
    if (open) {
      setLoading(true);
      getUserWatchlist()
        .then((res) => {
          setItems(res.data.data || []);
        })
        .catch((err) => console.error(err))
        .finally(() => setLoading(false));
    }
  };

  return (
    <DropdownMenu onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger className="font-medium text-sm hover:underline cursor-pointer outline-none">
        Watchlist
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel>
          <Link
            to="/my-ebay/activity/watchlist"
            className="text-black text-lg hover:underline w-full inline-flex items-center gap-1"
          >
            View all items you are watching
            <ArrowRight className="text-black w-5 h-5" />
          </Link>
        </DropdownMenuLabel>

        {loading ? (
          <div className="p-2 space-y-2">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : items.length === 0 ? (
          <div className="p-4 text-center text-sm text-muted-foreground">
            Your watchlist is empty
          </div>
        ) : (
          <div className="space-y-1">
            {items.slice(0, 2).map((item) => (
              <DropdownMenuItem
                key={item._id}
                asChild
                className="cursor-pointer"
              >
                <Link
                  to={`/products/${item.product._id}`}
                  className="flex gap-3 py-2"
                >
                  <div className="h-10 w-10 shrink-0 overflow-hidden rounded bg-muted">
                    <img
                      src={
                        item.product.images?.[0] ||
                        item.product.image ||
                        "/placeholder.png"
                      }
                      alt={item.product.title}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="flex flex-col overflow-hidden">
                    <span className="truncate text-sm font-medium">
                      {item.product.title}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      US ${item.product.price.toFixed(2)}
                    </span>
                  </div>
                </Link>
              </DropdownMenuItem>
            ))}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
