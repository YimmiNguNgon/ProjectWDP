import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Pagination } from "@/components/pagination";
import api from "@/lib/axios";
import { cn } from "@/lib/utils";
import { Heart, ShoppingCart, Package } from "lucide-react";
import React, { useEffect } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import {
  PromotionBadges,
  PromotionPricing,
  DealCountdown,
  DealQuantity,
} from "@/components/promotion/promotion-display";
import { toggleWatchlist, getUserWatchlist } from "@/api/watchlist";
import { toast } from "sonner";
import { SaveSearchDialog } from "@/components/dialogs/save-search-dialog";
import { useAuth } from "@/hooks/use-auth";
import {
  FaTag,
  FaDollarSign,
  FaStar,
  FaMagnifyingGlass,
  FaRotateLeft,
  FaBookmark,
  FaSliders,
} from "react-icons/fa6";

interface Category {
  _id: string;
  name: string;
  slug: string;
  imageUrl?: string;
}

const ratings = [1, 2, 3, 4, 5];
const DEFAULT_MIN_PRICE = 1;
const DEFAULT_MAX_PRICE = 1000;

const parseCategorySlugs = (value: string | null): string[] =>
  String(value || "")
    .split(",")
    .map((slug) => slug.trim())
    .filter(Boolean);

export interface Product {
  _id: string;
  sellerId: string;
  title: string;
  images: string[];
  image: string;
  description: string;
  price: number;
  stock: number;
  quantity: number;
  averageRating: number;
  ratingCount: number;
  categoryId?: Category;
  condition: string;
  status: string;
  promotionType?: "normal" | "outlet" | "daily_deal";
  watchCount?: number;
  originalPrice?: number;
  discountPercent?: number;
  dealStartDate?: string;
  dealEndDate?: string;
  dealQuantityLimit?: number;
  dealQuantitySold?: number;
  variants?: {
    name: string;
    options: { value: string; price?: number; quantity: number }[];
  }[];
  variantCombinations?: {
    key: string;
    selections: { name: string; value: string }[];
    price?: number;
    quantity: number;
  }[];
  createdAt: Date;
  updatedAt: Date;
  __v: number;
}

export default function ProductsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const searchParamsKey = searchParams.toString();
  const { accessToken } = useAuth();
  const navigate = useNavigate();
  const [products, setProducts] = React.useState<Product[]>([]);
  const [totalProducts, setTotalProducts] = React.useState(0);
  const [categories, setCategories] = React.useState<Category[]>([]);
  const [watchedProductIds, setWatchedProductIds] = React.useState<Set<string>>(new Set());
  const [saveSearchDialogOpen, setSaveSearchDialogOpen] = React.useState(false);

  const searchQuery = (searchParams.get("search") || "").trim();
  const sellerQuery = (searchParams.get("seller") || "").trim();
  const saleOnlyQuery = (searchParams.get("saleOnly") || "").trim().toLowerCase();
  const isSaleOnly = ["1", "true", "yes"].includes(saleOnlyQuery);

  const [selectedCategories, setSelectedCategories] = React.useState<string[]>(
    parseCategorySlugs(searchParams.get("categories")),
  );
  const [priceRange, setPriceRange] = React.useState<[number, number]>([
    parseInt(searchParams.get("minPrice") || String(DEFAULT_MIN_PRICE), 10),
    parseInt(searchParams.get("maxPrice") || String(DEFAULT_MAX_PRICE), 10),
  ]);
  const [selectedRating, setSelectedRating] = React.useState<number>(
    parseInt(searchParams.get("rating") || "0", 10),
  );
  const [selectedSort, setSelectedSort] = React.useState<string>(
    searchParams.get("sort") || "",
  );
  const [currentPage, setCurrentPage] = React.useState(
    parseInt(searchParams.get("page") || "1", 10),
  );
  const [appliedFilters, setAppliedFilters] = React.useState(() => ({
    selectedCategories: parseCategorySlugs(searchParams.get("categories")),
    priceRange: [
      parseInt(searchParams.get("minPrice") || String(DEFAULT_MIN_PRICE), 10),
      parseInt(searchParams.get("maxPrice") || String(DEFAULT_MAX_PRICE), 10),
    ] as [number, number],
    selectedRating: parseInt(searchParams.get("rating") || "0", 10),
    selectedSort: searchParams.get("sort") || "",
  }));
  const [totalPages, setTotalPages] = React.useState(1);
  const itemsPerPage = 12;

  useEffect(() => {
    api.get("/api/categories").then((r) => setCategories(r.data.data || [])).catch(() => {});
  }, []);

  useEffect(() => {
    const nextCategories = parseCategorySlugs(searchParams.get("categories"));
    const nextPriceRange: [number, number] = [
      parseInt(searchParams.get("minPrice") || String(DEFAULT_MIN_PRICE), 10),
      parseInt(searchParams.get("maxPrice") || String(DEFAULT_MAX_PRICE), 10),
    ];
    const nextRating = parseInt(searchParams.get("rating") || "0", 10);
    const nextSort = searchParams.get("sort") || "";
    const nextPage = parseInt(searchParams.get("page") || "1", 10);
    setSelectedCategories(nextCategories);
    setPriceRange(nextPriceRange);
    setSelectedRating(nextRating);
    setSelectedSort(nextSort);
    setCurrentPage(nextPage);
    setAppliedFilters({ selectedCategories: nextCategories, priceRange: nextPriceRange, selectedRating: nextRating, selectedSort: nextSort });
  }, [searchParamsKey]);

  useEffect(() => {
    if (!accessToken) return;
    getUserWatchlist()
      .then((res) => {
        const ids = new Set(res.data.data.map((item: any) => item.product._id));
        setWatchedProductIds(ids);
      })
      .catch(() => {});
  }, [accessToken]);

  useEffect(() => {
    const params = new URLSearchParams();
    params.append("page", currentPage.toString());
    params.append("limit", itemsPerPage.toString());
    if (searchQuery) params.append("search", searchQuery);
    if (sellerQuery) params.append("seller", sellerQuery);
    if (isSaleOnly) params.append("saleOnly", "true");
    if (appliedFilters.selectedCategories.length > 0)
      params.append("categories", appliedFilters.selectedCategories.join(","));
    params.append("minPrice", appliedFilters.priceRange[0].toString());
    params.append("maxPrice", appliedFilters.priceRange[1].toString());
    if (appliedFilters.selectedRating > 0)
      params.append("minRating", appliedFilters.selectedRating.toString());
    if (appliedFilters.selectedSort)
      params.append("sort", appliedFilters.selectedSort);

    api.get(`/api/products?${params.toString()}`)
      .then((res) => {
        setProducts(res.data.data || []);
        setTotalProducts(res.data.total || 0);
        setTotalPages(Math.ceil((res.data.total || 0) / itemsPerPage) || 1);
      })
      .catch(() => {});
  }, [searchQuery, sellerQuery, isSaleOnly, appliedFilters, currentPage, itemsPerPage]);

  const buildPageParams = (page: number, filters: typeof appliedFilters) => {
    const params = new URLSearchParams();
    if (searchQuery) params.set("search", searchQuery);
    if (sellerQuery) params.set("seller", sellerQuery);
    if (isSaleOnly) params.set("saleOnly", "true");
    if (filters.selectedCategories.length > 0)
      params.set("categories", filters.selectedCategories.join(","));
    params.set("minPrice", filters.priceRange[0].toString());
    params.set("maxPrice", filters.priceRange[1].toString());
    if (filters.selectedRating > 0) params.set("rating", filters.selectedRating.toString());
    if (filters.selectedSort) params.set("sort", filters.selectedSort);
    if (page > 1) params.set("page", page.toString());
    return params;
  };

  const handleApplyFilters = () => {
    const next = { selectedCategories, priceRange, selectedRating, selectedSort };
    setAppliedFilters(next);
    setCurrentPage(1);
    setSearchParams(buildPageParams(1, next));
  };

  const handleResetFilters = () => {
    const reset = { selectedCategories: [] as string[], priceRange: [DEFAULT_MIN_PRICE, DEFAULT_MAX_PRICE] as [number, number], selectedRating: 0, selectedSort: "" };
    setSelectedCategories(reset.selectedCategories);
    setPriceRange(reset.priceRange);
    setSelectedRating(reset.selectedRating);
    setSelectedSort(reset.selectedSort);
    setAppliedFilters(reset);
    setCurrentPage(1);
    setSearchParams(buildPageParams(1, reset));
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    setSearchParams(buildPageParams(page, appliedFilters));
  };

  const handleCategoryChange = (slug: string, checked: boolean) => {
    setSelectedCategories((prev) =>
      checked ? (prev.includes(slug) ? prev : [...prev, slug]) : prev.filter((s) => s !== slug),
    );
  };

  const handleToggleWatchlist = async (productId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!accessToken) {
      toast.error("Please sign in to add to watchlist");
      navigate("/auth/sign-in");
      return;
    }
    try {
      const res = await toggleWatchlist(productId);
      const isWatched = res.data.watched;
      setProducts((prev) =>
        prev.map((p) => p._id === productId ? { ...p, watchCount: (p.watchCount || 0) + (isWatched ? 1 : -1) } : p),
      );
      setWatchedProductIds((prev) => {
        const next = new Set(prev);
        isWatched ? next.add(productId) : next.delete(productId);
        return next;
      });
      toast.success(isWatched ? "Added to watchlist" : "Removed from watchlist");
    } catch {
      toast.error("Failed to update watchlist");
    }
  };

  return (
    <div className="flex gap-6 items-start">
      {/* ── Sidebar Filter ── */}
      <aside className="w-64 flex-shrink-0 sticky top-4">
        <div className="bg-white rounded-2xl border border-border/60 shadow-sm overflow-hidden">
          {/* Header */}
          <div className="flex items-center gap-2.5 px-5 py-4 border-b border-border/50 bg-gradient-to-r from-primary/5 to-transparent">
            <div className="p-1.5 bg-primary/10 rounded-lg">
              <FaSliders className="w-3.5 h-3.5 text-primary" />
            </div>
            <span className="font-bold text-sm text-foreground">Shop by Category</span>
          </div>

          <div className="px-5 py-4 space-y-5">
            {/* Categories */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <FaTag className="w-3 h-3 text-primary" />
                <span className="text-sm font-semibold text-foreground">Categories</span>
              </div>
              <div className="space-y-2">
                {categories.map((cat) => (
                  <div key={cat._id} className="flex items-center gap-2.5 group">
                    <Checkbox
                      id={cat._id}
                      checked={selectedCategories.includes(cat.slug)}
                      onCheckedChange={(checked) => handleCategoryChange(cat.slug, checked as boolean)}
                      className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                    />
                    <Label
                      htmlFor={cat._id}
                      className="cursor-pointer text-sm text-foreground/70 group-hover:text-foreground transition-colors leading-none"
                    >
                      {cat.name}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            {/* Price */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <FaDollarSign className="w-3 h-3 text-primary" />
                <span className="text-sm font-semibold text-foreground">Price Range</span>
              </div>
              <Slider
                min={1} max={1000} step={1}
                value={priceRange}
                onValueChange={(v) => setPriceRange([v[0], v[1]])}
                className="w-full cursor-pointer mb-3"
              />
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold bg-primary/10 text-primary px-2.5 py-1 rounded-lg">${priceRange[0]}</span>
                <span className="text-xs text-muted-foreground">—</span>
                <span className="text-xs font-semibold bg-primary/10 text-primary px-2.5 py-1 rounded-lg">${priceRange[1]}</span>
              </div>
            </div>

            <Separator />

            {/* Rating */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <FaStar className="w-3 h-3 text-primary" />
                <span className="text-sm font-semibold text-foreground">Rating</span>
              </div>
              <div className="space-y-1">
                {[...ratings].reverse().map((rating) => (
                  <button
                    key={rating}
                    onClick={() => setSelectedRating(selectedRating === rating ? 0 : rating)}
                    className={cn(
                      "flex w-full items-center gap-1.5 rounded-xl py-1.5 px-2.5 text-sm transition-all",
                      selectedRating === rating
                        ? "bg-primary/10 ring-1 ring-primary/30"
                        : "hover:bg-muted"
                    )}
                  >
                    {[...Array(rating)].map((_, i) => (
                      <FaStar key={i} className="h-3 w-3 text-amber-400" />
                    ))}
                    {[...Array(5 - rating)].map((_, i) => (
                      <FaStar key={i} className="h-3 w-3 text-muted-foreground/25" />
                    ))}
                    <span className="text-xs text-muted-foreground ml-1">& up</span>
                  </button>
                ))}
              </div>
            </div>

            <Separator />

            {/* Actions */}
            <div className="flex flex-col gap-2">
              <Button onClick={handleApplyFilters} className="w-full gap-2 rounded-xl">
                <FaMagnifyingGlass className="w-3.5 h-3.5" />
                Apply Filters
              </Button>
              <Button variant="outline" onClick={handleResetFilters} className="w-full gap-2 rounded-xl text-muted-foreground">
                <FaRotateLeft className="w-3.5 h-3.5" />
                Reset
              </Button>
            </div>
          </div>
        </div>
      </aside>

      {/* ── Main Content ── */}
      <div className="flex-1 flex flex-col gap-5">
        {/* Header bar */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-foreground">
              {searchQuery
                ? `Results for "${searchQuery}"`
                : isSaleOnly
                  ? "Sale Time"
                  : "All Products"}
            </h1>
            {totalProducts > 0 && (
              <p className="text-sm text-muted-foreground mt-0.5">
                {totalProducts} products found
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Select value={selectedSort} onValueChange={(val) => setSelectedSort(val)}>
              <SelectTrigger className="w-[180px] cursor-pointer rounded-xl border-border/60 shadow-sm">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem className="cursor-pointer" value="newest">Newest Arrivals</SelectItem>
                <SelectItem className="cursor-pointer" value="price_asc">Price: Low to High</SelectItem>
                <SelectItem className="cursor-pointer" value="price_desc">Price: High to Low</SelectItem>
                <SelectItem className="cursor-pointer" value="name_asc">Name: A to Z</SelectItem>
                <SelectItem className="cursor-pointer" value="name_desc">Name: Z to A</SelectItem>
              </SelectContent>
            </Select>
            {searchQuery && (
              <Button
                variant="outline"
                onClick={() => setSaveSearchDialogOpen(true)}
                className="gap-2 rounded-xl shadow-sm"
              >
                <FaBookmark className="h-3.5 w-3.5" />
                Save Search
              </Button>
            )}
          </div>
        </div>

        {/* Empty State */}
        {products.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-4">
              <Package className="h-10 w-10 text-muted-foreground/50" />
            </div>
            <h2 className="text-xl font-bold text-foreground mb-2">No products found</h2>
            <p className="text-muted-foreground text-sm max-w-sm">
              Try adjusting your filters or search terms to find what you're looking for.
            </p>
            <Button variant="outline" onClick={handleResetFilters} className="mt-4 gap-2 rounded-xl">
              <FaRotateLeft className="w-3.5 h-3.5" />
              Clear all filters
            </Button>
          </div>
        ) : (
          <>
            {/* Product Grid */}
            <div className="grid gap-4 grid-cols-4">
              {products.map((product) => {
                const img = product.images?.[0] || product.image || "/placeholder.png";
                const isWatched = watchedProductIds.has(product._id);

                return (
                  <div
                    key={product._id}
                    className="group bg-white rounded-2xl border border-border/50 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 overflow-hidden flex flex-col"
                  >
                    {/* Image */}
                    <Link to={`/products/${product._id}`} className="relative block overflow-hidden">
                      <div className="aspect-square bg-gray-50 overflow-hidden">
                        <img
                          src={img}
                          alt={product.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                      {/* Sale / promo badge */}
                      <PromotionBadges product={product} />
                      {/* Condition badge */}
                      {product.condition && product.condition !== "new" && (
                        <span className="absolute top-2 right-2 bg-slate-700/80 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize">
                          {product.condition}
                        </span>
                      )}
                    </Link>

                    {/* Info */}
                    <div className="flex flex-col gap-2 p-3 flex-1">
                      {/* Variants */}
                      {product.variants && product.variants.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {product.variants.slice(0, 1).map((v) => (
                            <span key={v.name} className="text-[10px] bg-muted px-2 py-0.5 rounded-full text-muted-foreground">
                              {v.name}: {v.options.map((o) => o.value).join(", ")}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Title */}
                      <Link to={`/products/${product._id}`}>
                        <h3 className="text-sm font-semibold text-foreground line-clamp-2 leading-snug hover:text-primary transition-colors">
                          {product.title}
                        </h3>
                      </Link>

                      {/* Description */}
                      <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                        {product.description}
                      </p>

                      {/* Stars */}
                      <div className="flex items-center gap-1">
                        <div className="flex items-center gap-0.5">
                          {[...Array(5)].map((_, i) => (
                            <FaStar
                              key={i}
                              className={cn(
                                "h-3 w-3",
                                i < Math.round(product.averageRating)
                                  ? "text-amber-400"
                                  : "text-muted-foreground/25",
                              )}
                            />
                          ))}
                        </div>
                        <span className="text-xs text-muted-foreground">({product.ratingCount})</span>
                      </div>

                      {/* Deal info */}
                      {product.promotionType === "daily_deal" && (
                        <div className="flex items-center justify-between text-xs">
                          <DealCountdown endDate={product.dealEndDate} />
                          <DealQuantity quantityLimit={product.dealQuantityLimit} quantitySold={product.dealQuantitySold} />
                        </div>
                      )}

                      {/* Price + Actions */}
                      <div className="flex items-center justify-between gap-2 mt-auto pt-2 border-t border-border/40">
                        <PromotionPricing product={product} />
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={(e) => handleToggleWatchlist(product._id, e)}
                            className={cn(
                              "w-7 h-7 rounded-full flex items-center justify-center border transition-all duration-200",
                              isWatched
                                ? "bg-red-50 border-red-200 text-red-500"
                                : "bg-muted/60 border-border/50 text-muted-foreground hover:bg-red-50 hover:border-red-200 hover:text-red-500",
                            )}
                          >
                            <Heart className={cn("h-3.5 w-3.5", isWatched ? "fill-red-500" : "")} />
                          </button>
                          <button
                            onClick={() => navigate(`/products/${product._id}`)}
                            className="w-7 h-7 rounded-full bg-primary text-white flex items-center justify-center hover:bg-primary/90 transition-colors shadow-sm"
                          >
                            <ShoppingCart className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={handlePageChange}
              />
            )}
          </>
        )}
      </div>

      <SaveSearchDialog
        open={saveSearchDialogOpen}
        onOpenChange={setSaveSearchDialogOpen}
        searchQuery={searchQuery}
        filters={{
          categories: appliedFilters.selectedCategories,
          minPrice: appliedFilters.priceRange[0],
          maxPrice: appliedFilters.priceRange[1],
          rating: appliedFilters.selectedRating,
        }}
      />
    </div>
  );
}
