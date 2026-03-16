import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import api from "@/lib/axios";
import { useAuth } from "@/hooks/use-auth";
import { saveSeller, unsaveSeller } from "@/api/orders";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Star,
  CheckCircle,
  Zap,
  ShieldAlert,
  Clock,
  Package,
  Eye,
  TrendingUp,
  AlertCircle,
  ShoppingBag,
  Grid,
  List,
  ArrowLeft,
  Store,
  MessageCircle,
  Share2,
  Flag,
  Loader2,
  Heart,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";

// Types (giữ nguyên)
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
  averageRate: number;
  averageRate1?: number;
  averageRate2?: number;
  averageRate3?: number;
  averageRate4?: number;
  positiveRate: number;
  positiveCount: number;
};

type SellerProduct = {
  _id: string;
  title: string;
  description: string;
  price: number;
  stock: number;
  quantity: number;
  averageRating: number;
  ratingCount: number;
  image?: string;
  images?: string[];
  condition: string;
  listingStatus: "active" | "inactive" | "sold" | "draft";
  status: "available" | "out_of_stock" | "discontinued";
  categoryId?: {
    _id: string;
    name: string;
  };
  watchCount: number;
  dealQuantitySold: number;
  createdAt: string;
  isAuction: boolean;
  promotionType: string;
  variants: any[];
};

type Category = {
  id: string;
  name: string;
  count: number;
};

type RatingFilter = "all" | "positive" | "neutral" | "negative";
type ProductViewMode = "grid" | "list";
type ProductSort = "newest" | "price_asc" | "price_desc" | "popular" | "rating";
type InfoTab = "feedback" | "products" | "about";

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

// Helper functions
function getComputedType(
  review: SellerReviewApi,
): "positive" | "neutral" | "negative" {
  if (review.type) return review.type;
  if (review.rating >= 4) return "positive";
  if (review.rating === 3) return "neutral";
  return "negative";
}

const TIER_STYLES: Record<
  string,
  { bg: string; text: string; border: string; icon: string }
> = {
  TRUSTED: {
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    border: "border-emerald-300",
    icon: "🛡",
  },
  STANDARD: {
    bg: "bg-blue-50",
    text: "text-blue-700",
    border: "border-blue-300",
    icon: "✓",
  },
  RISK: {
    bg: "bg-amber-50",
    text: "text-amber-700",
    border: "border-amber-300",
    icon: "⚠",
  },
  HIGH_RISK: {
    bg: "bg-red-50",
    text: "text-red-700",
    border: "border-red-300",
    icon: "✗",
  },
};

export default function SellerInformationPage() {
  const { sellerId } = useParams<{ sellerId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { payload } = useAuth();
  const queryParams = new URLSearchParams(location.search);
  const productId = queryParams.get("productId");
  const sellerName = queryParams.get("name") || undefined;
  const initialTab = (queryParams.get("tab") as InfoTab) || "feedback";

  const isOwnProfile = payload?.userId === sellerId;

  // State
  const [allData, setAllData] = useState<SellerReviewsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<InfoTab>(initialTab);
  const [ratingFilter, setRatingFilter] = useState<RatingFilter>("all");

  // Products state
  const [products, setProducts] = useState<SellerProduct[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [filteredProductsTotal, setFilteredProductsTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [viewMode, setViewMode] = useState<ProductViewMode>("grid");
  const [sortBy, setSortBy] = useState<ProductSort>("newest");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  // Tổng số sản phẩm thực tế (không bị ảnh hưởng bởi filter)
  const [totalProductsCount, setTotalProductsCount] = useState(0);

  // Categories state
  const [allCategories, setAllCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);

  // Trust score
  const [trust, setTrust] = useState<TrustData | null>(null);
  const [loadingTrust, setLoadingTrust] = useState(true);

  // Follow state
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);

  // Seller description
  const [sellerDescription, setSellerDescription] = useState<string>("");

  const displayName =
    sellerName || (sellerId ? `Seller #${sellerId.slice(-5)}` : "Seller");

  // ===== LOAD REVIEWS DATA =====
  useEffect(() => {
    if (!sellerId) {
      setErrorMsg("No seller ID provided");
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);
        setErrorMsg(null);

        const res = await api.get<SellerReviewsResponse>(
          `/api/reviews/seller/${sellerId}`,
          { params: { page: 1, limit: 50 } },
        );

        setAllData(res.data);
      } catch (err: any) {
        console.error("Error fetching reviews:", err);
        setErrorMsg(
          err.response?.data?.message || "Unable to load seller feedback.",
        );
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [sellerId]);

  // ===== LOAD TRUST SCORE =====
  useEffect(() => {
    if (!sellerId) return;

    const fetchTrustScore = async () => {
      try {
        const res = await api.get(`/api/trust-score/seller/${sellerId}`);
        setTrust(res.data.data);
      } catch (err) {
        console.error("Error fetching trust score:", err);
      } finally {
        setLoadingTrust(false);
      }
    };

    fetchTrustScore();
  }, [sellerId]);

  // ===== LOAD FOLLOW STATE =====
  useEffect(() => {
    if (!sellerId || !payload?.userId || isOwnProfile) return;
    api.get("/api/users/saved-sellers").then((res) => {
      const saved = res.data?.data ?? [];
      setIsFollowing(saved.some((s: any) => s._id === sellerId));
    }).catch(() => {});
  }, [sellerId, payload?.userId, isOwnProfile]);

  // ===== LOAD SELLER DESCRIPTION =====
  useEffect(() => {
    if (!sellerId) return;
    api.get(`/api/seller/${sellerId}/profile`).then((res) => {
      if (res.data.success) setSellerDescription(res.data.data.description || "");
    }).catch(() => {});
  }, [sellerId]);

  // ===== LOAD TOTAL PRODUCTS COUNT =====
  useEffect(() => {
    if (!sellerId) return;

    const fetchTotalProducts = async () => {
      try {
        // Thử gọi API stats trước
        const res = await api.get(`/api/seller/${sellerId}/products/stats`);
        if (res.data.success) {
          setTotalProductsCount(res.data.data.totalProducts);
        } else {
          // Fallback: gọi API products với limit=1 để lấy total
          const fallbackRes = await api.get(`/api/seller/${sellerId}/products`, {
            params: { limit: 1 }
          });
          if (fallbackRes.data.success) {
            setTotalProductsCount(fallbackRes.data.total);
          }
        }
      } catch (err) {
        console.error("Error fetching total products:", err);
        // Set mặc định là 0 nếu lỗi
        setTotalProductsCount(0);
      }
    };

    fetchTotalProducts();
  }, [sellerId]);

  // ===== LOAD ALL CATEGORIES =====
  useEffect(() => {
    if (!sellerId || activeTab !== "products") return;

    const fetchAllCategories = async () => {
      try {
        setLoadingCategories(true);
        
        // Gọi API riêng để lấy tất cả categories của seller
        const res = await api.get(`/api/seller/${sellerId}/categories`);
        
        if (res.data.success) {
          setAllCategories(res.data.data);
        }
      } catch (err) {
        console.error("Error fetching categories:", err);
        
        // Fallback: Nếu API không có, fetch 1 trang lớn để lấy categories
        try {
          const fallbackRes = await api.get(`/api/seller/${sellerId}/products`, {
            params: { limit: 100 }
          });
          
          if (fallbackRes.data.success) {
            const categoryMap = new Map<string, Category>();
            
            fallbackRes.data.data.forEach((product: any) => {
              if (product.categoryId && product.categoryId._id) {
                const catId = product.categoryId._id;
                const catName = product.categoryId.name;
                
                if (categoryMap.has(catId)) {
                  const existing = categoryMap.get(catId)!;
                  categoryMap.set(catId, {
                    ...existing,
                    count: existing.count + 1
                  });
                } else {
                  categoryMap.set(catId, {
                    id: catId,
                    name: catName,
                    count: 1
                  });
                }
              }
            });
            
            setAllCategories(Array.from(categoryMap.values()));
          }
        } catch (fallbackErr) {
          console.error("Error in fallback categories fetch:", fallbackErr);
        }
      } finally {
        setLoadingCategories(false);
      }
    };

    fetchAllCategories();
  }, [sellerId, activeTab]);

  // ===== LOAD PRODUCTS =====
  useEffect(() => {
    if (!sellerId || activeTab !== "products") return;

    const fetchProducts = async () => {
      try {
        setLoadingProducts(true);

        const params: any = {
          page: currentPage,
          limit: 12,
          sort: sortBy,
        };

        if (searchTerm) {
          params.search = searchTerm;
        }

        if (selectedCategory && selectedCategory !== "all") {
          params.categoryId = selectedCategory;
        }

        const res = await api.get(`/api/seller/${sellerId}/products`, {
          params,
        });

        if (res.data.success) {
          setProducts(res.data.data);
          setFilteredProductsTotal(res.data.total);
          setTotalPages(res.data.totalPages);
        }
      } catch (err: any) {
        console.error("Error fetching products:", err);
      } finally {
        setLoadingProducts(false);
      }
    };

    fetchProducts();
  }, [sellerId, activeTab, currentPage, sortBy, searchTerm, selectedCategory]);

  // Reset pagination khi thay đổi filter
  useEffect(() => {
    setCurrentPage(1);
  }, [sortBy, searchTerm, selectedCategory]);

  // Computed values
  const allReviews = allData?.data ?? [];

  const thisItemReviews = useMemo(() => {
    if (!productId) return [];
    return allReviews.filter((r) => r.product._id === productId);
  }, [allReviews, productId]);

  const totalAllItems = allData?.total ?? 0;

  const filteredReviews: SellerReviewApi[] = useMemo(() => {
    if (ratingFilter === "all") return allReviews;

    return allReviews.filter((r) => {
      const t = getComputedType(r);
      if (ratingFilter === "positive") return t === "positive";
      if (ratingFilter === "neutral") return t === "neutral";
      if (ratingFilter === "negative") return t === "negative";
      return true;
    });
  }, [allReviews, ratingFilter]);

  const positivePercent = allData?.positiveRate ?? 0;

  const avg1 = allData?.averageRate1 ?? null;
  const avg2 = allData?.averageRate2 ?? null;
  const avg3 = allData?.averageRate3 ?? null;
  const avg4 = allData?.averageRate4 ?? allData?.averageRate ?? null;

  // Helper functions
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

  const getStockStatus = (stock: number, quantity: number) => {
    const total = stock + quantity;
    if (total <= 0)
      return { label: "Out of stock", color: "bg-red-100 text-red-800" };
    if (total < 5)
      return { label: "Low stock", color: "bg-yellow-100 text-yellow-800" };
    return { label: "In stock", color: "bg-green-100 text-green-800" };
  };

  const handleViewProduct = (productId: string) => {
    navigate(`/products/${productId}`);
  };

  const handleGoBack = () => {
    navigate(-1);
  };

  const handleContactSeller = () => {
    navigate(`/chat?sellerId=${sellerId}`);
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
  };

  const handleToggleFollow = async () => {
    if (!payload?.userId) {
      navigate("/auth/sign-in");
      return;
    }
    setFollowLoading(true);
    try {
      if (isFollowing) {
        await unsaveSeller(sellerId!);
        setIsFollowing(false);
        toast.success("Unfollowed seller");
      } else {
        await saveSeller(sellerId!);
        setIsFollowing(true);
        toast.success("Following seller");
      }
    } catch {
      toast.error("Failed to update follow status");
    } finally {
      setFollowLoading(false);
    }
  };

  const clearAllFilters = () => {
    setSearchTerm("");
    setSelectedCategory("all");
    setSortBy("newest");
    setCurrentPage(1);
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading seller information...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (errorMsg || !sellerId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Error</h1>
          <p className="text-muted-foreground mb-4">{errorMsg || "Seller not found"}</p>
          <Button onClick={handleGoBack}>Go Back</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={handleGoBack}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                  <Store className="h-6 w-6" />
                  {displayName}
                </h1>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleContactSeller}>
                <MessageCircle className="h-4 w-4 mr-2" />
                Contact
              </Button>
              {!isOwnProfile && (
                <Button
                  variant={isFollowing ? "default" : "outline"}
                  size="sm"
                  onClick={handleToggleFollow}
                  disabled={followLoading}
                >
                  <Heart className={`h-4 w-4 mr-2 ${isFollowing ? "fill-current" : ""}`} />
                  {isFollowing ? "Following" : "Follow"}
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={handleShare}>
                <Share2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left Sidebar - Seller Info */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg border p-6 sticky top-24">
              {/* Seller Avatar */}
              <div className="flex flex-col items-center text-center mb-6">
                <Avatar className="h-24 w-24 mb-4">
                  <AvatarFallback className="text-2xl bg-primary/10">
                    {displayName.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <h2 className="text-xl font-semibold">{displayName}</h2>
                {totalAllItems > 0 && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {positivePercent.toFixed(0)}% positive feedback ·{" "}
                    {totalAllItems} feedbacks
                  </p>
                )}
              </div>

              {/* Seller Description */}
              {sellerDescription && (
                <div className="mb-6 text-sm text-muted-foreground text-center whitespace-pre-line">
                  {sellerDescription}
                </div>
              )}

              {/* Trust Score */}
              {!loadingTrust && trust && (
                <div className="mb-6">
                  <SellerTrustScore trust={trust} />
                </div>
              )}

              {/* Detailed Ratings */}
              {totalAllItems > 0 && (
                <div className="mb-6">
                  <h3 className="font-semibold mb-3">
                    Detailed seller ratings
                  </h3>
                  <div className="space-y-3">
                    <DetailRatingRow
                      label="Accurate description"
                      value={avg1}
                    />
                    <DetailRatingRow
                      label="Reasonable shipping cost"
                      value={avg2}
                    />
                    <DetailRatingRow label="Shipping speed" value={avg3} />
                    <DetailRatingRow label="Communication" value={avg4} />
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Average for the last 12 months
                  </p>
                </div>
              )}

              {/* Stats */}
              <div className="grid grid-cols-2 gap-3 text-center">
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-2xl font-bold text-primary">
                    {products.length}
                  </p>
                  <p className="text-xs text-muted-foreground">Products</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-2xl font-bold text-primary">
                    {totalProductsCount}
                  </p>
                  <p className="text-xs text-muted-foreground">Reviews</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Content - Tabs */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-lg border">
              <Tabs
                value={activeTab}
                onValueChange={(v) => setActiveTab(v as InfoTab)}
                className="w-full"
              >
                <div className="px-6 py-4 border-b">
                  <TabsList className="w-full justify-start">
                    <TabsTrigger
                      value="products"
                      className="flex-1 cursor-pointer sm:flex-none"
                    >
                      Products 
                    </TabsTrigger>
                    <TabsTrigger
                      value="feedback"
                      className="flex-1 cursor-pointer sm:flex-none"
                    >
                      Feedback 
                    </TabsTrigger>
                    <TabsTrigger
                      value="about"
                      className="flex-1 cursor-pointer sm:flex-none"
                    >
                      About Seller
                    </TabsTrigger>
                  </TabsList>
                </div>

                {/* Feedback Tab */}
                <TabsContent value="feedback" className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">
                        Filter:
                      </span>
                      <Select
                        value={ratingFilter}
                        onValueChange={(v: RatingFilter) => setRatingFilter(v)}
                      >
                        <SelectTrigger className="w-[140px]">
                          <SelectValue placeholder="All ratings" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All ratings</SelectItem>
                          <SelectItem value="positive">Positive</SelectItem>
                          <SelectItem value="neutral">Neutral</SelectItem>
                          <SelectItem value="negative">Negative</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <ScrollArea className="h-[600px] pr-4">
                    {loading ? (
                      <div className="space-y-4">
                        {[1, 2, 3].map((i) => (
                          <div key={i} className="border-b pb-4">
                            <Skeleton className="h-4 w-32 mb-2" />
                            <Skeleton className="h-16 w-full" />
                          </div>
                        ))}
                      </div>
                    ) : filteredReviews.length === 0 ? (
                      <div className="text-center py-8">
                        <p className="text-muted-foreground">
                          No feedback yet for this seller.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {filteredReviews.map((review) => {
                          const type = getComputedType(review);
                          return (
                            <div
                              key={review._id}
                              className="border-b pb-4 last:border-b-0"
                            >
                              <div className="flex items-start gap-3">
                                <TypeBadge type={type} rating={review.rating} />
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 text-sm mb-1">
                                    <span className="font-medium">
                                      {review.reviewer.username}
                                    </span>
                                    <span className="text-xs text-muted-foreground">
                                      •
                                    </span>
                                    <span className="text-xs text-muted-foreground">
                                      {calcRelativeTime(review.createdAt)}
                                    </span>
                                  </div>
                                  <p className="text-sm mb-2">
                                    {review.comment}
                                  </p>
                                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <span>{review.product.title}</span>
                                    {review.verifiedPurchase && (
                                      <>
                                        <span>•</span>
                                        <span className="text-green-600">
                                          Verified purchase
                                        </span>
                                      </>
                                    )}
                                  </div>
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {formatDate(review.createdAt)}
                                  </p>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </ScrollArea>
                </TabsContent>

                {/* Products Tab */}
                <TabsContent value="products" className="p-6">
                  {/* Search and filters */}
                  <div className="flex flex-col sm:flex-row gap-4 mb-6">
                    <div className="flex-1">
                      <Input
                        placeholder="Search in store..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full"
                      />
                    </div>

                    <div className="flex gap-2">
                      <Select
                        value={sortBy}
                        onValueChange={(value: ProductSort) => setSortBy(value)}
                      >
                        <SelectTrigger className="w-[180px] cursor-pointer">
                          <SelectValue placeholder="Sort by" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="newest" className="cursor-pointer">
                            Newest first
                          </SelectItem>
                          <SelectItem
                            value="price_asc"
                            className="cursor-pointer"
                          >
                            Price: Low to High
                          </SelectItem>
                          <SelectItem
                            value="price_desc"
                            className="cursor-pointer"
                          >
                            Price: High to Low
                          </SelectItem>
                          <SelectItem
                            value="popular"
                            className="cursor-pointer"
                          >
                            Most popular
                          </SelectItem>
                          <SelectItem value="rating" className="cursor-pointer">
                            Top rated
                          </SelectItem>
                        </SelectContent>
                      </Select>

                      <div className="flex border rounded-md">
                        <Button
                          variant={viewMode === "grid" ? "default" : "ghost"}
                          size="icon"
                          className="rounded-l-md rounded-r-none cursor-pointer"
                          onClick={() => setViewMode("grid")}
                        >
                          <Grid className="h-4 w-4" />
                        </Button>
                        <Button
                          variant={viewMode === "list" ? "default" : "ghost"}
                          size="icon"
                          className="rounded-r-md rounded-l-none cursor-pointer"
                          onClick={() => setViewMode("list")}
                        >
                          <List className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Category filters */}
                  {allCategories.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-6">
                      <Badge
                        variant={selectedCategory === "all" ? "default" : "outline"}
                        className="cursor-pointer hover:bg-primary/90 transition-colors px-4 py-1"
                        onClick={() => {
                          setSelectedCategory("all");
                          setCurrentPage(1);
                        }}
                      >
                        All Products 
                      </Badge>
                      {allCategories.map((cat) => (
                        <Badge
                          key={cat.id}
                          variant={selectedCategory === cat.id ? "default" : "outline"}
                          className="cursor-pointer hover:bg-primary/90 transition-colors px-4 py-1"
                          onClick={() => {
                            setSelectedCategory(cat.id);
                            setCurrentPage(1);
                          }}
                        >
                          {cat.name} 
                        </Badge>
                      ))}
                    </div>
                  )}

                  {/* Loading categories indicator */}
                  {loadingCategories && (
                    <div className="flex items-center gap-2 mb-4">
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">
                        Loading categories...
                      </span>
                    </div>
                  )}

                  {/* Results info and filters */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-4">
                      
                      {(searchTerm || selectedCategory !== "all") && (
                        <Button
                          variant="link"
                          size="sm"
                          onClick={clearAllFilters}
                          className="h-auto p-0 text-xs"
                        >
                          Clear all filters
                        </Button>
                      )}
                    </div>
                    {loadingProducts && (
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    )}
                  </div>

                  {/* Products grid/list */}
                  <ScrollArea className="h-[500px] pr-4">
                    {loadingProducts ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {[1, 2, 3, 4, 5, 6].map((i) => (
                          <Card key={i}>
                            <Skeleton className="h-48 w-full" />
                            <CardContent className="p-3">
                              <Skeleton className="h-4 w-3/4 mb-2" />
                              <Skeleton className="h-4 w-1/2" />
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    ) : products.length === 0 ? (
                      <div className="flex items-center justify-center h-40">
                        <div className="text-center">
                          <Package className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                          <p className="text-muted-foreground">No products found</p>
                          {(searchTerm || selectedCategory !== "all") && (
                            <Button
                              variant="link"
                              className="mt-2"
                              onClick={clearAllFilters}
                            >
                              Clear filters
                            </Button>
                          )}
                        </div>
                      </div>
                    ) : viewMode === "grid" ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {products.map((product) => {
                          const stockStatus = getStockStatus(
                            product.stock,
                            product.quantity,
                          );

                          return (
                            <Card
                              key={product._id}
                              className="overflow-hidden hover:shadow-lg transition-shadow"
                            >
                              <div
                                className="aspect-square bg-muted relative group cursor-pointer"
                                onClick={() => handleViewProduct(product._id)}
                              >
                                {product.image ||
                                (product.images && product.images[0]) ? (
                                  <img
                                    src={product.image || product.images?.[0]}
                                    alt={product.title}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center">
                                    <Package className="h-12 w-12 text-muted-foreground" />
                                  </div>
                                )}

                                {product.promotionType === "sale" && (
                                  <Badge className="absolute top-2 left-2 bg-red-500">
                                    SALE
                                  </Badge>
                                )}

                                {product.isAuction && (
                                  <Badge className="absolute top-2 right-2 bg-purple-500">
                                    Auction
                                  </Badge>
                                )}
                              </div>

                              <CardContent className="p-3">
                                <h3
                                  className="font-medium text-sm line-clamp-2 mb-1 h-10 cursor-pointer hover:text-primary"
                                  onClick={() => handleViewProduct(product._id)}
                                >
                                  {product.title}
                                </h3>

                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-lg font-bold text-primary">
                                    ${product.price.toFixed(2)}
                                  </span>
                                  <Badge className={stockStatus.color}>
                                    {stockStatus.label}
                                  </Badge>
                                </div>

                                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                                  <div className="flex items-center gap-1">
                                    <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                                    <span>
                                      {product.averageRating.toFixed(1)}
                                    </span>
                                  </div>
                                  <span>•</span>
                                  <span>{product.ratingCount} reviews</span>
                                </div>

                                <div className="flex items-center justify-between text-xs text-muted-foreground">
                                  <div className="flex items-center gap-1">
                                    <Eye className="h-3 w-3" />
                                    <span>
                                      {product.watchCount || 0} watching
                                    </span>
                                  </div>
                                  {product.dealQuantitySold > 0 && (
                                    <div className="flex items-center gap-1">
                                      <TrendingUp className="h-3 w-3" />
                                      <span>
                                        {product.dealQuantitySold} sold
                                      </span>
                                    </div>
                                  )}
                                </div>

                                <Button
                                  className="w-full mt-3"
                                  size="sm"
                                  onClick={() => handleViewProduct(product._id)}
                                >
                                  View details
                                </Button>
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>
                    ) : (
                      // List view
                      <div className="space-y-3">
                        {products.map((product) => {
                          const stockStatus = getStockStatus(
                            product.stock,
                            product.quantity,
                          );

                          return (
                            <Card
                              key={product._id}
                              className="overflow-hidden hover:shadow-md transition-shadow"
                            >
                              <div className="flex">
                                <div
                                  className="w-32 h-32 bg-muted flex-shrink-0 cursor-pointer"
                                  onClick={() => handleViewProduct(product._id)}
                                >
                                  {product.image ||
                                  (product.images && product.images[0]) ? (
                                    <img
                                      src={product.image || product.images?.[0]}
                                      alt={product.title}
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                      <Package className="h-8 w-8 text-muted-foreground" />
                                    </div>
                                  )}
                                </div>

                                <CardContent className="flex-1 p-3">
                                  <div className="flex justify-between mb-1">
                                    <h3
                                      className="font-medium text-sm line-clamp-1 cursor-pointer hover:text-primary"
                                      onClick={() =>
                                        handleViewProduct(product._id)
                                      }
                                    >
                                      {product.title}
                                    </h3>
                                    <Badge className={stockStatus.color}>
                                      {stockStatus.label}
                                    </Badge>
                                  </div>

                                  <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                                    {product.description}
                                  </p>

                                  <div className="flex items-center gap-4 text-xs">
                                    <span className="text-lg font-bold text-primary">
                                      ${product.price.toFixed(2)}
                                    </span>

                                    <div className="flex items-center gap-1">
                                      <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                                      <span>
                                        {product.averageRating.toFixed(1)} (
                                        {product.ratingCount})
                                      </span>
                                    </div>

                                    <div className="flex items-center gap-1">
                                      <Eye className="h-3 w-3" />
                                      <span>{product.watchCount || 0}</span>
                                    </div>

                                    {product.dealQuantitySold > 0 && (
                                      <div className="flex items-center gap-1">
                                        <TrendingUp className="h-3 w-3" />
                                        <span>
                                          {product.dealQuantitySold} sold
                                        </span>
                                      </div>
                                    )}
                                  </div>

                                  <Button
                                    className="mt-2"
                                    size="sm"
                                    onClick={() =>
                                      handleViewProduct(product._id)
                                    }
                                  >
                                    View details
                                  </Button>
                                </CardContent>
                              </div>
                            </Card>
                          );
                        })}
                      </div>
                    )}

                    {/* Pagination */}
                    {totalPages > 1 && (
                      <>
                        <div className="flex items-center justify-center gap-2 mt-8 pt-4 border-t">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            className="cursor-pointer"
                          >
                            Previous
                          </Button>

                          <div className="flex items-center gap-1">
                            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                              let pageNum;
                              if (totalPages <= 5) {
                                pageNum = i + 1;
                              } else if (currentPage <= 3) {
                                pageNum = i + 1;
                              } else if (currentPage >= totalPages - 2) {
                                pageNum = totalPages - 4 + i;
                              } else {
                                pageNum = currentPage - 2 + i;
                              }

                              return (
                                <Button
                                  key={pageNum}
                                  variant={currentPage === pageNum ? "default" : "outline"}
                                  size="sm"
                                  onClick={() => setCurrentPage(pageNum)}
                                  className="cursor-pointer min-w-[32px]"
                                >
                                  {pageNum}
                                </Button>
                              );
                            })}
                          </div>

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages}
                            className="cursor-pointer"
                          >
                            Next
                          </Button>
                        </div>
                        <div className="text-center text-xs text-muted-foreground mt-2">
                          Page {currentPage} of {totalPages}
                        </div>
                      </>
                    )}
                  </ScrollArea>
                </TabsContent>

                {/* About Tab */}
                <TabsContent value="about" className="p-6">
                  <div className="space-y-6">
                    <div>
                      <h3 className="font-semibold mb-2">
                        About {displayName}
                      </h3>
                      {sellerDescription ? (
                        <p className="text-sm text-muted-foreground whitespace-pre-line">
                          {sellerDescription}
                        </p>
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          {sellerName
                            ? `${sellerName} is a seller on our marketplace.`
                            : `This seller has been a member for ${trust ? Math.floor(trust.accountAgeMonths) : "several"} months.`}
                        </p>
                      )}
                    </div>

                    <Separator />

                    <div>
                      <h3 className="font-semibold mb-3">Seller Statistics</h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-gray-50 rounded-lg p-4 text-center">
                          <p className="text-2xl font-bold text-primary">
                            {totalProductsCount}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Total Products
                          </p>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-4 text-center">
                          <p className="text-2xl font-bold text-primary">
                            {totalAllItems}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Total Reviews
                          </p>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-4 text-center">
                          <p className="text-2xl font-bold text-primary">
                            {positivePercent.toFixed(0)}%
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Positive Feedback
                          </p>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-4 text-center">
                          <p className="text-2xl font-bold text-primary">
                            {trust?.completionRate || "0"}%
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Order Completion
                          </p>
                        </div>
                      </div>
                    </div>

                    {trust && (
                      <>
                        <Separator />
                        <div>
                          <h3 className="font-semibold mb-3">
                            Performance Metrics
                          </h3>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">
                                  Response Rate
                                </span>
                                <span className="font-medium">
                                  {trust.responseRate}%
                                </span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">
                                  Dispute Rate
                                </span>
                                <span className="font-medium">
                                  {trust.disputeRate}%
                                </span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">
                                  Account Age
                                </span>
                                <span className="font-medium">
                                  {Math.floor(trust.accountAgeMonths)} months
                                </span>
                              </div>
                            </div>
                            <div className="space-y-2">
                              <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">
                                  Trust Score
                                </span>
                                <span className="font-medium">
                                  {trust.finalScore.toFixed(1)}/5
                                </span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">
                                  Status
                                </span>
                                <Badge className={TIER_STYLES[trust.tier]?.bg}>
                                  {trust.badge}
                                </Badge>
                              </div>
                              {trust.underMonitoring && (
                                <div className="flex items-center gap-1 text-amber-600 text-sm">
                                  <ShieldAlert className="h-4 w-4" />
                                  <span>Under monitoring</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </>
                    )}

                    <Separator />

                    <div>
                      <h3 className="font-semibold mb-2">Shipping & Returns</h3>
                      <p className="text-sm text-muted-foreground mb-2">
                        Standard shipping within 3-5 business days. Returns
                        accepted within 30 days of delivery.
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Contact seller for specific shipping rates and return
                        policies.
                      </p>
                    </div>

                    <div className="bg-blue-50 p-4 rounded-lg">
                      <h4 className="font-medium text-blue-700 mb-2">
                        Need help?
                      </h4>
                      <p className="text-sm text-blue-600 mb-3">
                        If you have questions about this seller or their
                        products, feel free to contact them directly.
                      </p>
                      <Button size="sm" onClick={handleContactSeller}>
                        <MessageCircle className="h-4 w-4 mr-2" />
                        Contact Seller
                      </Button>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper Components
function DetailRatingRow({
  label,
  value,
}: {
  label: string;
  value: number | null | undefined;
}) {
  const hasValue = typeof value === "number" && !Number.isNaN(value);

  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2">
        <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
          {hasValue && (
            <div
              className="h-full bg-primary rounded-full"
              style={{ width: `${(value / 5) * 100}%` }}
            />
          )}
        </div>
        <span className="text-sm font-medium w-8">
          {hasValue ? value!.toFixed(1) : "-"}
        </span>
      </div>
    </div>
  );
}

function TypeBadge({
  type,
}: {
  type: "positive" | "neutral" | "negative";
  rating: number;
}) {
  const baseClass =
    "flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold text-white";

  if (type === "positive") {
    return <div className={`${baseClass} bg-green-600`}>+</div>;
  }

  if (type === "negative") {
    return <div className={`${baseClass} bg-red-600`}>-</div>;
  }

  return <div className={`${baseClass} bg-gray-400`}>•</div>;
}

function SellerTrustScore({ trust }: { trust: TrustData }) {
  const style = TIER_STYLES[trust.tier] ?? TIER_STYLES.STANDARD;
  const scoreBarWidth = Math.min((trust.finalScore / 5) * 100, 100);
  const scoreColor =
    trust.finalScore >= 4.5
      ? "#10b981"
      : trust.finalScore >= 4.0
        ? "#3b82f6"
        : trust.finalScore >= 3.0
          ? "#f59e0b"
          : "#ef4444";

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-semibold">Trust Score</span>
        <span
          className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs ${style.bg} ${style.text} ${style.border}`}
        >
          {style.icon} {trust.badge}
        </span>
      </div>

      <div className="flex items-center gap-3 mb-2">
        <div
          className="flex h-12 w-12 flex-shrink-0 flex-col items-center justify-center rounded-full border-2"
          style={{ borderColor: scoreColor }}
        >
          <span
            className="text-base font-bold leading-none"
            style={{ color: scoreColor }}
          >
            {trust.finalScore.toFixed(1)}
          </span>
          <span className="text-[9px] text-muted-foreground">/5</span>
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-0.5 mb-1">
            {[1, 2, 3, 4, 5].map((s) => (
              <Star
                key={s}
                className={`h-3 w-3 ${s <= Math.round(trust.avgRating) ? "fill-yellow-400 text-yellow-400" : "text-gray-200"}`}
              />
            ))}
          </div>
          <div className="h-1.5 w-full rounded-full bg-gray-100 overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${scoreBarWidth}%`,
                backgroundColor: scoreColor,
              }}
            />
          </div>
        </div>
      </div>

      {trust.underMonitoring && (
        <div className="mt-2 flex items-center gap-1.5 rounded-md bg-amber-50 border border-amber-200 px-2 py-1.5 text-xs text-amber-700">
          <ShieldAlert className="h-3 w-3" />
          This seller is under quality monitoring
        </div>
      )}
    </div>
  );
}