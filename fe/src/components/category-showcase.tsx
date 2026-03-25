import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { FaGrip } from "react-icons/fa6";
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

const CategoryCard = React.memo(
  ({
    category,
    navigate,
  }: {
    category: Category;
    navigate: ReturnType<typeof useNavigate>;
  }) => (
    <div
      onClick={() => navigate(`/products?categories=${category.slug}`)}
      className="group flex flex-col items-center gap-3 cursor-pointer"
    >
      <div className="w-full aspect-square rounded-2xl overflow-hidden bg-muted shadow-sm group-hover:shadow-md transition-all duration-200 group-hover:-translate-y-1 border border-border/40">
        {category.imageUrl ? (
          <img
            src={category.imageUrl}
            alt={category.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-primary/20">
            <span className="text-3xl font-bold text-primary/50">
              {category.name.charAt(0).toUpperCase()}
            </span>
          </div>
        )}
      </div>
      <p className="text-sm font-medium text-center text-foreground line-clamp-1 group-hover:text-primary transition-colors">
        {category.name}
      </p>
    </div>
  ),
);

CategoryCard.displayName = "CategoryCard";

export function CategoryShowcase({
  title = "Shop by Category",
  className = "",
}: CategoryShowcaseProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    api
      .get("/api/categories")
      .then((r) => setCategories(r.data.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading && categories.length === 0) {
    return (
      <section className={`flex flex-col gap-5 ${className}`}>
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-primary/10 rounded-xl">
            <FaGrip className="w-4 h-4 text-primary" />
          </div>
          <div className="h-7 w-40 bg-muted rounded animate-pulse" />
        </div>
        <div className="grid grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex flex-col gap-3">
              <div className="aspect-square bg-muted rounded-2xl animate-pulse" />
              <div className="h-4 bg-muted rounded w-3/4 mx-auto animate-pulse" />
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (categories.length === 0) return null;

  const COLS = Math.min(categories.length, 6);
  const useCarousel = categories.length > 6;

  return (
    <section className={`flex flex-col gap-5 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-primary/10 rounded-xl">
            <FaGrip className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">{title}</h2>
            <p className="text-xs text-muted-foreground">Browse products by category</p>
          </div>
        </div>
      </div>

      {useCarousel ? (
        <Carousel className="relative">
          <CarouselContent>
            {categories.map((category) => (
              <CarouselItem
                key={category._id}
                className="basis-1/3 sm:basis-1/4 md:basis-1/5 lg:basis-1/6"
              >
                <CategoryCard category={category} navigate={navigate} />
              </CarouselItem>
            ))}
          </CarouselContent>
          <div className="absolute -top-10 right-0 flex gap-2">
            <CarouselPrevious size="icon" className="static translate-0 cursor-pointer" />
            <CarouselNext size="icon" className="static translate-0 cursor-pointer" />
          </div>
        </Carousel>
      ) : (
        <div className={`grid gap-4`} style={{ gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))` }}>
          {categories.map((category) => (
            <CategoryCard key={category._id} category={category} navigate={navigate} />
          ))}
        </div>
      )}
    </section>
  );
}
