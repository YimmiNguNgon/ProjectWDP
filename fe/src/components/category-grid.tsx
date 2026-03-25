import { Link } from "react-router-dom";
import {
  Tag,
  Shirt,
  Smartphone,
  Laptop,
  Home,
  Dumbbell,
  BookOpen,
  Gamepad2,
  Gem,
  Camera,
  LayoutGrid,
  ArrowRight,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface Category {
  _id: string;
  name: string;
  slug: string;
  imageUrl?: string;
}

interface CategoryGridProps {
  categories: Category[];
  loading?: boolean;
}

const ICON_MAP: [string, LucideIcon][] = [
  ["phone", Smartphone],
  ["mobile", Smartphone],
  ["electronic", Smartphone],
  ["computer", Laptop],
  ["laptop", Laptop],
  ["fashion", Shirt],
  ["cloth", Shirt],
  ["wear", Shirt],
  ["home", Home],
  ["furniture", Home],
  ["decor", Home],
  ["sport", Dumbbell],
  ["fitness", Dumbbell],
  ["book", BookOpen],
  ["education", BookOpen],
  ["game", Gamepad2],
  ["jewel", Gem],
  ["watch", Gem],
  ["camera", Camera],
  ["photo", Camera],
];

function getIcon(name: string): LucideIcon {
  const lower = name.toLowerCase();
  for (const [key, Icon] of ICON_MAP) {
    if (lower.includes(key)) return Icon;
  }
  return Tag;
}

export function CategoryGrid({ categories, loading = false }: CategoryGridProps) {
  const displayed = categories.slice(0, 8);

  return (
    <div className="w-full h-full flex flex-col gap-3 p-5 bg-gradient-to-br from-slate-50 to-indigo-50/40 rounded-2xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-primary/10 rounded-lg">
            <LayoutGrid className="w-4 h-4 text-primary" />
          </div>
          <span className="text-sm font-semibold text-foreground">Shop by Category</span>
        </div>
        <Link
          to="/products"
          className="flex items-center gap-1 text-xs text-primary hover:text-primary/70 font-medium transition-colors"
        >
          View all <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-4 gap-2 flex-1">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="aspect-square rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : displayed.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-muted-foreground text-sm">No categories available</p>
        </div>
      ) : (
        <div className="grid grid-cols-4 gap-2 flex-1 content-start">
          {displayed.map((cat) => {
            const FallbackIcon = getIcon(cat.name);
            return (
              <Link
                key={cat._id}
                to={`/products?categories=${cat.slug}`}
                className="group flex flex-col items-center gap-1.5 p-2 rounded-xl bg-white border border-border/50 hover:border-primary/40 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer"
              >
                {/* Image / Icon */}
                <div className="w-full aspect-square rounded-lg overflow-hidden bg-muted flex items-center justify-center">
                  {cat.imageUrl ? (
                    <img
                      src={cat.imageUrl}
                      alt={cat.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-primary/20">
                      <FallbackIcon className="w-6 h-6 text-primary/70" />
                    </div>
                  )}
                </div>
                {/* Name */}
                <span className="text-[11px] font-medium text-center text-foreground line-clamp-1 group-hover:text-primary transition-colors leading-tight w-full">
                  {cat.name}
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
