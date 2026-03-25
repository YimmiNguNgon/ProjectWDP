import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FaBolt, FaClock, FaChevronRight, FaStar } from "react-icons/fa6";
import api from "@/lib/axios";

interface SaleProduct {
  _id: string;
  title: string;
  image?: string;
  images?: string[];
  price: number;
  originalPrice?: number | null;
  discountPercent?: number | null;
  promotionType?: "normal" | "outlet" | "daily_deal";
  dealEndDate?: string | null;
  averageRating?: number;
  ratingCount?: number;
  quantity?: number;
  totalSold?: number;
  sellerId?: { sellerInfo?: { shopName?: string }; username?: string };
}

interface TimeLeft {
  d: number;
  h: number;
  m: number;
  s: number;
}

function calcTimeLeft(endDate: string): TimeLeft {
  const diff = new Date(endDate).getTime() - Date.now();
  if (diff <= 0) return { d: 0, h: 0, m: 0, s: 0 };
  return {
    d: Math.floor(diff / 86400000),
    h: Math.floor((diff % 86400000) / 3600000),
    m: Math.floor((diff % 3600000) / 60000),
    s: Math.floor((diff % 60000) / 1000),
  };
}

function fmt(n: number) {
  return String(n).padStart(2, "0");
}

/** Dark navy countdown block used inside each product card */
function CardCountdown({ endDate }: { endDate?: string | null }) {
  const [t, setT] = useState<TimeLeft>({ d: 0, h: 0, m: 0, s: 0 });

  useEffect(() => {
    if (!endDate) return;
    const tick = () => setT(calcTimeLeft(endDate));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [endDate]);

  const slots = [
    { label: "Day", val: t.d },
    { label: "Hour", val: t.h },
    { label: "Min", val: t.m },
    { label: "Sec", val: t.s },
  ];

  return (
    <div className="flex items-center justify-center gap-0.5 bg-slate-800 rounded-lg py-2 px-3 w-full">
      {slots.map((slot, i) => (
        <div key={slot.label} className="flex items-center gap-0.5">
          <div className="flex flex-col items-center min-w-[30px]">
            <span className="text-white font-mono text-xs font-bold">{fmt(slot.val)}</span>
            <span className="text-slate-400 text-[9px] leading-none mt-0.5">{slot.label}</span>
          </div>
          {i < 3 && <span className="text-slate-500 font-bold text-xs mb-2 mx-0.5">:</span>}
        </div>
      ))}
    </div>
  );
}

/** Orange countdown boxes used in the section header */
function HeaderCountdown({ endDate }: { endDate?: string | null }) {
  const [t, setT] = useState<TimeLeft>({ d: 0, h: 0, m: 0, s: 0 });

  useEffect(() => {
    if (!endDate) return;
    const tick = () => setT(calcTimeLeft(endDate));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [endDate]);

  const slots = [t.h, t.m, t.s];

  return (
    <div className="flex items-center gap-1">
      {slots.map((val, i) => (
        <div key={i} className="flex items-center gap-1">
          <div className="bg-amber-500 text-white font-mono font-bold text-sm rounded px-2.5 py-1.5 min-w-[36px] text-center">
            {fmt(val)}
          </div>
          {i < 2 && <span className="text-amber-600 font-bold">:</span>}
        </div>
      ))}
    </div>
  );
}

function StarRating({ rating = 0, count = 0 }: { rating?: number; count?: number }) {
  return (
    <div className="flex items-center gap-1">
      <div className="flex items-center gap-0.5">
        {[...Array(5)].map((_, i) => (
          <FaStar
            key={i}
            className={`w-2.5 h-2.5 ${i < Math.round(rating) ? "text-amber-400" : "text-muted-foreground/30"}`}
          />
        ))}
      </div>
      {count > 0 && <span className="text-xs text-muted-foreground">({count})</span>}
    </div>
  );
}

export function SaleTimeShowcase() {
  const [products, setProducts] = useState<SaleProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get("/api/products", {
        params: { saleOnly: true, limit: 5, page: 1, sort: "newest" },
      })
      .then((r) => setProducts(r.data?.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <section className="rounded-2xl bg-sky-50 p-6 space-y-5">
        <div className="flex items-center justify-between">
          <div className="w-48 h-8 bg-sky-200 rounded animate-pulse" />
          <div className="w-56 h-10 bg-sky-200 rounded animate-pulse" />
        </div>
        <div className="grid grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-72 bg-white rounded-xl animate-pulse" />
          ))}
        </div>
      </section>
    );
  }

  if (products.length === 0) return null;

  // Use earliest dealEndDate as the global countdown date
  const globalEndDate = products
    .map((p) => p.dealEndDate)
    .filter(Boolean)
    .sort()[0] ?? null;

  return (
    <section className="rounded-2xl bg-sky-50 p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <FaBolt className="w-5 h-5 text-amber-400" />
            <h2 className="text-2xl font-black text-slate-800 tracking-tight">SHOCKING DEAL</h2>
          </div>
          <p className="text-sm text-muted-foreground">The opportunity will quickly pass. Take it!</p>
        </div>

        <div className="flex items-center gap-4 bg-white rounded-2xl px-5 py-3 shadow-sm border border-sky-100">
          <div className="flex items-center gap-2">
            <FaClock className="w-4 h-4 text-amber-500" />
            <div>
              <p className="text-xs font-semibold text-slate-700">Hurry up!</p>
              <p className="text-[11px] text-muted-foreground">Offers end in:</p>
            </div>
          </div>
          <HeaderCountdown endDate={globalEndDate} />
        </div>
      </div>

      {/* Product cards */}
      <div className="grid grid-cols-5 gap-4">
        {products.map((product) => {
          const img = product.image || product.images?.[0];
          const sellerName =
            product.sellerId?.sellerInfo?.shopName ||
            product.sellerId?.username ||
            "Seller";

          const sold = product.totalSold ?? 0;
          const total = (product.quantity ?? 0) + sold;
          const soldPct = total > 0 ? Math.min(100, (sold / total) * 100) : 0;

          return (
            <Link
              key={product._id}
              to={`/products/${product._id}`}
              className="group bg-white rounded-xl border border-border/60 overflow-hidden hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex flex-col"
            >
              {/* Image area */}
              <div className="relative bg-white p-4">
                {product.discountPercent && product.discountPercent > 0 && (
                  <span className="absolute top-2 left-2 z-10 bg-amber-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                    -{product.discountPercent}%
                  </span>
                )}
                <img
                  src={img || "/placeholder.png"}
                  alt={product.title}
                  className="w-full aspect-square object-contain group-hover:scale-105 transition-transform duration-300"
                />
              </div>

              {/* Countdown */}
              <div className="px-3 pb-2">
                <CardCountdown endDate={product.dealEndDate} />
              </div>

              {/* Info */}
              <div className="px-3 pb-4 flex flex-col gap-1.5 flex-1">
                <p className="text-[11px] text-amber-500 font-semibold truncate">{sellerName}</p>
                <p className="text-xs font-semibold text-slate-800 line-clamp-2 leading-snug">
                  {product.title}
                </p>
                <StarRating rating={product.averageRating} count={product.ratingCount} />

                {/* Price */}
                <div className="flex items-baseline gap-2 mt-0.5">
                  <span className="text-base font-black text-slate-800">
                    {product.price.toLocaleString("vi-VN")}₫
                  </span>
                  {product.originalPrice && product.originalPrice > product.price && (
                    <span className="text-xs text-muted-foreground line-through">
                      {product.originalPrice.toLocaleString("vi-VN")}₫
                    </span>
                  )}
                </div>

                {/* Progress bar */}
                {total > 0 && (
                  <div className="mt-1">
                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-amber-400 rounded-full transition-all duration-500"
                        style={{ width: `${soldPct}%` }}
                      />
                    </div>
                    <div className="flex justify-between mt-0.5">
                      <span className="text-[10px] text-muted-foreground">
                        Available <span className="font-semibold text-slate-600">{product.quantity ?? 0}</span>
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        Sold <span className="font-semibold text-slate-600">{sold}</span>
                      </span>
                    </div>
                  </div>
                )}

                <p className="text-[10px] text-muted-foreground mt-auto pt-1">
                  • 2-day Delivery. Free shipping
                </p>
              </div>
            </Link>
          );
        })}
      </div>

      {/* View all */}
      <div className="flex justify-center pt-1">
        <Link
          to="/products?saleOnly=true"
          className="flex items-center gap-1 text-sm font-semibold text-primary hover:text-primary/80 transition-colors"
        >
          View all deals <FaChevronRight className="w-3 h-3" />
        </Link>
      </div>
    </section>
  );
}
