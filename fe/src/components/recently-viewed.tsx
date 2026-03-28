import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { FaClockRotateLeft, FaXmark, FaTrash } from "react-icons/fa6";
import {
  getRecentlyViewed,
  removeRecentlyViewed,
  clearRecentlyViewed,
  type RecentlyViewedItem,
} from "@/api/recently-viewed";
import { useAuth } from "@/hooks/use-auth";

interface RecentlyViewedSectionProps {
  displayLimit?: number;
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
    if (!accessToken) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const res = await getRecentlyViewed(20);
      setItems(res.data);
    } catch {
      // silently ignore
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    load();
  }, [load]);

  const handleRemove = async (productId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await removeRecentlyViewed(productId);
      setItems((prev) => prev.filter((i) => i.product._id !== productId));
    } catch {
      /* ignore */
    }
  };

  const handleClearAll = async () => {
    try {
      await clearRecentlyViewed();
      setItems([]);
    } catch {
      /* ignore */
    }
  };

  if (!accessToken || (!loading && items.length === 0)) return null;

  const displayed = items.slice(0, displayLimit);

  return (
    <section className={`rounded-2xl bg-violet-50 p-6 space-y-5 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <FaClockRotateLeft className="w-5 h-5 text-violet-500" />
            <h2 className="text-2xl font-black text-slate-800 tracking-tight">
              Recently Viewed
            </h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Products you recently looked at
          </p>
        </div>
        {showClearAll && items.length > 0 && (
          <button
            onClick={handleClearAll}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-red-500 transition-colors px-3 py-2 rounded-xl hover:bg-red-50 border border-transparent hover:border-red-100"
          >
            <FaTrash className="h-3 w-3" />
            Clear all
          </button>
        )}
      </div>

      {/* Skeleton */}
      {loading ? (
        <div className="grid grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl animate-pulse h-64" />
          ))}
        </div>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-2">
          {displayed.map((item) => {
            const p = item.product;
            const img = p.images?.[0] || p.image || "";
            const applyDiscount = (v: number) =>
              p.isOnSale && p.discountPercent
                ? v * (1 - p.discountPercent / 100)
                : v;
            const variantPrices =
              p.variantCombinations
                ?.map((c) => c.price)
                .filter((v): v is number => v !== undefined) ?? [];
            const finalPrice = applyDiscount(
              variantPrices.length > 0 ? Math.min(...variantPrices) : p.price,
            );
            const maxVariantPrice =
              variantPrices.length > 0
                ? applyDiscount(Math.max(...variantPrices))
                : finalPrice;
            const isPriceRange =
              variantPrices.length > 0 && finalPrice !== maxVariantPrice;

            return (
              <Link
                key={item._id}
                to={`/products/${p._id}`}
                className="group relative flex-shrink-0 w-48 flex flex-col bg-white rounded-xl border border-border/60 shadow-sm hover:shadow-md hover:border-violet-200 hover:-translate-y-0.5 transition-all duration-200 overflow-hidden"
              >
                {/* Remove button */}
                <button
                  onClick={(e) => handleRemove(p._id, e)}
                  className="absolute top-2 right-2 z-10 w-6 h-6 rounded-full bg-white/90 hover:bg-red-50 border border-border flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                  title="Remove"
                >
                  <FaXmark className="h-2.5 w-2.5 text-muted-foreground" />
                </button>

                {/* Sale badge */}
                {p.isOnSale && (
                  <div className="absolute top-2 left-2 z-10 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                    SALE
                  </div>
                )}

                {/* Image */}
                <div className="w-full aspect-square bg-gray-50 overflow-hidden">
                  {img ? (
                    <img
                      src={img}
                      alt={p.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).style.display =
                          "none";
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-muted">
                      <svg
                        className="h-10 w-10 text-muted-foreground/30"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2zm6-8a2 2 0 100-4 2 2 0 000 4z"
                        />
                      </svg>
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="px-3 py-3 flex flex-col gap-1.5 flex-1">
                  <p className="text-xs font-semibold text-slate-800 line-clamp-2 leading-snug">
                    {p.title}
                  </p>
                  <div className="flex items-baseline gap-1.5 flex-wrap mt-auto pt-1">
                    <span
                      className={`text-sm font-black ${p.isOnSale ? "text-red-600" : "text-slate-800"}`}
                    >
                      {isPriceRange
                        ? `$${Math.round(finalPrice).toLocaleString("vi-VN")} – ${Math.round(maxVariantPrice).toLocaleString("vi-VN")}₫`
                        : `$${Math.round(finalPrice).toLocaleString("vi-VN")}`}
                    </span>
                    {p.isOnSale && p.originalPrice && !isPriceRange && (
                      <span className="text-[10px] text-muted-foreground line-through">
                        ${Math.round(p.originalPrice).toLocaleString("vi-VN")}
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    {new Date(item.viewedAt).toLocaleDateString("vi-VN")}
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
