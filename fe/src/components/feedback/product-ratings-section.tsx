// src/components/feedback/product-ratings-section.tsx
import { useEffect, useMemo, useState } from "react";
import api from "@/lib/axios";
import { RatingStars } from "./rating-stars";
import { FeedbackList } from "./feedback-list";
import type { FeedbackItem } from "./feedback-list";

type ReviewUser = {
  _id: string;
  username?: string;
  name?: string;
};

type ReviewApi = {
  _id: string;
  rating: number;
  comment?: string;
  createdAt: string;
  created_at?: string;
  reviewer?: ReviewUser;
  user?: ReviewUser;
  username?: string;
};

// 2 kiểu response backend có thể trả:
// 1) { data: ReviewApi[] }
// 2) { data: { reviews: ReviewApi[] } }
type ReviewsApiResponse =
  | { data: ReviewApi[] }
  | { data: { reviews: ReviewApi[] } };

type DistributionRow = {
  stars: number;
  count: number;
};

type ProductRatingsSectionProps = {
  productId: string;
};

// map 1 review từ backend -> FeedbackItem dùng cho UI
function mapReviewToFeedbackItem(r: ReviewApi): FeedbackItem {
  return {
    id: r._id,
    rating: Number(r.rating) || 0,
    comment: r.comment || "",
    author:
      r.reviewer?.username ||
      r.user?.username ||
      r.user?.name ||
      r.username ||
      "Anonymous",
    createdAt: new Date(r.createdAt || r.created_at || "").toLocaleDateString(),
  };
}

export function ProductRatingsSection({
  productId,
}: ProductRatingsSectionProps) {
  const [reviews, setReviews] = useState<FeedbackItem[]>([]);
  const [distribution, setDistribution] = useState<DistributionRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRatings = async () => {
      try {
        setLoading(true);

        const res = await api.get<ReviewsApiResponse>(
          `/reviews/product/${productId}`,
          { params: { page: 1, limit: 100 } }
        );

        const payload = res.data;
        let raw: ReviewApi[] = [];

        if (Array.isArray(payload.data)) {
          // case 1: { data: ReviewApi[] }
          raw = payload.data;
        } else if (Array.isArray(payload.data.reviews)) {
          // case 2: { data: { reviews: ReviewApi[] } }
          raw = payload.data.reviews;
        }

        const mapped: FeedbackItem[] = raw.map(mapReviewToFeedbackItem);

        // tính phân bố 1–5 sao
        const base: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        mapped.forEach((r) => {
          const key = Math.min(5, Math.max(1, Math.round(r.rating))) as
            | 1
            | 2
            | 3
            | 4
            | 5;
          base[key] = (base[key] || 0) + 1;
        });

        const rows: DistributionRow[] = [5, 4, 3, 2, 1].map((star) => ({
          stars: star,
          count: base[star as 1 | 2 | 3 | 4 | 5] || 0,
        }));

        setReviews(mapped);
        setDistribution(rows);
      } catch (err) {
        console.error("Failed to load product ratings: ", err);
        setReviews([]);
        setDistribution([]);
      } finally {
        setLoading(false);
      }
    };

    if (productId) fetchRatings();
  }, [productId]);

  const average = useMemo(() => {
    if (!reviews.length) return 0;
    const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
    return sum / reviews.length;
  }, [reviews]);

  const total = reviews.length;
  const maxCount =
    distribution.length > 0
      ? Math.max(...distribution.map((d) => d.count), 1)
      : 1;

  return (
    <section id="product-reviews" className="mt-10">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Product ratings and reviews</h2>
        <button className="text-sm text-primary hover:underline">
          See all {total} reviews
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Đang tải đánh giá...</p>
      ) : (
        <>
          <div className="grid grid-cols-[220px,1fr,260px] gap-8 mb-6">
            {/* Average + stars */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <span className="text-4xl font-semibold">
                  {average.toFixed(1)}
                </span>
                <div className="mt-1">
                  <RatingStars value={average} readOnly size={20} />
                  <p className="text-xs text-muted-foreground">
                    {total} product ratings
                  </p>
                </div>
              </div>
            </div>

            {/* Distribution bar */}
            <div className="space-y-1">
              {distribution.map((row) => (
                <div
                  key={row.stars}
                  className="flex items-center gap-2 text-xs"
                >
                  <span className="w-4">{row.stars}★</span>
                  <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-neutral-800 dark:bg-neutral-100"
                      style={{
                        width: `${(row.count / maxCount) * 100}%`,
                      }}
                    />
                  </div>
                  <span className="w-6 text-right">{row.count}</span>
                </div>
              ))}
            </div>

            {/* 3 circle stats – tạm mock */}
            <div className="flex items-center justify-end gap-6">
              {[
                { label: "Would recommend", value: 100 },
                { label: "Good value", value: 66 },
                { label: "Good quality", value: 100 },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="flex flex-col items-center text-xs text-center"
                >
                  <div className="h-14 w-14 rounded-full border flex items-center justify-center text-sm font-semibold">
                    {stat.value}%
                  </div>
                  <span className="mt-1 text-[11px]">{stat.label}</span>
                </div>
              ))}
            </div>
          </div>

          <h3 className="text-sm font-semibold mb-3">Most relevant reviews</h3>
          <FeedbackList items={reviews} />
        </>
      )}
    </section>
  );
}
