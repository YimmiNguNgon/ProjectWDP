import { Button } from "@/components/ui/button";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { CategoryShowcase } from "@/components/category-showcase";
import { SaleTimeShowcase } from "@/components/sale-time-showcase";
import { ThreeDMarqueeSection } from "@/components/three-d-marquee-section";
import { RecentlyViewedSection } from "@/components/recently-viewed";
import api from "@/lib/axios";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Star, ShoppingCart, TrendingUp, Award, BadgeCheck, Store } from "lucide-react";
import Autoplay from "embla-carousel-autoplay";

interface TopProduct {
  _id: string;
  title: string;
  image: string;
  price: number;
  averageRating: number;
  ratingCount: number;
  totalSold: number;
  sellerId?: { sellerInfo?: { shopName?: string }; username?: string };
}

interface TopSeller {
  _id: string;
  username: string;
  avatarUrl?: string;
  sellerInfo?: {
    shopName?: string;
    successOrders?: number;
    avgRating?: number;
    isVerifiedSeller?: boolean;
  };
}

function formatPrice(price: number) {
  return price.toLocaleString("vi-VN") + "₫";
}

export default function HomePage() {
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [topSellers, setTopSellers] = useState<TopSeller[]>([]);

  useEffect(() => {
    api.get("/api/products/top-selling?limit=3").then((r) => setTopProducts(r.data.data || [])).catch(() => {});
    api.get("/api/products/top-sellers?limit=6").then((r) => setTopSellers(r.data.data || [])).catch(() => {});
  }, []);

  return (
    <div className="flex flex-col gap-12">
      {/* Banner + 3D Marquee side by side */}
      <div className="flex gap-4 items-stretch">
        {/* Top Selling Products Carousel - nửa trái */}
        <div className="w-1/2 relative rounded-2xl overflow-hidden">
          {topProducts.length > 0 ? (
            <Carousel
              className="h-full"
              plugins={[Autoplay({ delay: 3000, stopOnInteraction: false })]}
            >
              <CarouselContent className="h-full">
                {topProducts.map((product, index) => (
                  <CarouselItem key={product._id} className="h-full">
                    <Link to={`/products/${product._id}`} className="block h-full">
                      <div className="relative h-full min-h-[320px] bg-gradient-to-br from-slate-900 to-slate-700 overflow-hidden group">
                        {/* Background image with overlay */}
                        <img
                          src={product.image || "/placeholder.png"}
                          alt={product.title}
                          className="absolute inset-0 w-full h-full object-cover opacity-40 group-hover:opacity-50 transition-opacity duration-500 scale-105 group-hover:scale-110 transition-transform duration-700"
                        />
                        {/* Gradient overlay */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

                        {/* Rank badge + cart button top row */}
                        <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
                          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold shadow-lg ${
                            index === 0 ? "bg-yellow-400 text-yellow-900" :
                            index === 1 ? "bg-slate-300 text-slate-800" :
                            "bg-amber-600 text-amber-100"
                          }`}>
                            <TrendingUp className="w-3 h-3" />
                            #{index + 1} Best Seller
                          </div>
                          <div className="bg-white/20 backdrop-blur-sm rounded-full p-3 group-hover:bg-white/40 transition-colors">
                            <ShoppingCart className="w-5 h-5 text-white" />
                          </div>
                        </div>

                        {/* Content */}
                        <div className="absolute bottom-0 left-0 right-0 p-6">
                          <p className="text-white/70 text-xs mb-1">
                            {product.sellerId?.sellerInfo?.shopName || product.sellerId?.username || ""}
                          </p>
                          <h2 className="text-white text-xl font-bold line-clamp-2 mb-3 leading-tight">
                            {product.title}
                          </h2>
                          <div className="flex flex-col gap-1">
                            <span className="text-white text-2xl font-black">
                              {formatPrice(product.price)}
                            </span>
                            <div className="flex items-center gap-2">
                              <div className="flex items-center gap-0.5">
                                {[...Array(5)].map((_, i) => (
                                  <Star key={i} className={`w-3 h-3 ${i < Math.round(product.averageRating) ? "fill-yellow-400 text-yellow-400" : "text-white/30"}`} />
                                ))}
                              </div>
                              <span className="text-white/60 text-xs">({product.ratingCount})</span>
                              <span className="text-emerald-400 text-xs font-medium">• {product.totalSold} sold</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </Link>
                  </CarouselItem>
                ))}
              </CarouselContent>
              <div className="absolute right-4 bottom-4 flex gap-2 z-10">
                <CarouselPrevious size={"icon-lg"} className="static translate-0 cursor-pointer bg-white/20 border-white/30 text-white hover:bg-white/40" />
                <CarouselNext size={"icon-lg"} className="static translate-0 cursor-pointer bg-white/20 border-white/30 text-white hover:bg-white/40" />
              </div>
              {/* Dots indicator */}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
                {topProducts.map((_, i) => (
                  <div key={i} className="w-1.5 h-1.5 rounded-full bg-white/50" />
                ))}
              </div>
            </Carousel>
          ) : (
            <div className="h-full min-h-[320px] bg-gradient-to-br from-slate-800 to-slate-600 flex items-center justify-center">
              <p className="text-white/50 text-sm">Loading top products...</p>
            </div>
          )}
        </div>

        {/* 3D Marquee - nửa phải */}
        <div className="w-1/2 rounded-2xl overflow-hidden">
          <ThreeDMarqueeSection />
        </div>
      </div>

      {/* Top Sellers Section */}
      <div className="flex flex-col gap-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-xl">
            <Award className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Top Sellers</h2>
            <p className="text-muted-foreground text-sm">Trusted stores with excellent track records</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          {topSellers.map((seller, index) => (
            <Link
              key={seller._id}
              to={`/seller/${seller._id}`}
              className="group relative overflow-hidden rounded-2xl border border-border bg-card p-6 hover:shadow-lg hover:border-primary/30 transition-all duration-300 hover:-translate-y-1"
            >
              {/* Rank ribbon for top 3 */}
              {index < 3 && (
                <div className={`absolute top-0 right-0 px-3 py-1 text-xs font-bold rounded-bl-xl ${
                  index === 0 ? "bg-yellow-400 text-yellow-900" :
                  index === 1 ? "bg-slate-300 text-slate-700" :
                  "bg-amber-600 text-white"
                }`}>
                  #{index + 1}
                </div>
              )}

              {/* Background decoration */}
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

              <div className="relative flex items-start gap-4">
                {/* Avatar */}
                <div className="relative flex-shrink-0">
                  <div className="w-14 h-14 rounded-full overflow-hidden bg-muted ring-2 ring-border group-hover:ring-primary/40 transition-all duration-300">
                    {seller.avatarUrl ? (
                      <img src={seller.avatarUrl} alt={seller.username} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/40">
                        <Store className="w-6 h-6 text-primary" />
                      </div>
                    )}
                  </div>
                  {seller.sellerInfo?.isVerifiedSeller && (
                    <div className="absolute -bottom-1 -right-1 bg-blue-500 rounded-full p-0.5">
                      <BadgeCheck className="w-3.5 h-3.5 text-white" />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm truncate group-hover:text-primary transition-colors">
                    {seller.sellerInfo?.shopName || seller.username}
                  </h3>
                  <p className="text-muted-foreground text-xs truncate">@{seller.username}</p>

                  <div className="flex items-center gap-3 mt-2">
                    {seller.sellerInfo?.avgRating != null && (
                      <div className="flex items-center gap-1">
                        <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                        <span className="text-xs font-medium">{seller.sellerInfo.avgRating.toFixed(1)}</span>
                      </div>
                    )}
                    {seller.sellerInfo?.successOrders != null && (
                      <div className="flex items-center gap-1">
                        <ShoppingCart className="w-3 h-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">{seller.sellerInfo.successOrders} orders</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Visit button */}
              <div className="relative mt-4">
                <div className="text-xs text-center text-primary font-medium opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-1 group-hover:translate-y-0">
                  Visit Store →
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      <SaleTimeShowcase />

      <RecentlyViewedSection displayLimit={10} showClearAll />

      <CategoryShowcase title="Category" />
    </div>
  );
}
