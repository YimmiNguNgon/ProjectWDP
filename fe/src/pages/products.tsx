import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar";
import { Slider } from "@/components/ui/slider";
import { Pagination } from "@/components/pagination";
import api from "@/lib/axios";
import { cn } from "@/lib/utils";
import { Heart, ShoppingCart, Star, Package, Bookmark } from "lucide-react";
import React, { useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
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
import { useNavigate } from "react-router-dom";

interface Category {
  _id: string;
  name: string;
  slug: string;
  imageUrl?: string;
}

const ratings = [1, 2, 3, 4, 5];

const DEFAULT_MIN_PRICE = 0;
const DEFAULT_MAX_PRICE = 10000;

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
  // Promotion fields
  promotionType?: "normal" | "outlet" | "daily_deal";
  watchCount?: number;
  originalPrice?: number;
  discountPercent?: number;
  dealStartDate?: string;
  dealEndDate?: string;
  dealQuantityLimit?: number;
  dealQuantitySold?: number;
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
  const [categories, setCategories] = React.useState<Category[]>([]);
  const [watchedProductIds, setWatchedProductIds] = React.useState<Set<string>>(
    new Set(),
  );
  const [saveSearchDialogOpen, setSaveSearchDialogOpen] = React.useState(false);

  // Get search query from URL params (read-only)
  const searchQuery = (searchParams.get("search") || "").trim();
  const sellerQuery = (searchParams.get("seller") || "").trim();

  // Initialize state from URL params
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
  const itemsPerPage = 10;

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await api.get("/api/categories");
        setCategories(res.data.data || []);
      } catch (error) {
        console.error("Failed to fetch categories:", error);
      }
    };
    fetchCategories();
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
    setAppliedFilters({
      selectedCategories: nextCategories,
      priceRange: nextPriceRange,
      selectedRating: nextRating,
      selectedSort: nextSort,
    });
  }, [searchParamsKey]);

  // Fetch user's watchlist to set initial watched state
  useEffect(() => {
    const fetchWatchlist = async () => {
      if (!accessToken) return;
      try {
        const res = await getUserWatchlist();
        // Since WatchlistItem has product object, we map to get ids
        const ids = new Set(res.data.data.map((item: any) => item.product._id));
        setWatchedProductIds(ids);
      } catch (error) {
        console.error("Failed to fetch watchlist", error);
      }
    };
    fetchWatchlist();
  }, [accessToken]);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const params = new URLSearchParams();
        params.append("page", currentPage.toString());
        params.append("limit", itemsPerPage.toString());

        if (searchQuery) {
          params.append("search", searchQuery);
        }
        if (sellerQuery) {
          params.append("seller", sellerQuery);
        }
        if (appliedFilters.selectedCategories.length > 0) {
          params.append(
            "categories",
            appliedFilters.selectedCategories.join(","),
          );
        }

        params.append("minPrice", appliedFilters.priceRange[0].toString());
        params.append("maxPrice", appliedFilters.priceRange[1].toString());

        if (appliedFilters.selectedRating > 0) {
          params.append("minRating", appliedFilters.selectedRating.toString());
        }
        if (appliedFilters.selectedSort) {
          params.append("sort", appliedFilters.selectedSort);
        }

        const res = await api.get(`/api/products?${params.toString()}`);
        setProducts(res.data.data || []);
        setTotalPages(Math.ceil((res.data.total || 0) / itemsPerPage) || 1);
      } catch (error) {
        console.error("Failed to fetch products:", error);
      }
    };
    fetchProducts();
  }, [
    searchQuery,
    sellerQuery,
    appliedFilters,
    currentPage,
    itemsPerPage,
  ]);

  const buildPageParams = (
    page: number,
    filters: {
      selectedCategories: string[];
      priceRange: [number, number];
      selectedRating: number;
      selectedSort: string;
    },
  ) => {
    const params = new URLSearchParams();
    if (searchQuery) params.set("search", searchQuery);
    if (sellerQuery) params.set("seller", sellerQuery);
    if (filters.selectedCategories.length > 0) {
      params.set("categories", filters.selectedCategories.join(","));
    }
    params.set("minPrice", filters.priceRange[0].toString());
    params.set("maxPrice", filters.priceRange[1].toString());
    if (filters.selectedRating > 0) {
      params.set("rating", filters.selectedRating.toString());
    }
    if (filters.selectedSort) {
      params.set("sort", filters.selectedSort);
    }
    if (page > 1) {
      params.set("page", page.toString());
    }
    return params;
  };

  const handleApplyFilters = () => {
    const nextFilters = {
      selectedCategories,
      priceRange,
      selectedRating,
      selectedSort,
    };
    setAppliedFilters(nextFilters);
    setCurrentPage(1);
    setSearchParams(buildPageParams(1, nextFilters));
  };

  const handleResetFilters = () => {
    const resetFilters = {
      selectedCategories: [] as string[],
      priceRange: [DEFAULT_MIN_PRICE, DEFAULT_MAX_PRICE] as [number, number],
      selectedRating: 0,
      selectedSort: "",
    };
    setSelectedCategories(resetFilters.selectedCategories);
    setPriceRange(resetFilters.priceRange);
    setSelectedRating(resetFilters.selectedRating);
    setSelectedSort(resetFilters.selectedSort);
    setAppliedFilters(resetFilters);
    setCurrentPage(1);
    setSearchParams(buildPageParams(1, resetFilters));
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    setSearchParams(buildPageParams(page, appliedFilters));
  };

  const handleCategoryChange = (categorySlug: string, checked: boolean) => {
    setSelectedCategories((prev) => {
      if (checked) {
        if (prev.includes(categorySlug)) return prev;
        return [...prev, categorySlug];
      } else {
        return prev.filter((slug) => slug !== categorySlug);
      }
    });
  };

  const handlePriceChange = (value: number[]) => {
    setPriceRange([value[0], value[1]]);
  };

  const handleToggleWatchlist = async (
    productId: string,
    e: React.MouseEvent,
  ) => {
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
        prev.map((p) => {
          if (p._id === productId) {
            return {
              ...p,
              watchCount: (p.watchCount || 0) + (isWatched ? 1 : -1),
            };
          }
          return p;
        }),
      );

      // Update local watched state
      setWatchedProductIds((prev) => {
        const next = new Set(prev);
        if (isWatched) {
          next.add(productId);
        } else {
          next.delete(productId);
        }
        return next;
      });

      toast.success(
        isWatched ? "Added to watchlist" : "Removed from watchlist",
      );
    } catch (error) {
      console.error("Failed to toggle watchlist", error);
      toast.error("Failed to update watchlist");
    }
  };

  return (
    <SidebarProvider className="gap-4 min-h-fit">
      <Sidebar
        collapsible="none"
        variant="inset"
        className={cn("border-x bg-transparent w-64 h-[calc(100vh-12rem)]")}
      >
        <Separator />
        <SidebarHeader className="font-bold text-lg">
          <span>Shop by category</span>
        </SidebarHeader>
        <Separator />
        <SidebarContent>
          <ScrollArea>
            <SidebarGroup>
              <button className="flex w-full items-center justify-between text-md font-semibold text-foreground hover:text-primary">
                <span>Categories</span>
              </button>
              <div className="mt-3 space-y-2">
                {categories.map((category) => (
                  <div
                    key={category._id}
                    className="flex items-center space-x-2"
                  >
                    <Checkbox
                      id={category._id}
                      checked={selectedCategories.includes(category.slug)}
                      onCheckedChange={(checked) =>
                        handleCategoryChange(category.slug, checked as boolean)
                      }
                    />
                    <Label
                      htmlFor={category._id}
                      className="cursor-pointer text-sm font-normal text-foreground/80 hover:text-foreground"
                    >
                      {category.name}
                    </Label>
                  </div>
                ))}
              </div>
            </SidebarGroup>
            <Separator />
            <SidebarGroup>
              <button className="flex w-full items-center justify-between text-md font-semibold text-foreground hover:text-primary">
                <span>Price</span>
              </button>
              <div className="mt-3 space-y-3 text-sm">
                <Slider
                  min={0}
                  max={10000}
                  step={10}
                  value={priceRange}
                  onValueChange={handlePriceChange}
                  className="w-full cursor-pointer"
                />
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium">${priceRange[0]}</span>
                  <span className="text-xs font-medium">-</span>
                  <span className="text-xs font-medium">${priceRange[1]}</span>
                </div>
              </div>
            </SidebarGroup>
            <Separator />
            <SidebarGroup>
              <button className="flex w-full items-center justify-between text-md font-semibold text-foreground hover:text-primary">
                <span>Rating</span>
              </button>
              <div className="mt-3 space-y-2">
                {[...ratings].reverse().map((rating) => (
                  <button
                    key={rating}
                    onClick={() => {
                      setSelectedRating(selectedRating === rating ? 0 : rating);
                    }}
                    className={`flex w-full items-center gap-2 rounded py-1 px-2 text-sm transition-colors hover:bg-muted ${
                      selectedRating === rating ? "bg-muted font-semibold" : ""
                    }`}
                  >
                    {[...Array(rating)].map((_, i) => (
                      <Star
                        key={i}
                        className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400"
                      />
                    ))}
                    <span className="text-xs text-foreground/60">& up</span>
                  </button>
                ))}
              </div>
            </SidebarGroup>
            <Separator />
            <SidebarGroup>
              <div className="flex flex-col gap-2 mt-2">
                <Button onClick={handleApplyFilters}>Search</Button>
                <Button variant="outline" onClick={handleResetFilters}>
                  Reset Filters
                </Button>
              </div>
            </SidebarGroup>
            <Separator />
            <ScrollBar orientation="vertical" />
          </ScrollArea>
        </SidebarContent>
        <Separator />
        <SidebarFooter />
        <Separator />
      </Sidebar>
      <SidebarInset className="w-full">
        <div className="flex flex-col gap-6 p-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <h1 className="text-3xl font-bold text-foreground">
              {searchQuery ? `Search Results for "${searchQuery}"` : "Products"}
            </h1>
            <div className="flex items-center gap-2">
              <Select
                value={selectedSort}
                onValueChange={(val) => setSelectedSort(val)}
              >
                <SelectTrigger className="w-[180px] cursor-pointer">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem className="cursor-pointer" value="newest">
                    Newest Arrivals
                  </SelectItem>
                  <SelectItem className="cursor-pointer" value="price_asc">
                    Price: Low to High
                  </SelectItem>
                  <SelectItem className="cursor-pointer" value="price_desc">
                    Price: High to Low
                  </SelectItem>
                  <SelectItem className="cursor-pointer" value="name_asc">
                    Name: A to Z
                  </SelectItem>
                  <SelectItem className="cursor-pointer" value="name_desc">
                    Name: Z to A
                  </SelectItem>
                </SelectContent>
              </Select>
              {searchQuery && (
                <Button
                  variant="outline"
                  onClick={() => setSaveSearchDialogOpen(true)}
                  className="gap-2"
                >
                  <Bookmark className="h-4 w-4" />
                  Save Search
                </Button>
              )}
            </div>
          </div>

          {/* Empty State */}
          {products.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Package className="h-16 w-16 text-muted-foreground mb-4" />
              <h2 className="text-2xl font-semibold text-foreground mb-2">
                No products found
              </h2>
              <p className="text-muted-foreground max-w-sm">
                We couldn&apos;t find any products matching your filters. Try
                adjusting your criteria and see if you can find what you&apos;re
                looking for.
              </p>
            </div>
          ) : (
            <>
              {/* Product Grid */}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {products.map((product) => (
                  <Card
                    key={product._id}
                    className="group flex p-0 flex-col overflow-hidden border-border/50 transition-all hover:border-border hover:shadow-md"
                  >
                    {/* Product Image */}
                    <CardContent className="relative overflow-hidden bg-muted p-0">
                      {/* Promotion Badges */}
                      <PromotionBadges product={product} />

                      <Link to={`/products/${product._id}`}>
                        <img
                          src={product.image || "/placeholder.png"}
                          alt={product.title}
                          className="aspect-square w-full bg-muted flex items-center justify-center"
                        />
                      </Link>
                    </CardContent>

                    {/* Product Info */}
                    <CardHeader className="flex-1 space-y-2">
                      <CardTitle className="line-clamp-2 text-base">
                        <Link to={`/products/${product._id}`}>
                          {product.title}
                        </Link>
                      </CardTitle>
                      {(product as any).variants?.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {(product as any).variants
                            .slice(0, 2)
                            .map((v: any) => (
                              <span
                                key={v.name}
                                className="text-xs bg-muted px-2 py-0.5 rounded-full text-muted-foreground"
                              >
                                {v.name}:{" "}
                                {v.options.map((o: any) => o.value).join(", ")}
                              </span>
                            ))}
                        </div>
                      )}
                      <CardDescription className="line-clamp-2">
                        {product.description}
                      </CardDescription>
                    </CardHeader>

                    {/* Rating & Price */}
                    <div className="space-y-3 px-6 pb-6">
                      {/* Rating */}
                      <div className="flex items-center gap-1">
                        <div className="flex items-center gap-0.5">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`h-3.5 w-3.5 ${
                                i < Math.round(product.averageRating)
                                  ? "fill-yellow-400 text-yellow-400"
                                  : "text-muted-foreground"
                              }`}
                            />
                          ))}
                        </div>
                        <span className="ml-1 text-xs text-foreground/60">
                          ({product.ratingCount})
                        </span>
                      </div>

                      {/* Price & Button */}
                      <div className="flex flex-col gap-2">
                        {/* Deal Info */}
                        {product.promotionType === "daily_deal" && (
                          <div className="flex items-center justify-between text-xs">
                            <DealCountdown endDate={product.dealEndDate} />
                            <DealQuantity
                              quantityLimit={product.dealQuantityLimit}
                              quantitySold={product.dealQuantitySold}
                            />
                          </div>
                        )}

                        {/* Price and Actions */}
                        <div className="flex items-end justify-between gap-2">
                          <PromotionPricing product={product} />
                          <div className="flex gap-4">
                            <Button
                              size={"icon-sm"}
                              variant={"secondary"}
                              className="hover:bg-destructive cursor-pointer hover:text-white gap-1 px-2 w-auto"
                              onClick={(e) =>
                                handleToggleWatchlist(product._id, e)
                              }
                            >
                              <Heart
                                className={cn(
                                  "h-4 w-4",
                                  watchedProductIds.has(product._id)
                                    ? "fill-red-500 text-red-500"
                                    : "",
                                )}
                              />
                            </Button>
                            <Button
                              size="icon-sm"
                              variant={"default"}
                              className="cursor-pointer"
                              onClick={() => navigate(`/products/${product._id}`)}
                            >
                              <ShoppingCart className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
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
      </SidebarInset>

      {/* Save Search Dialog */}
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
    </SidebarProvider>
  );
}
