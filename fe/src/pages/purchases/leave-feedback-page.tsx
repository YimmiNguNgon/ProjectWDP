// src/pages/purchases/leave-feedback-page.tsx
import { useEffect, useState, type FormEvent } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import api from "@/lib/axios";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { RatingStars } from "@/components/feedback/rating-stars";
import { useAuth } from "@/hooks/use-auth";
import { User as UserIcon, Heart } from "lucide-react";

type OrderItemProduct = {
  _id: string;
  title: string;
  price: number;
  imageUrl?: string;
};

type OrderItem = {
  productId: OrderItemProduct;
  title: string;
  price: number;
  quantity: number;
};

type Order = {
  _id: string;
  seller: {
    _id: string;
    username: string;
  };
  items: OrderItem[];
  createdAt: string;
};

type GetOrderResponse = {
  data: Order;
};

type ReviewCreated = {
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
  seller: {
    _id: string;
    username: string;
  };
  rating: number; // overall
  // 4 detailed seller ratings
  rating1?: number; // Accurate description
  rating2?: number; // Reasonable shipping cost
  rating3?: number; // Shipping speed
  rating4?: number; // Communication (nếu backend có)
  comment: string;
  type?: "positive" | "neutral" | "negative";
  createdAt: string;
  updatedAt: string;
  __v: number;
};

type PostReviewResponse = {
  data: ReviewCreated;
};

type GetProductReviewsResponse = {
  data: ReviewCreated[];
};

export default function LeaveFeedbackPage() {
  const { orderId, productId } = useParams<{
    orderId: string;
    productId: string;
  }>();

  const navigate = useNavigate();
  const { payload } = useAuth();
  const userId = payload?.userId;

  const [order, setOrder] = useState<Order | null>(null);
  const [item, setItem] = useState<OrderItem | null>(null);

  // Overall rating (How did it go?)
  const [ratingType, setRatingType] = useState<
    "positive" | "neutral" | "negative" | null
  >(null);
  const [overallRating, setOverallRating] = useState(0);

  // ===== Detailed seller ratings (4 dòng) =====
  const [accurateDescriptionRating, setAccurateDescriptionRating] = useState(0);
  const [shippingCostRating, setShippingCostRating] = useState(0);
  const [shippingSpeedRating, setShippingSpeedRating] = useState(0);
  const [communicationRating, setCommunicationRating] = useState(0);

  const [comment, setComment] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [createdReview, setCreatedReview] = useState<ReviewCreated | null>(
    null
  );
  const [existingReview, setExistingReview] = useState<ReviewCreated | null>(
    null
  );

  const [showThankYouPage, setShowThankYouPage] = useState(false);
  const [showSaveSellerModal, setShowSaveSellerModal] = useState(false);

  // ===== LOAD ORDER + ITEM =====
  useEffect(() => {
    const fetchOrder = async () => {
      if (!orderId) return;

      try {
        const res = await api.get<GetOrderResponse>(
          `/api/orders/${orderId}`
        );
        const orderData = res.data.data;
        setOrder(orderData);

        const found = orderData.items.find(
          (it) => it.productId?._id === productId
        );
        if (found) setItem(found);
      } catch (error: unknown) {
        console.error("Failed to load order", error);
        setErrorMsg("Cannot load order information.");
      }
    };

    fetchOrder();
  }, [orderId, productId]);

  // ===== CHECK ĐÃ REVIEW CHƯA =====
  useEffect(() => {
    const checkExistingReview = async () => {
      if (!productId || !orderId || !userId) return;

      try {
        const res = await api.get<GetProductReviewsResponse>(
          `/api/reviews/product/${productId}`,
          { params: { page: 1, limit: 100 } }
        );

        const reviews = res.data.data || [];
        const found = reviews.find(
          (r) => r.order === orderId && r.reviewer?._id === userId
        );

        if (found) {
          setExistingReview(found);
        }
      } catch (error) {
        console.error("Failed to check existing review", error);
      }
    };

    checkExistingReview();
  }, [productId, orderId, userId]);

  const handleSelectType = (type: "positive" | "neutral" | "negative") => {
    setRatingType(type);
    if (type === "positive") setOverallRating(5);
    if (type === "neutral") setOverallRating(3);
    if (type === "negative") setOverallRating(1);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setCreatedReview(null);

    if (!orderId || !productId) {
      setErrorMsg("Order or product is missing.");
      return;
    }
    if (!ratingType || overallRating === 0) {
      setErrorMsg("Please select Positive, Neutral or Negative.");
      return;
    }
    if (!comment.trim()) {
      setErrorMsg("Please add a comment about your experience.");
      return;
    }

    try {
      setSubmitting(true);

      const res = await api.post<PostReviewResponse>("/api/reviews", {
        orderId,
        productId,
        rating: overallRating,
        comment,
        // map 4 detailed seller ratings sang field backend
        rating1: accurateDescriptionRating,
        rating2: shippingCostRating,
        rating3: shippingSpeedRating,
        rating4: communicationRating,
      });

      setCreatedReview(res.data.data);
      setShowThankYouPage(true);
      setShowSaveSellerModal(true);
    } catch (error: unknown) {
      console.error("Failed to submit review", error);

      if (axios.isAxiosError(error) && error.response) {
        const data = error.response.data as {
          message?: string;
          error?: string;
        };
        setErrorMsg(
          data.message ||
          data.error ||
          "Failed to submit feedback. Please try again."
        );
      } else {
        setErrorMsg("Failed to submit feedback. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleViewProductFeedback = () => {
    if (!productId) return;
    navigate(`/products/${productId}#product-reviews`);
  };

  const handleGoBackToOrders = () => {
    navigate("/my-ebay/activity/purchases");
  };

  const productTitle = item?.productId?.title || item?.title || "Product";
  const finalReview = createdReview || existingReview;
  const canLeaveFeedback = !finalReview;

  const isFormValid =
    !!ratingType && overallRating > 0 && comment.trim().length > 0;

  // ===== THANK YOU PAGE =====
  if (showThankYouPage) {
    return (
      <div className="px-8 py-6">
        <div className="mb-6 rounded-sm bg-emerald-600 px-4 py-2 text-sm font-medium text-white">
          Thank you for your feedback!
        </div>

        <div className="grid gap-6 md:grid-cols-[2fr,1fr]">
          <Card>
            <CardContent className="space-y-3 p-6">
              <h1 className="text-xl font-semibold">Leave feedback</h1>
              <p className="text-sm text-muted-foreground">
                Would you like to leave more feedback?
              </p>
              <p className="text-xs text-muted-foreground">
                Your feedback helps other members buy and sell on our site.
              </p>
              <Button className="mt-2 w-fit" onClick={handleGoBackToOrders}>
                Leave feedback
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-2 p-6 text-sm">
              <div className="font-semibold">Would you like to...</div>
              <button
                type="button"
                className="block text-blue-600 underline"
                onClick={() => navigate("/")}
              >
                Go to My eBay
              </button>
              <button
                type="button"
                className="block text-blue-600 underline"
                onClick={handleViewProductFeedback}
              >
                View feedback profile
              </button>
              <button
                type="button"
                className="block text-blue-600 underline"
                onClick={handleGoBackToOrders}
              >
                Leave more feedback
              </button>
            </CardContent>
          </Card>
        </div>

        {showSaveSellerModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="relative w-full max-w-md rounded-2xl bg-white px-8 py-8 text-center shadow-lg">
              {/* nút X góc phải */}
              <button
                type="button"
                className="absolute right-4 top-4 text-xl leading-none text-gray-600 hover:text-black"
                onClick={() => setShowSaveSellerModal(false)}
              >
                ×
              </button>

              {/* tiêu đề + mô tả */}
              <h2 className="mb-2 text-lg font-semibold">
                We&apos;re glad it went well!
              </h2>
              <p className="mb-6 text-sm text-muted-foreground">
                You can save this seller to keep track of their new listings and
                easily buy from them again.
              </p>

              {/* avatar + tên seller */}
              <div className="mb-4 flex flex-col items-center gap-2">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
                  <UserIcon className="h-6 w-6 text-gray-400" />
                </div>
                <div className="text-sm font-medium">
                  {order?.seller.username ?? "seller"}
                </div>
              </div>

              {/* nút Save this seller: pill + icon tim */}
              <Button
                type="button"
                onClick={() => setShowSaveSellerModal(false)}
                className="mb-4 mx-auto flex w-60 items-center justify-center gap-2 rounded-full bg-blue-600 text-sm font-medium text-white hover:bg-blue-700"
              >
                <Heart className="h-4 w-4" />
                <span>Save this seller</span>
              </Button>

              {/* link No, thanks */}
              <button
                type="button"
                className="text-xs text-blue-600 underline"
                onClick={() => setShowSaveSellerModal(false)}
              >
                No, thanks
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ===== FORM LEAVE FEEDBACK =====
  return (
    <div className="px-8 py-6">
      <h1 className="mb-4 text-2xl font-semibold">Leave feedback</h1>

      <Card>
        <CardContent className="space-y-6 p-6">
          {/* TOP ROW: image + seller + How did it go? */}
          <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-start">
            {/* LEFT: Product info */}
            <div className="flex gap-4 w-full md:w-auto">
              <div className="h-24 w-24 rounded bg-muted" />
              <div className="space-y-1 text-base">
                <div className="font-semibold">{productTitle}</div>
                <div className="text-sm text-muted-foreground">
                  Sold by{" "}
                  <span className="underline">
                    {order?.seller.username ?? "seller"}
                  </span>
                </div>
              </div>
            </div>

            {/* RIGHT: How did it go */}
            <div className="w-full md:w-[500px] pl-10">
              <div className="mb-2 text-base font-semibold">
                How did it go?*
              </div>
              <p className="mb-3 text-sm text-muted-foreground">
                Rate your experience
              </p>

              <div className="flex gap-3 w-full">
                {(["positive", "neutral", "negative"] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => handleSelectType(type)}
                    className={[
                      "flex-1 rounded-full border",
                      "py-2 text-base font-medium",
                      "transition-all duration-150",
                      ratingType === type
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-white border-gray-300 hover:bg-gray-100",
                    ].join(" ")}
                    style={{
                      height: "42px",
                    }}
                  >
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <Separator />

          {!canLeaveFeedback ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                You already left feedback for this item.
              </p>
              <Button
                type="button"
                variant="outline"
                onClick={handleViewProductFeedback}
                disabled={!productId}
              >
                View your feedback
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-10">
              {/* WHAT ELSE WOULD YOU ADD */}
              <div className="grid gap-6 md:grid-cols-[250px_auto]">
                <div>
                  <div className="text-base font-semibold">
                    What else would you add?*
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Help the community with more details.
                  </p>
                </div>

                <div className="w-full">
                  <Textarea
                    rows={5}
                    maxLength={500}
                    className="bg-[#fdfbf2] w-full text-base p-4 rounded-md border"
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                  />
                  <div className="mt-1 flex justify-end text-sm text-muted-foreground">
                    {comment.length} / 500
                  </div>
                </div>
              </div>

              {/* DETAILED SELLER RATINGS */}
              <div className="space-y-5">
                <div className="text-lg font-semibold">
                  Detailed seller ratings
                </div>

                <DetailRow
                  label="Accurate description"
                  description="How accurate was the item description?"
                >
                  <RatingStars
                    size={23}
                    value={accurateDescriptionRating}
                    onChange={setAccurateDescriptionRating}
                  />
                </DetailRow>

                <DetailRow
                  label="Reasonable shipping cost"
                  description="Was the shipping cost fair?"
                >
                  <RatingStars
                    size={23}
                    value={shippingCostRating}
                    onChange={setShippingCostRating}
                  />
                </DetailRow>

                <DetailRow
                  label="Shipping speed"
                  description="How quickly did the item arrive?"
                >
                  <RatingStars
                    size={23}
                    value={shippingSpeedRating}
                    onChange={setShippingSpeedRating}
                  />
                </DetailRow>

                <DetailRow
                  label="Communication"
                  description="How was the communication with the seller?"
                >
                  <RatingStars
                    size={23}
                    value={communicationRating}
                    onChange={setCommunicationRating}
                  />
                </DetailRow>
              </div>

              {/* Error */}
              {errorMsg && <p className="text-base text-red-500">{errorMsg}</p>}

              {/* FOOTER BUTTON – left aligned */}
              <div className="border-t pt-6">
                <Button
                  type="submit"
                  disabled={submitting || !isFormValid}
                  className={
                    "px-10 py-3 text-base font-medium rounded-full " +
                    (!isFormValid
                      ? "cursor-not-allowed bg-gray-300 text-gray-500"
                      : "bg-blue-600 text-white hover:bg-blue-700")
                  }
                >
                  {submitting ? "Submitting..." : "Leave feedback"}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

type DetailRowProps = {
  label: string;
  description?: string;
  children: React.ReactNode;
};

function DetailRow({ label, description, children }: DetailRowProps) {
  return (
    <div className="grid items-center gap-4 md:grid-cols-3">
      <div className="md:col-span-1 space-y-1">
        <div className="text-sm font-medium">{label}</div>
        {description && (
          <div className="text-xs text-muted-foreground">{description}</div>
        )}
      </div>
      <div className="md:col-span-2">
        <div className="flex justify-start md:justify-start">{children}</div>
      </div>
    </div>
  );
}
