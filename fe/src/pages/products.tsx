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
import { useDebounce } from "@/hooks/use-debounce";
import api from "@/lib/axios";
import { cn } from "@/lib/utils";
import { Heart, ShoppingCart, Star, Package } from "lucide-react";
import React, { useEffect } from "react";
import { Link } from "react-router-dom";

interface Category {
  _id: string;
  name: string;
  slug: string;
}

const ratings = [1, 2, 3, 4, 5];

export interface Product {
  _id: string;
  sellerId: string;
  title: string;
  imageUrl: string;
  description: string;
  price: number;
  stock: number;
  averageRating: number;
  ratingCount: number;
  categories?: Category[];
  createdAt: Date;
  __v: number;
}

export default function ProductsPage() {
  const [products, setProducts] = React.useState<Product[]>([]);
  const [categories, setCategories] = React.useState<Category[]>([]);
  const [selectedCategories, setSelectedCategories] = React.useState<string[]>(
    [],
  );
  const [priceRange, setPriceRange] = React.useState<[number, number]>([
    0, 10000,
  ]);
  const [currentPage, setCurrentPage] = React.useState(1);
  const [totalPages, setTotalPages] = React.useState(1);
  const itemsPerPage = 10;

  const debouncedPriceRange = useDebounce(priceRange, 300);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await api.get("/api/v1/categories");
        setCategories(res.data.data || []);
      } catch (error) {
        console.error("Failed to fetch categories:", error);
      }
    };
    fetchCategories();
  }, []);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const params = new URLSearchParams();
        params.append("page", currentPage.toString());
        params.append("limit", itemsPerPage.toString());
        params.append("categories", selectedCategories.join(","));

        params.append("minPrice", debouncedPriceRange[0].toString());
        params.append("maxPrice", debouncedPriceRange[1].toString());
        const res = await api.get(`/api/v1/products?${params.toString()}`);
        setProducts(res.data.data);
        setTotalPages(Math.ceil((res.data.total || 0) / itemsPerPage));
      } catch (error) {
        console.error("Failed to fetch products:", error);
      }
    };
    fetchProducts();
  }, [selectedCategories, currentPage, debouncedPriceRange]);

  const handleCategoryChange = (categorySlug: string, checked: boolean) => {
    setCurrentPage(1);
    setSelectedCategories((prev) => {
      if (checked) {
        return [...prev, categorySlug];
      } else {
        return prev.filter((slug) => slug !== categorySlug);
      }
    });
  };

  const handlePriceChange = (value: number[]) => {
    setCurrentPage(1);
    setPriceRange([value[0], value[1]]);
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
                {ratings.map((rating) => (
                  <button
                    key={rating}
                    className={`flex w-full items-center gap-2 rounded py-1 text-sm transition-colors`}
                  >
                    {[...Array(rating)].map((_, i) => (
                      <Star
                        key={i}
                        className="h-3 w-3 fill-yellow-400 text-yellow-400"
                      />
                    ))}
                    <span className="text-xs text-foreground/60">& up</span>
                  </button>
                ))}
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
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-foreground">Products</h1>
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
                      <Link to={`/products/${product._id}`}>
                        <img
                          src={product.imageUrl}
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
                      <CardDescription>{product.description}</CardDescription>
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
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-lg font-bold text-foreground">
                          ${product.price}
                        </p>
                        <div className="flex gap-4">
                          <Button
                            size={"icon-sm"}
                            variant={"secondary"}
                            className="hover:bg-destructive hover:text-white"
                          >
                            <Heart />
                          </Button>
                          <Button size="icon-sm" variant={"default"}>
                            <ShoppingCart className="h-4 w-4" />
                          </Button>
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
                  onPageChange={setCurrentPage}
                />
              )}
            </>
          )}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
