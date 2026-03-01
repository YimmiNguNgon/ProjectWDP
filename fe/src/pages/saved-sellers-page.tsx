import { useState, useEffect } from "react";
import { Trash2, Store, ExternalLink, Package } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
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
    const [sortBy, setSortBy] = useState("newest");
    const navigate = useNavigate();

    useEffect(() => {
        fetchSavedSellers();
    }, [sortBy]);

    const fetchSavedSellers = async () => {
        try {
            const response = await axios.get("/api/saved-sellers", {
                params: { sortBy },
            });
            if (response.data.success) {
                setSavedSellers(response.data.data);
            }
        } catch (error) {
            console.error("Error fetching saved sellers:", error);
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
        } catch (error) {
            console.error("Error removing saved seller:", error);
            toast.error("Unable to remove saved seller");
        }
    };

    const handleViewSeller = (sellerId: string) => {
        // Navigate to products filtered by this seller
        navigate(`/products?seller=${sellerId}`);
    };

    if (loading) {
        return (
            <div className="container mx-auto px-4 py-8">
                <div className="animate-pulse space-y-4">
                    <div className="h-8 bg-gray-200 rounded w-1/4"></div>
                    <div className="h-32 bg-gray-200 rounded"></div>
                    <div className="h-32 bg-gray-200 rounded"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="max-w-4xl mx-auto">
                <div className="flex items-center justify-between mb-6">
                    <h1 className="text-3xl font-bold">Saved Sellers</h1>

                    {savedSellers.length > 0 && (
                        <Select value={sortBy} onValueChange={setSortBy}>
                            <SelectTrigger className="w-[200px]">
                                <SelectValue placeholder="Sort by" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="newest">Newest Follow</SelectItem>
                                <SelectItem value="rating">Highest Rating</SelectItem>
                                <SelectItem value="products">Most Products</SelectItem>
                            </SelectContent>
                        </Select>
                    )}
                </div>

                {savedSellers.length === 0 ? (
                    <Card className="p-12 text-center">
                        <Store className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                        <h3 className="text-xl font-semibold mb-2">No saved sellers yet</h3>
                        <p className="text-gray-600 mb-4">
                            Save your favorite sellers to quickly find their items
                        </p>
                        <Button onClick={() => navigate("/products")}>
                            Browse Products
                        </Button>
                    </Card>
                ) : (
                    <div className="space-y-4">
                        {savedSellers.map((seller) => (
                            <Card key={seller._id} className="p-6">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4 flex-1">
                                        <Avatar className="w-16 h-16">
                                            <AvatarImage
                                                src={seller.avatarUrl || "/default-avatar.png"}
                                                alt={seller.username}
                                            />
                                            <AvatarFallback>
                                                {seller.username.substring(0, 2).toUpperCase()}
                                            </AvatarFallback>
                                        </Avatar>

                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <h3 className="text-lg font-semibold">
                                                    {seller.username}
                                                </h3>
                                                <Badge variant="secondary" className="flex items-center gap-1">
                                                    <Package className="w-3 h-3" />
                                                    {seller.productCount} products
                                                </Badge>
                                            </div>
                                            <p className="text-gray-600 text-sm mb-2">
                                                {seller.email}
                                            </p>
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm text-gray-500">
                                                    Reputation:
                                                </span>
                                                <Badge
                                                    variant={
                                                        seller.reputationScore >= 80
                                                            ? "default"
                                                            : seller.reputationScore >= 50
                                                                ? "secondary"
                                                                : "outline"
                                                    }
                                                >
                                                    {seller.reputationScore}
                                                </Badge>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex gap-2 ml-4">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleViewSeller(seller._id)}
                                        >
                                            <ExternalLink className="w-4 h-4 mr-2" />
                                            View Shop
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleRemoveSeller(seller._id)}
                                        >
                                            <Trash2 className="w-4 h-4 text-red-500" />
                                        </Button>
                                    </div>
                                </div>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

