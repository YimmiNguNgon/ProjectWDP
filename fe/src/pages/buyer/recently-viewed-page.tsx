import { useEffect, useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Clock, Trash2, X, ShoppingCart } from "lucide-react";
import {
  getRecentlyViewed,
  removeRecentlyViewed,
  clearRecentlyViewed,
  type RecentlyViewedItem,
} from "@/api/recently-viewed";
import { Button } from "@/components/ui/button";
import { useCart } from "@/contexts/cart-context";

export default function RecentlyViewedPage() {
  const [items, setItems] = useState<RecentlyViewedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { addToCart } = useCart();
  const navigate = useNavigate();

  /**
   * If the product has variants, the user must select them on the detail page.
   * Otherwise add directly to cart.
   */
  const handleAddToCart = (productId: string, hasVariants: boolean) => {
    if (hasVariants) {
      navigate(`/products/${productId}`);
    } else {
      addToCart(productId, 1, []);
    }
  };

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getRecentlyViewed(20);
      setItems(res.data);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleRemove = async (productId: string) => {
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

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-100 flex items-center justify-center">
            <Clock className="h-5 w-5 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Recently Viewed</h1>
            {!loading && (
              <p className="text-sm text-gray-500 mt-0.5">
                {items.length === 0
                  ? "No items yet"
                  : `${items.length} product${items.length !== 1 ? "s" : ""} viewed`}
              </p>
            )}
          </div>
        </div>
        {items.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            className="gap-2 text-red-500 border-red-200 hover:bg-red-50 hover:text-red-600"
            onClick={handleClearAll}
          >
            <Trash2 className="h-4 w-4" />
            Clear All
          </Button>
        )}
      </div>

      {/* Skeleton */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="animate-pulse rounded-xl border border-gray-100 bg-white overflow-hidden">
              <div className="w-full aspect-square bg-gray-200" />
              <div className="p-3 space-y-2">
                <div className="h-3 bg-gray-200 rounded w-3/4" />
                <div className="h-3 bg-gray-200 rounded w-1/2" />
                <div className="h-3 bg-gray-200 rounded w-1/3" />
              </div>
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        /* Empty state */
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-20 h-20 rounded-full bg-indigo-50 flex items-center justify-center mb-5">
            <Clock className="h-10 w-10 text-indigo-300" />
          </div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">
            No recently viewed products
          </h2>
          <p className="text-gray-400 text-sm mb-6 max-w-sm">
            Products you browse will appear here so you can easily find them again.
          </p>
          <Link to="/products">
            <Button className="gap-2">
              <ShoppingCart className="h-4 w-4" />
              Browse Products
            </Button>
          </Link>
        </div>
      ) : (
        /* Product grid */
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {items.map((item) => {
            const p = item.product;
            const img = p.images?.[0] || p.image || "";
            const finalPrice =
              p.isOnSale && p.discountPercent
                ? p.price * (1 - p.discountPercent / 100)
                : p.price;

            return (
              <div
                key={item._id}
                className="group relative flex flex-col rounded-xl border border-gray-100 bg-white hover:shadow-lg hover:border-indigo-200 transition-all duration-200 overflow-hidden"
              >
                {/* Remove button */}
                <button
                  onClick={() => handleRemove(p._id)}
                  className="absolute top-2 right-2 z-10 w-7 h-7 rounded-full bg-white/90 hover:bg-red-50 border border-gray-200 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm cursor-pointer"
                  title="Remove"
                >
                  <X className="h-3.5 w-3.5 text-gray-400 hover:text-red-500" />
                </button>

                {/* Sale badge */}
                {p.isOnSale && (
                  <div className="absolute top-2 left-2 z-10 bg-gradient-to-r from-red-500 to-rose-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                    SALE
                  </div>
                )}

                {/* Image */}
                <Link to={`/products/${p._id}`} className="block">
                  <div className="w-full aspect-square bg-gray-50 overflow-hidden">
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
                        <svg className="h-12 w-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2zm6-8a2 2 0 100-4 2 2 0 000 4z" />
                        </svg>
                      </div>
                    )}
                  </div>
                </Link>

                {/* Info */}
                <div className="flex flex-col gap-1.5 p-3 flex-1">
                  <Link to={`/products/${p._id}`}>
                    <p className="text-sm font-medium text-gray-800 line-clamp-2 leading-tight hover:text-indigo-600 transition-colors">
                      {p.title}
                    </p>
                  </Link>

                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-base font-bold ${p.isOnSale ? "text-red-600" : "text-gray-900"}`}>
                      ${finalPrice.toFixed(2)}
                    </span>
                    {p.isOnSale && p.originalPrice && (
                      <span className="text-xs text-gray-400 line-through">
                        ${p.originalPrice.toFixed(2)}
                      </span>
                    )}
                  </div>

                  <p className="text-[11px] text-gray-400">
                    Viewed{" "}
                    {new Date(item.viewedAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>

                  {/* Add to cart / select variants */}
                  <button
                    onClick={() => handleAddToCart(p._id, (p.variants?.length ?? 0) > 0)}
                    className="mt-auto w-full py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-gray-700 hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <ShoppingCart className="h-3.5 w-3.5" />
                    {(p.variants?.length ?? 0) > 0 ? "Select Options" : "Add to Cart"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
