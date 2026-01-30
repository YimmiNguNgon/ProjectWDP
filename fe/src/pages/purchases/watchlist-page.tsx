import { useEffect, useState } from "react";
import {
  type WatchlistItem,
  getUserWatchlist,
  toggleWatchlist,
} from "@/api/watchlist";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { formatUsd } from "@/lib/utils";
import { Heart, Trash2 } from "lucide-react";

export default function WatchlistPage() {
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchWatchlist = async () => {
    try {
      setLoading(true);
      const res = await getUserWatchlist();
      setWatchlist(res.data.data);
    } catch (err) {
      console.error("Failed to load watchlist", err);
      toast.error("Failed to load watchlist");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWatchlist();
  }, []);

  const handleRemoveFromWatchlist = async (
    productId: string,
    event: React.MouseEvent,
  ) => {
    event.stopPropagation(); // Prevent clicking on card
    try {
      await toggleWatchlist(productId);
      toast.success("Removed from watchlist");
      // Remove from local state
      setWatchlist((prev) =>
        prev.filter((item) => item.product._id !== productId),
      );
    } catch (err) {
      console.error("Failed to remove from watchlist", err);
      toast.error("Failed to remove from watchlist");
    }
  };

  const handleNavigateToProduct = (productId: string) => {
    navigate(`/products/${productId}`);
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        Loading watchlist...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Watchlist</h1>
        <div className="text-muted-foreground text-sm">
          {watchlist.length} items
        </div>
      </div>

      {watchlist.length === 0 ? (
        <div className="text-center py-12 border rounded-lg bg-muted/10">
          <Heart className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Your watchlist is empty
          </h3>
          <p className="text-gray-600 mb-6">
            Keep track of items you're interested in by adding them to your
            watchlist.
          </p>
          <Button
            className="cursor-pointer"
            onClick={() => navigate("/products")}
          >
            Browse Products
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {watchlist.map((item) => {
            const product = item.product;
            if (!product) return null; // Handle case where product might be deleted

            return (
              <Card
                key={item._id}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => handleNavigateToProduct(product._id)}
              >
                <CardContent className="p-4 flex gap-6">
                  {/* Image */}
                  <div className="h-32 w-32 shrink-0 border rounded-md overflow-hidden bg-muted">
                    {product.image ||
                    (product.images && product.images.length > 0) ? (
                      <img
                        src={product.image || product.images?.[0]}
                        alt={product.title}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center text-xs text-muted-foreground">
                        No Image
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 flex flex-col justify-between">
                    <div>
                      <h3 className="font-medium text-lg leading-tight mb-1 hover:underline text-blue-700">
                        {product.title}
                      </h3>
                      {product.condition && (
                        <div className="text-sm text-muted-foreground mb-2">
                          Condition: {product.condition}
                        </div>
                      )}
                      <div className="text-xs text-muted-foreground">
                        Sold by:{" "}
                        {product.sellerId?.username || "Unknown Seller"}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {product.watchCount} watchers
                      </div>
                    </div>
                  </div>

                  {/* Price and Actions */}
                  <div className="flex flex-col items-end justify-between min-w-[150px]">
                    <div className="text-xl font-bold">
                      {formatUsd(product.price)}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive cursor-pointer hover:text-destructive hover:bg-destructive/10 gap-2"
                      onClick={(e) => handleRemoveFromWatchlist(product._id, e)}
                    >
                      <Trash2 className="h-4 w-4" />
                      Remove
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
