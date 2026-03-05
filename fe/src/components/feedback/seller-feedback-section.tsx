import { useEffect, useMemo, useState } from "react";
import api from "@/lib/axios";
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
  ChevronLeft,
  Filter
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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

type SellerFeedbackSectionProps = {
  sellerId: string;
  sellerName?: string;
  productId?: string;
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
  averageRate: number;
  averageRate1?: number;
  averageRate2?: number;
  averageRate3?: number;
  averageRate4?: number;
  positiveRate: number;
  positiveCount: number;
};

// Type cho sản phẩm của seller dựa vào MongoDB schema
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

// Response từ API products
type ProductsResponse = {
  data: SellerProduct[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

type TabType = "thisItem" | "allItems";
type RatingFilter = "all" | "positive" | "neutral" | "negative";
type ProductViewMode = "grid" | "list";
type ProductSort = "newest" | "price_asc" | "price_desc" | "popular" | "rating";

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

  // State cho Store Products
  const [showStore, setShowStore] = useState(false);
  const [products, setProducts] = useState<SellerProduct[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [productsTotal, setProductsTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [viewMode, setViewMode] = useState<ProductViewMode>("grid");
  const [sortBy, setSortBy] = useState<ProductSort>("newest");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [categories, setCategories] = useState<{id: string; name: string; count: number}[]>([]);

  const displayName =
    sellerName || (sellerId ? `Seller #${sellerId.slice(-5)}` : "Seller");

  // ===== LOAD REVIEWS DATA =====
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

  // ===== LOAD PRODUCTS WHEN STORE OPENS =====
  useEffect(() => {
    if (!showStore || !sellerId) return;

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

    // Sử dụng endpoint chính xác
    const res = await api.get(`/api/seller/${sellerId}/products`, { params });
    
    if (res.data.success) {
      setProducts(res.data.data);
      setProductsTotal(res.data.total);
      setTotalPages(res.data.totalPages);
      
      // Extract categories
      if (res.data.data.length > 0) {
        const categoryMap = new Map();
        res.data.data.forEach((product: any) => {
          if (product.categoryId && product.categoryId._id) {
            const catId = product.categoryId._id;
            const catName = product.categoryId.name;
            if (categoryMap.has(catId)) {
              categoryMap.set(catId, {
                ...categoryMap.get(catId),
                count: categoryMap.get(catId).count + 1
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
        setCategories(Array.from(categoryMap.values()));
      }
    }
  } catch (err) {
    console.error("Error fetching products:", err);
    // Có thể thêm fallback data để test UI
  } finally {
    setLoadingProducts(false);
  }
};

    fetchProducts();
  }, [sellerId, showStore, currentPage, sortBy, searchTerm, selectedCategory]);

  // Reset pagination khi thay đổi filter
  useEffect(() => {
    setCurrentPage(1);
  }, [sortBy, searchTerm, selectedCategory]);

  const allReviews = allData?.data ?? [];

  const thisItemReviews = useMemo(() => {
    if (!productId) return [];
    return allReviews.filter((r) => r.product._id === productId);
  }, [allReviews, productId]);

  const totalAllItems = allData?.total ?? 0;
  const totalThisItem = thisItemReviews.length;

  const baseReviews =
    activeTab === "thisItem" && productId ? thisItemReviews : allReviews;

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

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(price);
  };

  const getStockStatus = (stock: number, quantity: number) => {
    const total = stock + quantity;
    if (total <= 0) return { label: "Out of stock", color: "bg-red-100 text-red-800" };
    if (total < 5) return { label: "Low stock", color: "bg-yellow-100 text-yellow-800" };
    return { label: "In stock", color: "bg-green-100 text-green-800" };
  };

  const handleViewProduct = (productId: string) => {
    window.location.href = `/product/${productId}`;
  };

  const handleCloseStore = () => {
    setShowStore(false);
    setProducts([]);
    setCurrentPage(1);
    setSearchTerm("");
    setSelectedCategory("all");
  };

  return (
    <>
      <section className="mt-10 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-10 rounded-sm border border-neutral-200 bg-white">
          {/* LEFT: ABOUT THIS SELLER */}
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

            {/* Store button */}
            <div className="mt-4 flex flex-col gap-2">
              <Button 
                className="rounded-full flex items-center gap-2"
                onClick={() => setShowStore(true)}
              >
                <ShoppingBag className="h-4 w-4" />
                Visit store
              </Button>
            </div>

            {/* Detailed seller ratings */}
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

            {/* Trust score badge */}
            <TrustScoreBadge sellerId={sellerId} />
          </div>

          {/* RIGHT: SELLER FEEDBACK */}
          <div className="col-span-7 px-6 py-6">
            {/* header + tabs + filter */}
            <div className="space-y-3 border-b border-neutral-200 pb-3">
              <div className="flex items-baseline justify-between gap-4">
                <h2 className="text-base font-semibold">
                  Seller feedback ({totalAllItems})
                </h2>
              </div>

              {/* Tabs */}
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

              {/* Filter */}
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
              </div>
            </div>

            {/* Feedback list */}
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

      {/* STORE MODAL - Hiển thị sản phẩm của seller */}
      <Dialog open={showStore} onOpenChange={handleCloseStore}>
        <DialogContent className="max-w-6xl max-h-[90vh] p-0">
          <DialogHeader className="px-6 pt-6 pb-0">
            <DialogTitle className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={handleCloseStore}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div>
                  <h2 className="text-xl font-semibold">{displayName}'s Store</h2>
                  <p className="text-sm text-muted-foreground">
                    {productsTotal} products • {totalAllItems} feedbacks • {positivePercent.toFixed(0)}% positive
                  </p>
                </div>
              </div>
            </DialogTitle>
          </DialogHeader>

          {/* Store content */}
          <div className="px-6 pb-6">
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
                <Select value={sortBy} onValueChange={(value: ProductSort) => setSortBy(value)}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest">Newest first</SelectItem>
                    <SelectItem value="price_asc">Price: Low to High</SelectItem>
                    <SelectItem value="price_desc">Price: High to Low</SelectItem>
                    <SelectItem value="popular">Most popular</SelectItem>
                    <SelectItem value="rating">Top rated</SelectItem>
                  </SelectContent>
                </Select>

                <div className="flex border rounded-md">
                  <Button
                    variant={viewMode === "grid" ? "default" : "ghost"}
                    size="icon"
                    className="rounded-r-none"
                    onClick={() => setViewMode("grid")}
                  >
                    <Grid className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={viewMode === "list" ? "default" : "ghost"}
                    size="icon"
                    className="rounded-l-none"
                    onClick={() => setViewMode("list")}
                  >
                    <List className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Category filters */}
            {categories.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-6">
                <Badge
                  variant={selectedCategory === "all" ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => setSelectedCategory("all")}
                >
                  All
                </Badge>
                {categories.map((cat) => (
                  <Badge
                    key={cat.id}
                    variant={selectedCategory === cat.id ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => setSelectedCategory(cat.id)}
                  >
                    {cat.name} ({cat.count})
                  </Badge>
                ))}
              </div>
            )}

            {/* Products grid/list */}
            <ScrollArea className="h-[500px] pr-4">
              {loadingProducts ? (
                <div className="flex items-center justify-center h-40">
                  <div className="text-center">
                    <Package className="h-8 w-8 animate-pulse text-muted-foreground mx-auto mb-2" />
                    <p className="text-muted-foreground">Loading products...</p>
                  </div>
                </div>
              ) : products.length === 0 ? (
                <div className="flex items-center justify-center h-40">
                  <div className="text-center">
                    <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-muted-foreground">No products found</p>
                  </div>
                </div>
              ) : viewMode === "grid" ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {products.map((product) => {
                    const stockStatus = getStockStatus(product.stock, product.quantity);
                    
                    return (
                      <Card key={product._id} className="overflow-hidden hover:shadow-lg transition-shadow">
                        <div className="aspect-square bg-muted relative group">
                          {product.image || (product.images && product.images[0]) ? (
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
                          <h3 className="font-medium text-sm line-clamp-2 mb-1 h-10">
                            {product.title}
                          </h3>
                          
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-lg font-bold text-primary">
                              {formatPrice(product.price)}
                            </span>
                            <Badge className={stockStatus.color}>
                              {stockStatus.label}
                            </Badge>
                          </div>

                          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                            <div className="flex items-center gap-1">
                              <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                              <span>{product.averageRating.toFixed(1)}</span>
                            </div>
                            <span>•</span>
                            <span>{product.ratingCount} reviews</span>
                          </div>

                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Eye className="h-3 w-3" />
                              <span>{product.watchCount || 0} watching</span>
                            </div>
                            {product.dealQuantitySold > 0 && (
                              <div className="flex items-center gap-1">
                                <TrendingUp className="h-3 w-3" />
                                <span>{product.dealQuantitySold} sold</span>
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
                    const stockStatus = getStockStatus(product.stock, product.quantity);
                    
                    return (
                      <Card key={product._id} className="overflow-hidden hover:shadow-md transition-shadow">
                        <div className="flex">
                          <div className="w-32 h-32 bg-muted flex-shrink-0">
                            {product.image || (product.images && product.images[0]) ? (
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
                              <h3 className="font-medium text-sm line-clamp-1">
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
                                {formatPrice(product.price)}
                              </span>
                              
                              <div className="flex items-center gap-1">
                                <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                                <span>{product.averageRating.toFixed(1)} ({product.ratingCount})</span>
                              </div>
                              
                              <div className="flex items-center gap-1">
                                <Eye className="h-3 w-3" />
                                <span>{product.watchCount || 0}</span>
                              </div>
                              
                              {product.dealQuantitySold > 0 && (
                                <div className="flex items-center gap-1">
                                  <TrendingUp className="h-3 w-3" />
                                  <span>{product.dealQuantitySold} sold</span>
                                </div>
                              )}
                            </div>
                            
                            <Button
                              className="mt-2"
                              size="sm"
                              onClick={() => handleViewProduct(product._id)}
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
                <div className="flex items-center justify-center gap-2 mt-6">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </Button>
                  
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 2)
                    .map((p, i, arr) => (
                      <>
                        {i > 0 && arr[i - 1] !== p - 1 && (
                          <span key={`ellipsis-${p}`} className="px-2">...</span>
                        )}
                        <Button
                          key={p}
                          variant={currentPage === p ? "default" : "outline"}
                          size="sm"
                          onClick={() => setCurrentPage(p)}
                        >
                          {p}
                        </Button>
                      </>
                    ))}
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Next
                  </Button>
                </div>
              )}
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// Detail rating row component
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

// Type badge component
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

  return <div className={`${baseClass} bg-gray-400`} />;
}

// Trust score badge component
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
        <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${style.bg} ${style.text} ${style.border}`}>
          {style.icon} {trust.underMonitoring ? "Under Monitoring" : trust.badge}
        </span>
      </div>

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
          <div className="h-1.5 w-full rounded-full bg-gray-100 overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${scoreBarWidth}%`, backgroundColor: scoreColor }}
            />
          </div>
        </div>
      </div>

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