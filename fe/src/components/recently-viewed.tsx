import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { Clock, X, Trash2, ChevronRight } from "lucide-react";
import {
  getRecentlyViewed,
  removeRecentlyViewed,
  clearRecentlyViewed,
  type RecentlyViewedItem,
} from "@/api/recently-viewed";
import { useAuth } from "@/hooks/use-auth";

interface RecentlyViewedSectionProps {
  /** Maximum number of items to display (default: 10) */
  displayLimit?: number;
  /** Show a "clear all" button */
  showClearAll?: boolean;
  className?: string;
}

export function RecentlyViewedSection({
  displayLimit = 10,
  showClearAll = true,
  className = "",
}: RecentlyViewedSectionProps) {
  const { accessToken } = useAuth();
  const [items, setItems] = useState<RecentlyViewedItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!accessToken) { setLoading(false); return; }
    try {
      setLoading(true);
      const res = await getRecentlyViewed(20);
      setItems(res.data);
    } catch {
      // silently ignore (user not logged in, etc.)
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => { load(); }, [load]);

  const handleRemove = async (productId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await removeRecentlyViewed(productId);
      setItems((prev) => prev.filter((i) => i.product._id !== productId));
    } catch { /* ignore */ }
  };

  const handleClearAll = async () => {
    try {
      await clearRecentlyViewed();
      setItems([]);
    } catch { /* ignore */ }
  };

  // Not logged in or no history
  if (!accessToken || (!loading && items.length === 0)) return null;

  const displayed = items.slice(0, displayLimit);

  return (
    <section className={`w-full ${className}`}>
      {/* Section header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center">
            <Clock className="h-4 w-4 text-indigo-600" />
          </div>
          <h2 className="text-lg font-bold text-gray-900">Recently Viewed</h2>
        </div>
        <div className="flex items-center gap-3">
          {showClearAll && items.length > 0 && (
            <button
              onClick={handleClearAll}
              className="flex items-center gap-1 text-xs text-gray-400 hover:text-red-500 transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Clear all
            </button>
          )}
          {items.length > displayLimit && (
            <Link
              to="/products"
              className="flex items-center gap-0.5 text-xs font-medium text-indigo-600 hover:text-indigo-700"
            >
              See all <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          )}
        </div>
      </div>

      {/* Skeleton while loading */}
      {loading ? (
        <div className="flex gap-3 overflow-x-auto pb-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex-shrink-0 w-36 animate-pulse">
              <div className="w-36 h-36 rounded-xl bg-gray-200 mb-2" />
              <div className="h-3 bg-gray-200 rounded w-3/4 mb-1.5" />
              <div className="h-3 bg-gray-200 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-gray-200">
          {displayed.map((item) => {
            const p = item.product;
            const img =
              p.images?.[0] || p.image || "";
            const finalPrice = p.isOnSale && p.discountPercent
              ? p.price * (1 - p.discountPercent / 100)
              : p.price;

            return (
              <Link
                key={item._id}
                to={`/products/${p._id}`}
                className="group relative flex-shrink-0 w-36 flex flex-col gap-1.5 rounded-xl border border-gray-100 bg-white hover:shadow-md hover:border-indigo-200 transition-all duration-200 overflow-hidden"
              >
                {/* Remove button */}
                <button
                  onClick={(e) => handleRemove(p._id, e)}
                  className="absolute top-1.5 right-1.5 z-10 w-6 h-6 rounded-full bg-white/90 hover:bg-red-50 border border-gray-200 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                  title="Remove"
                >
                  <X className="h-3 w-3 text-gray-500 hover:text-red-500" />
                </button>

                {/* Sale badge */}
                {p.isOnSale && (
                  <div className="absolute top-1.5 left-1.5 z-10 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                    SALE
                  </div>
                )}

                {/* Image */}
                <div className="w-full h-36 bg-gray-50 overflow-hidden">
                  {img ? (
                    <img
                      src={img}
                      alt={p.title}
                      className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).style.display = "none";
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-100">
                      <svg className="h-10 w-10 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2zm6-8a2 2 0 100-4 2 2 0 000 4z" />
                      </svg>
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="px-2 pb-2 flex flex-col gap-0.5">
                  <p className="text-xs font-medium text-gray-800 line-clamp-2 leading-tight">
                    {p.title}
                  </p>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className={`text-sm font-bold ${p.isOnSale ? "text-red-600" : "text-gray-900"}`}>
                      ${finalPrice.toFixed(2)}
                    </span>
                    {p.isOnSale && p.originalPrice && (
                      <span className="text-[10px] text-gray-400 line-through">
                        ${p.originalPrice.toFixed(2)}
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-gray-400">
                    {new Date(item.viewedAt).toLocaleDateString()}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}
