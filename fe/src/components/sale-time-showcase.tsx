import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import api from "@/lib/axios";
import {
  PromotionBadges,
  PromotionPricing,
  DealCountdown,
} from "@/components/promotion/promotion-display";

interface SaleProduct {
  _id: string;
  title: string;
  image?: string;
  images?: string[];
  price: number;
  originalPrice?: number | null;
  discountPercent?: number | null;
  promotionType?: "normal" | "outlet" | "daily_deal";
  dealEndDate?: string | null;
}

export function SaleTimeShowcase() {
  const [products, setProducts] = useState<SaleProduct[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchSaleProducts = async () => {
      try {
        setLoading(true);
        const res = await api.get("/api/products", {
          params: { saleOnly: true, limit: 8, page: 1, sort: "newest" },
        });
        setProducts(res.data?.data || []);
      } catch (error) {
        console.error("Failed to load sale products:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchSaleProducts();
  }, []);

  if (loading && products.length === 0) {
    return (
      <section className="space-y-4">
        <h2 className="text-2xl font-bold">Sale Time</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-64 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      </section>
    );
  }

  if (products.length === 0) {
    return null;
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Sale Time</h2>
        <Link to="/products?saleOnly=true">
          <Button variant="outline">View all</Button>
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {products.map((product) => (
          <Card key={product._id} className="overflow-hidden border-border/60">
            <CardContent className="p-0">
              <div className="relative bg-muted">
                <PromotionBadges product={product} />
                <Link to={`/products/${product._id}`}>
                  <img
                    src={product.image || product.images?.[0] || "/placeholder.png"}
                    alt={product.title}
                    className="aspect-square w-full object-cover"
                  />
                </Link>
              </div>
              <div className="space-y-2 p-4">
                <Link
                  to={`/products/${product._id}`}
                  className="line-clamp-2 text-sm font-semibold hover:underline"
                >
                  {product.title}
                </Link>
                <PromotionPricing product={product} />
                <DealCountdown endDate={product.dealEndDate || undefined} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
