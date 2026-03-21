import { useState, useEffect } from "react";
import { Trash2, Store, ExternalLink } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import axios from "@/lib/axios";
import { toast } from "sonner";

interface SavedSeller {
  _id: string;
  username: string;
  email: string;
  avatarUrl?: string;
  reputationScore: number;
  productCount: number;
}

export default function SavedSellersPage() {
  const [savedSellers, setSavedSellers] = useState<SavedSeller[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchSavedSellers();
  }, []);

  const fetchSavedSellers = async () => {
    try {
      const response = await axios.get("/api/saved-sellers");
      if (response.data.success) {
        setSavedSellers(response.data.data);
      }
    } catch {
      toast.error("Unable to load saved sellers");
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveSeller = async (sellerId: string) => {
    try {
      const response = await axios.delete(`/api/saved-sellers/${sellerId}`);
      if (response.data.success) {
        setSavedSellers((prev) => prev.filter((s) => s._id !== sellerId));
        toast.success("Seller removed from saved list");
      }
    } catch {
      toast.error("Unable to remove saved seller");
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-xl border shadow-sm p-4 animate-pulse">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-muted" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-muted rounded w-1/3" />
                <div className="h-3 bg-muted rounded w-1/2" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (savedSellers.length === 0) {
    return (
      <div className="bg-white rounded-xl border shadow-sm p-16 text-center">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
          <Store className="w-8 h-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold mb-1">No saved sellers yet</h3>
        <p className="text-muted-foreground text-sm mb-4">
          Follow your favorite sellers to quickly find their products
        </p>
        <Button onClick={() => navigate("/products")}>Browse Products</Button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">
          Saved Sellers
          <span className="ml-2 text-sm font-normal text-muted-foreground">
            ({savedSellers.length})
          </span>
        </h2>
      </div>

      <div className="space-y-3">
        {savedSellers.map((seller) => (
          <div
            key={seller._id}
            className="bg-white rounded-xl border shadow-sm p-4 flex items-center gap-4 hover:shadow-md hover:border-primary/20 transition-all"
          >
            {/* Avatar */}
            <Avatar className="h-12 w-12 shrink-0">
              <AvatarImage src={seller.avatarUrl} alt={seller.username} />
              <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                {seller.username.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-sm truncate">{seller.username}</h3>
              <p className="text-xs text-muted-foreground truncate">{seller.email}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-muted-foreground">Reputation:</span>
                <span className={`text-xs font-semibold ${
                  seller.reputationScore >= 80 ? "text-emerald-600" :
                  seller.reputationScore >= 50 ? "text-amber-600" : "text-red-500"
                }`}>
                  {seller.reputationScore}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 shrink-0">
              <Button
                size="sm"
                variant="outline"
                onClick={() => navigate(`/seller/${seller._id}`)}
              >
                <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                View Shop
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                onClick={() => handleRemoveSeller(seller._id)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
