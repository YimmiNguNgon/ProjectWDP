import { useEffect, useMemo, useState } from "react";
import api from "@/lib/axios";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Star, CheckCircle, Zap, ShieldAlert, Clock } from "lucide-react";

type SellerFeedbackSectionProps = {
  sellerId: string;
  sellerName?: string;
  productId?: string; // Ä‘á»ƒ dÃ¹ng tab "This item"
};

type SellerReviewApi = {
  _id: string;
  order: string;
  product: {
    _id: string;
    title: string;
  };
  reviewer: {
    _id: string;
    username: string;
  };
  seller: string;
  rating: number;
  comment: string;
  type?: "positive" | "neutral" | "negative";
  createdAt: string;
  verifiedPurchase?: boolean;

  rating1?: number;
  rating2?: number;
  rating3?: number;
  rating4?: number;
};

type SellerReviewsResponse = {
  data: SellerReviewApi[];
  page: number;
  limit: number;
  total: number;

  averageRate: number; // overall
  averageRate1?: number; // Accurate description
  averageRate2?: number; // Reasonable shipping cost
  averageRate3?: number; // Shipping speed
  averageRate4?: number; // Communication

  positiveRate: number;
  positiveCount: number;
};

type TabType = "thisItem" | "allItems";
type RatingFilter = "all" | "positive" | "neutral" | "negative";

// Tá»± suy ra type náº¿u review cÅ© chÆ°a cÃ³ field type
function getComputedType(
  review: SellerReviewApi
): "positive" | "neutral" | "negative" {
  if (review.type) return review.type;
  if (review.rating >= 4) return "positive";
  if (review.rating === 3) return "neutral";
  return "negative";
}

export function SellerFeedbackSection({
  sellerId,
  sellerName,
  productId,
}: SellerFeedbackSectionProps) {
  const [allData, setAllData] = useState<SellerReviewsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<TabType>(
    productId ? "thisItem" : "allItems"
  );
  const [ratingFilter, setRatingFilter] = useState<RatingFilter>("all");

  const displayName =
    sellerName || (sellerId ? `Seller #${sellerId.slice(-5)}` : "Seller");

  // ===== LOAD DATA =====
  useEffect(() => {
    if (!sellerId) return;

    const fetchData = async () => {
      try {
        setLoading(true);
        setErrorMsg(null);

        const res = await api.get<SellerReviewsResponse>(
          `/api/reviews/seller/${sellerId}`,
          { params: { page: 1, limit: 50 } }
        );
        setAllData(res.data);
      } catch (err) {
        console.error(err);
        setErrorMsg("Unable to load seller feedback.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [sellerId]);

  // ===== TÃNH TOÃN Tá»ª DATA =====
  const allReviews = allData?.data ?? [];

  const thisItemReviews = useMemo(() => {
    if (!productId) return [];
    return allReviews.filter((r) => r.product._id === productId);
  }, [allReviews, productId]);

  const totalAllItems = allData?.total ?? 0;
  const totalThisItem = thisItemReviews.length;

  const baseReviews =
    activeTab === "thisItem" && productId ? thisItemReviews : allReviews;

  // filter theo ratingFilter, dÃ¹ng computedType nÃªn filter luÃ´n Ä‘Ãºng
  const reviews: SellerReviewApi[] = useMemo(() => {
    if (ratingFilter === "all") return baseReviews;

    return baseReviews.filter((r) => {
      const t = getComputedType(r);
      if (ratingFilter === "positive") return t === "positive";
      if (ratingFilter === "neutral") return t === "neutral";
      if (ratingFilter === "negative") return t === "negative";
      return true;
    });
  }, [baseReviews, ratingFilter]);

  const positivePercent = allData?.positiveRate ?? 0;
  const positiveCount = allData?.positiveCount ?? 0;

  const avg1 = allData?.averageRate1 ?? null;
  const avg2 = allData?.averageRate2 ?? null;
  const avg3 = allData?.averageRate3 ?? null;
  const avg4 = allData?.averageRate4 ?? allData?.averageRate ?? null;

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      timeZone: "Asia/Ho_Chi_Minh",
    });

  const calcRelativeTime = (iso: string): string => {
    const created = new Date(iso).getTime();
    const now = Date.now();
    const diffDays = (now - created) / (1000 * 60 * 60 * 24);
    if (diffDays <= 180) return "Past 6 months";
    if (diffDays <= 365) return "Past year";
    return "More than a year ago";
  };

  // ===== UI =====
  return (
    <section className="mt-10 w-full">
      <div className="grid grid-cols-1 lg:grid-cols-10 rounded-sm border border-neutral-200 bg-white">
        {/* ========== LEFT: ABOUT THIS SELLER (3/10) ========== */}
        <div className="col-span-3 border-b border-neutral-200 px-6 py-6 lg:border-b-0 lg:border-r">
          <div>
            <h2 className="mb-4 text-xl font-semibold">About this seller</h2>

            <div className="flex items-center gap-3">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted text-base font-semibold">
                {displayName.charAt(0).toUpperCase()}
              </div>

              <div className="space-y-1">
                <div className="font-semibold">{displayName}</div>
                {totalAllItems > 0 && (
                  <p className="text-sm text-muted-foreground">
                    {positivePercent.toFixed(0)}% positive feedback ·{" "}
                    {totalAllItems} feedbacks
                  </p>
                )}
              </div>
            </div>
          </div>

          {positiveCount > 0 && (
            <div className="mt-2 text-xs text-muted-foreground">
              {positiveCount} positive ratings out of {totalAllItems}
            </div>
          )}

          {/* Action buttons */}
          <div className="mt-4 flex flex-col gap-2">
            <Button className="rounded-full">Visit store</Button>
          </div>

          {/* ========== DETAILED SELLER RATINGS ========== */}
          <div className="mt-8 border-t border-neutral-200 pt-4">
            <h3 className="mb-3 text-sm font-semibold">
              Detailed seller ratings
            </h3>

            {totalAllItems === 0 ? (
              <p className="text-xs text-muted-foreground">
                Not enough ratings yet.
              </p>
            ) : (
              <div className="space-y-2">
                <DetailRatingRow label="Accurate description" value={avg1} />
                <DetailRatingRow
                  label="Reasonable shipping cost"
                  value={avg2}
                />
                <DetailRatingRow label="Shipping speed" value={avg3} />
                <DetailRatingRow label="Communication" value={avg4} />
              </div>
            )}

            {totalAllItems > 0 && (
              <p className="mt-3 text-[11px] text-muted-foreground">
                Average for the last 12 months
              </p>
            )}
          </div>

          {/* ========== TRUST SCORE BADGE ========== */}
          <TrustScoreBadge sellerId={sellerId} />

        </div>

        {/* ========== RIGHT: SELLER FEEDBACK (7/10) ========== */}
        <div className="col-span-7 px-6 py-6">
          {/* header + tabs + filter */}
          <div className="space-y-3 border-b border-neutral-200 pb-3">
            <div className="flex items-baseline justify-between gap-4">
              <h2 className="text-base font-semibold">
                Seller feedback ({totalAllItems})
              </h2>
            </div>

            {/* Tabs This item / All items */}
            <div className="flex items-center gap-4 text-xs">
              <button
                type="button"
                disabled={!productId}
                onClick={() => productId && setActiveTab("thisItem")}
                className={
                  "pb-1 " +
                  (activeTab === "thisItem"
                    ? "border-b-2 border-black font-semibold"
                    : "text-muted-foreground")
                }
              >
                This item ({totalThisItem})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("allItems")}
                className={
                  "pb-1 " +
                  (activeTab === "allItems"
                    ? "border-b-2 border-black font-semibold"
                    : "text-muted-foreground")
                }
              >
                All items ({totalAllItems})
              </button>
            </div>

            {/* Filter + tags */}
            <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Filter:</span>
                <select
                  className="rounded-full border px-3 py-1 text-xs"
                  value={ratingFilter}
                  onChange={(e) =>
                    setRatingFilter(e.target.value as RatingFilter)
                  }
                >
                  <option value="all">All ratings</option>
                  <option value="positive">Positive</option>
                  <option value="neutral">Neutral</option>
                  <option value="negative">Negative</option>
                </select>
              </div>

              <div className="flex flex-wrap gap-3 text-[11px] text-muted-foreground">
                <button className="hover:underline">Condition</button>
                <button className="hover:underline">Usage</button>
                <button className="hover:underline">Quality</button>
                <button className="hover:underline">Satisfaction</button>
                <button className="hover:underline">Value</button>
                <button className="hover:underline">Appearance</button>
                <button className="hover:underline">Extras</button>
                <button className="hover:underline">Fit</button>
                <button className="hover:underline">Dimensions</button>
              </div>
            </div>
          </div>

          {/* list feedback */}
          <ScrollArea className="h-[420px] pb-4 pt-4">
            {loading ? (
              <p className="text-sm text-muted-foreground">
                Loading seller feedback...
              </p>
            ) : errorMsg ? (
              <p className="text-sm text-red-500">{errorMsg}</p>
            ) : reviews.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No feedback yet for this seller.
              </p>
            ) : (
              <div className="space-y-5">
                {reviews.map((fb) => {
                  const computedType = getComputedType(fb);

                  return (
                    <div
                      key={fb._id}
                      className="border-b border-neutral-200 pb-4 last:border-b-0 text-sm"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex gap-3">
                          {/* ICON THEO TYPE */}
                          <TypeBadge type={computedType} rating={fb.rating} />

                          <div>
                            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                              <span className="font-medium text-black">
                                {fb.reviewer.username}
                              </span>
                              <span>·</span>
                              <span>{calcRelativeTime(fb.createdAt)}</span>
                              <span>·</span>
                              <span>
                                {computedType.charAt(0).toUpperCase() +
                                  computedType.slice(1)}
                              </span>
                            </div>

                            <p className="mt-1 leading-snug">{fb.comment}</p>

                            <p className="mt-1 text-[11px] text-muted-foreground">
                              {fb.product.title}
                            </p>

                            <p className="mt-1 text-[11px] text-muted-foreground">
                              {formatDate(fb.createdAt)}
                            </p>
                          </div>
                        </div>

                        <div className="whitespace-nowrap text-[11px] text-muted-foreground">
                          {fb.verifiedPurchase && "Verified purchase"}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>

          {totalAllItems > 0 && (
            <div className="pt-2">
              <button className="rounded-full border border-blue-600 px-4 py-2 text-xs text-blue-600 hover:bg-muted">
                See all feedback
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

// ====== ROW TRONG "DETAILED SELLER RATINGS" ======
type DetailRatingRowProps = {
  label: string;
  value: number | null | undefined;
};

function DetailRatingRow({ label, value }: DetailRatingRowProps) {
  const hasValue = typeof value === "number" && !Number.isNaN(value);

  return (
    <div className="flex items-center justify-between gap-3 text-xs">
      <span>{label}</span>
      <div className="flex items-center gap-2">
        <div className="h-[1px] w-16 bg-black" />
        <span className="tabular-nums">
          {hasValue ? value!.toFixed(1) : "-"}
        </span>
      </div>
    </div>
  );
}

// ====== ICON TYPE (positive / neutral / negative) ======
type TypeBadgeProps = {
  type: "positive" | "neutral" | "negative";
  rating: number;
};

function TypeBadge({ type }: TypeBadgeProps) {
  const baseClass =
    "mt-[3px] flex h-4 w-4 items-center justify-center rounded-full text-[8px] font-semibold text-white";

  if (type === "positive") {
    return <div className={`${baseClass} bg-green-600`}>+</div>;
  }

  if (type === "negative") {
    return <div className={`${baseClass} bg-red-600`}>-</div>;
  }

  // neutral
  return <div className={`${baseClass} bg-gray-400`} />;
}

// ====== TRUST SCORE BADGE (inline trong About this seller) ======
type TrustData = {
  finalScore: number;
  tier: "TRUSTED" | "STANDARD" | "RISK" | "HIGH_RISK";
  badge: string;
  avgRating: number;
  reviewCount: number;
  completionRate: string;
  responseRate: string;
  disputeRate: string;
  accountAgeMonths: number;
  underMonitoring: boolean;
};

const TIER_STYLES: Record<string, { bg: string; text: string; border: string; icon: string }> = {
  TRUSTED: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-300", icon: "🛡" },
  STANDARD: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-300", icon: "✓" },
  RISK: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-300", icon: "⚠" },
  HIGH_RISK: { bg: "bg-red-50", text: "text-red-700", border: "border-red-300", icon: "✗" },
};

function TrustScoreBadge({ sellerId }: { sellerId: string }) {
  const [trust, setTrust] = useState<TrustData | null>(null);
  const [loadingTrust, setLoadingTrust] = useState(true);

  useEffect(() => {
    if (!sellerId) return;
    api.get(`/api/trust-score/seller/${sellerId}`)
      .then(res => setTrust(res.data.data))
      .catch(() => { })
      .finally(() => setLoadingTrust(false));
  }, [sellerId]);

  if (loadingTrust) {
    return (
      <div className="mt-6 border-t border-neutral-200 pt-4">
        <div className="h-4 w-32 animate-pulse rounded bg-muted mb-2" />
        <div className="h-16 animate-pulse rounded bg-muted/40" />
      </div>
    );
  }

  if (!trust) return null;

  const style = TIER_STYLES[trust.tier] ?? TIER_STYLES.STANDARD;
  const scoreBarWidth = Math.min((trust.finalScore / 5) * 100, 100);
  const scoreColor =
    trust.finalScore >= 4.5 ? "#10b981" :
      trust.finalScore >= 4.0 ? "#3b82f6" :
        trust.finalScore >= 3.0 ? "#f59e0b" : "#ef4444";

  return (
    <div className="mt-6 border-t border-neutral-200 pt-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold">Trust Score</h3>
        {/* Tier badge */}
        <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${style.bg} ${style.text} ${style.border}`}>
          {style.icon} {trust.underMonitoring ? "Under Monitoring" : trust.badge}
        </span>
      </div>

      {/* Score row */}
      <div className="flex items-center gap-3 mb-3">
        <div
          className="flex h-12 w-12 flex-shrink-0 flex-col items-center justify-center rounded-full border-2"
          style={{ borderColor: scoreColor }}
        >
          <span className="text-base font-bold leading-none" style={{ color: scoreColor }}>
            {trust.finalScore.toFixed(1)}
          </span>
          <span className="text-[9px] text-muted-foreground">/5</span>
        </div>
        <div className="flex-1">
          {/* Stars */}
          <div className="flex items-center gap-0.5 mb-1">
            {[1, 2, 3, 4, 5].map(s => (
              <Star
                key={s}
                className={`h-3 w-3 ${s <= Math.round(trust.avgRating) ? "fill-yellow-400 text-yellow-400" : "text-gray-200"}`}
              />
            ))}
            <span className="ml-1 text-[11px] text-muted-foreground">
              {trust.avgRating.toFixed(1)} ({trust.reviewCount})
            </span>
          </div>
          {/* Bar */}
          <div className="h-1.5 w-full rounded-full bg-gray-100 overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${scoreBarWidth}%`, backgroundColor: scoreColor }}
            />
          </div>
        </div>
      </div>

      {/* 4 stats grid */}
      <div className="grid grid-cols-2 gap-x-3 gap-y-2">
        <TrustStat icon={<CheckCircle className="h-3 w-3 text-emerald-500" />} label="Completion" value={`${trust.completionRate}%`} />
        <TrustStat icon={<Zap className="h-3 w-3 text-blue-500" />} label="Response" value={`${trust.responseRate}%`} />
        <TrustStat
          icon={<ShieldAlert className="h-3 w-3 text-amber-500" />}
          label="Dispute"
          value={`${trust.disputeRate}%`}
          warn={parseFloat(trust.disputeRate) > 5}
        />
        <TrustStat icon={<Clock className="h-3 w-3 text-purple-500" />} label="Tenure" value={`${Math.floor(trust.accountAgeMonths)}m`} />
      </div>

      {trust.underMonitoring && (
        <div className="mt-2 flex items-center gap-1.5 rounded-md bg-amber-50 border border-amber-200 px-2 py-1.5 text-[10px] text-amber-700">
          ⚠️ This seller is under quality monitoring
        </div>
      )}
    </div>
  );
}

function TrustStat({
  icon, label, value, warn = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  warn?: boolean;
}) {
  return (
    <div className="flex items-center gap-1.5">
      {icon}
      <div>
        <span className="block text-[10px] text-muted-foreground">{label}</span>
        <span className={`block text-xs font-semibold leading-tight ${warn ? "text-red-500" : ""}`}>{value}</span>
      </div>
    </div>
  );
}
