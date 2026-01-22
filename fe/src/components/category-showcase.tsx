import React, { useEffect, useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import api from "@/lib/axios";

interface Category {
  _id: string;
  name: string;
  slug: string;
  imageUrl?: string;
}

interface CategoryShowcaseProps {
  title?: string;
  className?: string;
}

// Memoized category item component for flex layout
const FlexCategoryItem = React.memo(
  ({
    category,
    navigate,
  }: {
    category: Category;
    navigate: ReturnType<typeof useNavigate>;
  }) => (
    <div
      onClick={() => navigate(`/products?categories=${category.slug}`)}
      className="w-full flex flex-col items-center group cursor-pointer"
    >
      <div className="aspect-square bg-muted rounded-full flex items-center justify-center overflow-hidden transition-transform group-hover:scale-105 w-full will-change-transform">
        {category.imageUrl ? (
          <img
            src={category.imageUrl}
            alt={category.name}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <span className="text-4xl font-bold text-muted-foreground">
            {category.name.charAt(0).toUpperCase()}
          </span>
        )}
      </div>
      <figcaption className="text-muted-foreground pt-2 text-sm text-center mt-2 line-clamp-2 group-hover:text-foreground transition-colors">
        {category.name}
      </figcaption>
    </div>
  ),
);

FlexCategoryItem.displayName = "FlexCategoryItem";

// Memoized category item component for carousel
const CarouselCategoryItem = React.memo(
  ({
    category,
    navigate,
  }: {
    category: Category;
    navigate: ReturnType<typeof useNavigate>;
  }) => (
    <CarouselItem className="basis-1/2 sm:basis-1/3 md:basis-1/4 lg:basis-1/5">
      <div
        onClick={() => navigate(`/products?categories=${category.slug}`)}
        className="flex flex-col items-center group h-full cursor-pointer"
      >
        <div className="aspect-square bg-muted rounded-full flex items-center justify-center overflow-hidden transition-transform group-hover:scale-100 w-[85%] will-change-transform">
          {category.imageUrl ? (
            <img
              src={category.imageUrl}
              alt={category.name}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          ) : (
            <span className="text-4xl font-bold text-muted-foreground">
              {category.name.charAt(0).toUpperCase()}
            </span>
          )}
        </div>
        <figcaption className="text-muted-foreground pt-2 text-md text-center mt-2 line-clamp-2 group-hover:text-foreground transition-colors">
          {category.name}
        </figcaption>
      </div>
    </CarouselItem>
  ),
);

CarouselCategoryItem.displayName = "CarouselCategoryItem";

export function CategoryShowcase({
  title = "Trending on eBay",
  className = "",
}: CategoryShowcaseProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setLoading(true);
        const res = await api.get("/api/categories");
        setCategories(res.data.data || []);
      } catch (error) {
        console.error("Failed to fetch categories:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchCategories();
  }, []);

  // Show skeleton only if loading AND no categories yet
  if (loading && categories.length === 0) {
    return (
      <section className={`flex flex-col gap-4 ${className}`}>
        <h1 className="text-2xl font-bold">{title}</h1>
        <div className="flex gap-4">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="w-full animate-pulse">
              <div className="aspect-square bg-muted rounded-full" />
              <div className="h-4 bg-muted rounded mt-4" />
            </div>
          ))}
        </div>
      </section>
    );
  }

  // If no categories, don't render
  if (categories.length === 0) {
    return null;
  }

  // If 5 or fewer categories, show them in a flex layout
  if (categories.length <= 5) {
    return (
      <section className={`flex flex-col gap-4 ${className}`}>
        <h1 className="text-2xl font-bold">{title}</h1>
        <div className="flex gap-4">
          {categories.map((category) => (
            <FlexCategoryItem
              key={category._id}
              category={category}
              navigate={navigate}
            />
          ))}
        </div>
      </section>
    );
  }

  // If more than 5 categories, show as carousel
  return (
    <section className={`flex flex-col gap-4 ${className}`}>
      <h1 className="text-2xl font-bold">{title}</h1>
      <Carousel className="relative">
        <CarouselContent>
          {categories.map((category) => (
            <CarouselCategoryItem
              key={category._id}
              category={category}
              navigate={navigate}
            />
          ))}
        </CarouselContent>
        <div className="absolute right-0 bottom-0 flex gap-2">
          <CarouselPrevious
            size={"icon"}
            className="static translate-0 cursor-pointer"
          />
          <CarouselNext
            size={"icon"}
            className="static translate-0 cursor-pointer"
          />
        </div>
      </Carousel>
    </section>
  );
}
