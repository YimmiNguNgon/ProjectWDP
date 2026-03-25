import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "@/components/ui/carousel";
import { Button } from "@/components/ui/button";
import { CategoryShowcase } from "@/components/category-showcase";
import { SaleTimeShowcase } from "@/components/sale-time-showcase";
import { RecentlyViewedSection } from "@/components/recently-viewed";
import api from "@/lib/axios";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  FaTruck,
  FaHeadset,
  FaGift,
  FaArrowsRotate,
  FaShieldHalved,
  FaTrophy,
  FaStar,
  FaCartShopping,
  FaStore,
  FaCircleCheck,
  FaFire,
  FaRocket,
  FaLock,
  FaMedal,
} from "react-icons/fa6";
import type { IconType } from "react-icons";
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
  trustScore?: number | null;
}

const FEATURES = [
  { icon: FaTruck,        title: "Free Delivery",   subtitle: "From all orders over $10" },
  { icon: FaHeadset,      title: "Support 24/7",    subtitle: "Shop with an expert" },
  { icon: FaGift,         title: "Gift Voucher",    subtitle: "Refer a friend" },
  { icon: FaArrowsRotate, title: "Return & Refund", subtitle: "Free return over $200" },
  { icon: FaShieldHalved, title: "Secure Payment",  subtitle: "100% Protected" },
];

const RANK_COLORS = [
  { bar: "from-yellow-400 to-amber-300", badge: "bg-yellow-400 text-yellow-900", label: "#1" },
  { bar: "from-slate-300 to-slate-400",  badge: "bg-slate-300 text-slate-700",   label: "#2" },
  { bar: "from-amber-600 to-orange-500", badge: "bg-amber-600 text-white",       label: "#3" },
];

interface PromoBanner {
  bg: string;
  iconBg: string;
  iconColor: string;
  icon: IconType;
  badge: string;
  badgeColor: string;
  title: string;
  subtitle: string;
  bullets: string[];
  link: string;
  cta: string;
}

const PROMO_BANNERS: PromoBanner[] = [
  {
    bg: "bg-sky-50",
    iconBg: "bg-sky-500",
    iconColor: "text-white",
    icon: FaRocket,
    badge: "For Sellers",
    badgeColor: "text-sky-600",
    title: "Become a Seller\nEasily Today",
    subtitle: "Start your online store in minutes",
    bullets: [
      "Register & verify in under 5 minutes",
      "List unlimited products for free",
      "Access 10,000+ active buyers daily",
    ],
    link: "/become-seller",
    cta: "Start Selling Now",
  },
  {
    bg: "bg-violet-50",
    iconBg: "bg-violet-500",
    iconColor: "text-white",
    icon: FaLock,
    badge: "Our Platform",
    badgeColor: "text-violet-600",
    title: "Safe & Secure\nShopping",
    subtitle: "Every transaction is protected end-to-end",
    bullets: [
      "SSL-encrypted payments & data",
      "Escrow-based order protection",
      "24/7 fraud detection system",
    ],
    link: "/products",
    cta: "Shop with Confidence",
  },
  {
    bg: "bg-amber-50",
    iconBg: "bg-amber-400",
    iconColor: "text-white",
    icon: FaMedal,
    badge: "Trust System",
    badgeColor: "text-amber-600",
    title: "Verified Sellers\n& Real Reviews",
    subtitle: "Buy from trusted, badge-verified stores",
    bullets: [
      "Seller trust scores & tier badges",
      "Verified buyer reviews only",
      "Dispute resolution in 24 hrs",
    ],
    link: "/products",
    cta: "Explore Trusted Stores",
  },
];

export default function HomePage() {
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [topSellers, setTopSellers] = useState<TopSeller[]>([]);
  const [carouselApi, setCarouselApi] = useState<CarouselApi>();
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    api.get("/api/products/top-selling?limit=3").then((r) => setTopProducts(r.data.data || [])).catch(() => {});
    api.get("/api/products/top-sellers?limit=3").then((r) => setTopSellers(r.data.data || [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (!carouselApi) return;
    const onSelect = () => setCurrentSlide(carouselApi.selectedScrollSnap());
    carouselApi.on("select", onSelect);
    return () => { carouselApi.off("select", onSelect); };
  }, [carouselApi]);

  return (
    <div className="flex flex-col gap-10">

      {/* ── Hero Banner ── */}
      <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-sky-100 via-sky-50 to-blue-100 min-h-[420px]">
        <div className="absolute right-[28%] top-1/2 -translate-y-1/2 w-72 h-72 rounded-full bg-sky-200/50 pointer-events-none" />
        <div className="absolute right-[18%] top-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-blue-200/30 pointer-events-none" />

        <Carousel
          setApi={setCarouselApi}
          opts={{ loop: true }}
          plugins={[Autoplay({ delay: 4000, stopOnInteraction: false })]}
          className="w-full"
        >
          <CarouselContent>
            {topProducts.length > 0 ? (
              topProducts.map((product, index) => (
                <CarouselItem key={product._id}>
                  <div className="flex items-center min-h-[420px] px-12 py-10">
                    {/* Left: text */}
                    <div className="w-1/2 flex flex-col gap-5 z-10">
                      <span className="inline-flex w-fit items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-bold rounded-full shadow-md">
                        <FaFire className="w-3 h-3" />
                        #{index + 1} Top Product Selling
                      </span>
                      <h1 className="text-4xl font-black text-slate-800 leading-tight line-clamp-2">
                        {product.title}
                      </h1>
                      <ul className="flex flex-col gap-2 text-slate-600 text-sm">
                        {["Free Shipping. Secure Payment", "Contact us 24hrs a day", "Support gift service"].map((point) => (
                          <li key={point} className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-500 flex-shrink-0" />
                            {point}
                          </li>
                        ))}
                      </ul>
                      <div className="flex items-center gap-4 mt-1">
                        <Link to={`/products/${product._id}`}>
                          <Button className="bg-slate-800 hover:bg-slate-700 text-white px-8 rounded-lg h-11 cursor-pointer">
                            Shop now
                          </Button>
                        </Link>
                        <Link to="/products" className="text-slate-600 hover:text-slate-800 text-sm transition-colors">
                          Learn more
                        </Link>
                      </div>
                    </div>
                    {/* Right: image — rounded card, consistent size */}
                    <div className="w-1/2 flex items-center justify-center relative z-10">
                      <div className="w-72 h-72 rounded-2xl overflow-hidden bg-white/60 backdrop-blur-sm shadow-xl border border-white/80 flex items-center justify-center p-4">
                        <img
                          src={product.image || "/placeholder.png"}
                          alt={product.title}
                          className="w-full h-full object-contain drop-shadow-lg"
                        />
                      </div>
                    </div>
                  </div>
                </CarouselItem>
              ))
            ) : (
              <CarouselItem>
                <div className="flex items-center min-h-[420px] px-12 py-10">
                  <div className="w-1/2 flex flex-col gap-5">
                    <div className="w-40 h-7 bg-sky-200 rounded-full animate-pulse" />
                    <div className="flex flex-col gap-2">
                      <div className="w-3/4 h-10 bg-sky-200 rounded animate-pulse" />
                      <div className="w-2/3 h-10 bg-sky-200 rounded animate-pulse" />
                    </div>
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="w-48 h-4 bg-sky-200/70 rounded animate-pulse" />
                    ))}
                    <div className="flex gap-3">
                      <div className="w-28 h-11 bg-sky-200 rounded animate-pulse" />
                      <div className="w-20 h-11 bg-sky-100 rounded animate-pulse" />
                    </div>
                  </div>
                  <div className="w-1/2 flex items-center justify-center">
                    <div className="w-72 h-72 bg-sky-200 rounded-2xl animate-pulse" />
                  </div>
                </div>
              </CarouselItem>
            )}
          </CarouselContent>
        </Carousel>

        {topProducts.length > 1 && (
          <div className="absolute bottom-5 left-12 flex gap-2 z-10">
            {topProducts.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => carouselApi?.scrollTo(i)}
                className={`rounded-full transition-all duration-300 cursor-pointer ${
                  i === currentSlide
                    ? "w-6 h-2.5 bg-slate-700"
                    : "w-2.5 h-2.5 bg-slate-400/60 hover:bg-slate-500"
                }`}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Feature Strips ── */}
      <div className="grid grid-cols-5 gap-3">
        {FEATURES.map((f) => (
          <div
            key={f.title}
            className="flex items-center gap-3 p-4 border border-border/60 rounded-xl bg-card shadow-sm hover:shadow-md hover:border-primary/30 transition-all"
          >
            <div className="p-2.5 bg-primary/10 rounded-xl flex-shrink-0">
              <f.icon className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">{f.title}</p>
              <p className="text-xs text-muted-foreground">{f.subtitle}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Promo Banners ── */}
      <div className="grid grid-cols-3 gap-4">
        {PROMO_BANNERS.map((banner) => {
          const Icon = banner.icon;
          return (
            <Link
              key={banner.title}
              to={banner.link}
              className={`${banner.bg} rounded-2xl p-6 group shadow-sm hover:shadow-md transition-all duration-200 min-h-[200px] flex items-center gap-4 overflow-hidden relative`}
            >
              <div className="flex-1 flex flex-col gap-1.5 z-10">
                <p className={`text-[11px] font-bold uppercase tracking-widest ${banner.badgeColor}`}>{banner.badge}</p>
                <h3 className="text-lg font-bold text-slate-800 whitespace-pre-line leading-tight">{banner.title}</h3>
                <p className="text-xs text-slate-500">{banner.subtitle}</p>
                {banner.bullets.length > 0 && (
                  <ul className="text-[11px] text-slate-600 space-y-1 mt-1">
                    {banner.bullets.map((b) => (
                      <li key={b} className="flex items-start gap-1.5">
                        <FaCircleCheck className="w-2.5 h-2.5 text-green-500 flex-shrink-0 mt-0.5" />
                        {b}
                      </li>
                    ))}
                  </ul>
                )}
                <span className="text-xs font-bold text-primary mt-2 group-hover:underline tracking-wide">
                  {banner.cta} →
                </span>
              </div>
              {/* Icon */}
              <div className="flex-shrink-0 z-10">
                <div className={`w-20 h-20 rounded-2xl ${banner.iconBg} flex items-center justify-center shadow-md group-hover:scale-110 transition-transform duration-300`}>
                  <Icon className={`w-9 h-9 ${banner.iconColor}`} />
                </div>
              </div>
              <div className="absolute -right-6 -bottom-6 w-28 h-28 rounded-full bg-white/20 pointer-events-none" />
            </Link>
          );
        })}
      </div>

      {/* ── Shocking Deal ── */}
      <SaleTimeShowcase />

      {/* ── Top Sellers ── */}
      <div className="flex flex-col gap-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-xl">
            <FaTrophy className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Top Sellers</h2>
            <p className="text-muted-foreground text-sm">Trusted stores with excellent track records</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          {topSellers.slice(0, 3).map((seller, index) => {
            const rank = RANK_COLORS[index] ?? null;
            return (
              <Link
                key={seller._id}
                to={`/seller/${seller._id}`}
                className="group relative overflow-hidden rounded-2xl border border-border bg-card shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1 flex flex-col items-center pt-5 pb-5 px-5 text-center"
              >
                {/* Gradient top accent bar */}
                {rank && (
                  <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${rank.bar}`} />
                )}

                {/* Rank badge */}
                {rank && (
                  <div className={`absolute top-3 right-3 w-7 h-7 rounded-full flex items-center justify-center text-xs font-black shadow-sm ${rank.badge}`}>
                    {index + 1}
                  </div>
                )}

                {/* Hover bg */}
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

                {/* Avatar */}
                <div className="relative mb-3 z-10">
                  <div className="w-16 h-16 rounded-full overflow-hidden bg-muted ring-2 ring-border group-hover:ring-primary/50 transition-all duration-300">
                    {seller.avatarUrl ? (
                      <img
                        src={seller.avatarUrl}
                        alt={seller.username}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/40">
                        <FaStore className="w-6 h-6 text-primary" />
                      </div>
                    )}
                  </div>
                  {seller.sellerInfo?.isVerifiedSeller && (
                    <div className="absolute -bottom-0.5 -right-0.5 bg-blue-500 rounded-full p-0.5 ring-2 ring-white">
                      <FaCircleCheck className="w-3 h-3 text-white" />
                    </div>
                  )}
                </div>

                {/* Name */}
                <h3 className="font-bold text-sm text-foreground group-hover:text-primary transition-colors line-clamp-1 w-full z-10">
                  {seller.sellerInfo?.shopName || seller.username}
                </h3>
                <p className="text-xs text-muted-foreground z-10">@{seller.username}</p>

                {/* Stats */}
                <div className="flex items-center justify-center gap-4 mt-3 pt-3 border-t border-border/40 w-full z-10">
                  {seller.trustScore != null && (
                    <div className="flex items-center gap-1">
                      <FaStar className="w-3 h-3 text-yellow-400" />
                      <span className="text-xs font-semibold">{seller.trustScore.toFixed(1)}</span>
                    </div>
                  )}
                  {seller.sellerInfo?.successOrders != null && (
                    <div className="flex items-center gap-1">
                      <FaCartShopping className="w-3 h-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">{seller.sellerInfo.successOrders} orders</span>
                    </div>
                  )}
                </div>

                {/* CTA */}
                <div className="mt-3 w-full z-10">
                  <div className="text-xs font-semibold text-primary border border-primary/30 rounded-lg py-1.5 group-hover:bg-primary group-hover:text-white group-hover:border-primary transition-all duration-200">
                    Visit Store
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* ── Recently Viewed ── */}
      <RecentlyViewedSection displayLimit={10} showClearAll />

      {/* ── Category ── */}
      <CategoryShowcase title="Shop by Category" />
    </div>
  );
}
