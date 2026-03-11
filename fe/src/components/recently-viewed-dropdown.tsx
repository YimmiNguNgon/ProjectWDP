import { useState } from "react";
import { Link } from "react-router-dom";
import { Clock, ArrowRight, Trash2, X } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  getRecentlyViewed,
  removeRecentlyViewed,
  clearRecentlyViewed,
  type RecentlyViewedItem,
} from "@/api/recently-viewed";
import { useAuth } from "@/hooks/use-auth";

export function RecentlyViewedDropdown() {
  const { accessToken } = useAuth();
  const [items, setItems] = useState<RecentlyViewedItem[]>([]);
  const [loading, setLoading] = useState(false);

  const handleOpenChange = (open: boolean) => {
    if (!open || !accessToken) return;
    setLoading(true);
    getRecentlyViewed(8)
      .then((res) => setItems(res.data))
      .catch(() => { })
      .finally(() => setLoading(false));
  };

  const handleRemove = async (productId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await removeRecentlyViewed(productId);
      setItems((prev) => prev.filter((i) => i.product._id !== productId));
    } catch { /* ignore */ }
  };

  const handleClearAll = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await clearRecentlyViewed();
      setItems([]);
    } catch { /* ignore */ }
  };

  if (!accessToken) return null;

  return (
    <DropdownMenu onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger className="font-medium text-sm hover:underline cursor-pointer outline-none flex items-center gap-1">

        Recently Viewed
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-80 p-0" sideOffset={8}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-indigo-500" />
            <span className="font-semibold text-sm">Recently Viewed</span>
            {items.length > 0 && (
              <span className="text-xs text-gray-400">({items.length})</span>
            )}
          </div>
          {items.length > 0 && (
            <button
              onClick={handleClearAll}
              className="flex items-center gap-1 text-xs text-gray-400 hover:text-red-500 transition-colors cursor-pointer"
            >
              <Trash2 className="h-3 w-3" />
              Clear all
            </button>
          )}
        </div>

        <Separator />

        {/* Content */}
        <div className="max-h-[360px] overflow-y-auto">
          {loading ? (
            <div className="p-3 space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex gap-3 items-center">
                  <Skeleton className="h-12 w-12 rounded-lg shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="py-10 text-center">
              <Clock className="h-8 w-8 text-gray-200 mx-auto mb-2" />
              <p className="text-sm text-gray-400">No recently viewed products</p>
              <p className="text-xs text-gray-300 mt-1">
                Browse products to see your history here
              </p>
            </div>
          ) : (
            <div className="py-1">
              {items.map((item) => {
                const p = item.product;
                const img = p.images?.[0] || p.image || "";
                const finalPrice =
                  p.isOnSale && p.discountPercent
                    ? p.price * (1 - p.discountPercent / 100)
                    : p.price;

                return (
                  <Link
                    key={item._id}
                    to={`/products/${p._id}`}
                    className="group flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 transition-colors relative"
                  >
                    {/* Thumbnail */}
                    <div className="h-12 w-12 shrink-0 rounded-lg overflow-hidden border border-gray-100 bg-gray-50">
                      {img ? (
                        <img
                          src={img}
                          alt={p.title}
                          className="h-full w-full object-contain group-hover:scale-105 transition-transform"
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).style.display = "none";
                          }}
                        />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center bg-gray-100">
                          <span className="text-gray-300 text-xs">No img</span>
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 line-clamp-1 leading-tight">
                        {p.title}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span
                          className={`text-sm font-bold ${p.isOnSale ? "text-red-600" : "text-gray-900"}`}
                        >
                          ${finalPrice.toFixed(2)}
                        </span>
                        {p.isOnSale && p.originalPrice && (
                          <span className="text-xs text-gray-400 line-through">
                            ${p.originalPrice.toFixed(2)}
                          </span>
                        )}
                        {p.isOnSale && (
                          <span className="text-[10px] bg-red-100 text-red-600 font-bold px-1 py-0.5 rounded">
                            SALE
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-gray-400 mt-0.5">
                        {new Date(item.viewedAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>

                    {/* Remove button */}
                    <button
                      onClick={(e) => handleRemove(p._id, e)}
                      className="shrink-0 p-1 rounded-full hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                      title="Remove"
                    >
                      <X className="h-3.5 w-3.5 text-gray-400 hover:text-red-500" />
                    </button>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <>
            <Separator />
            <div className="px-4 py-2.5">
              <Link
                to="/products"
                className="flex items-center justify-center gap-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-700 transition-colors"
              >
                Browse more products
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
