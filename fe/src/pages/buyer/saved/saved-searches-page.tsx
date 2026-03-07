import { useState, useEffect } from "react";
import { Trash2, Search, ExternalLink, Edit2, Package } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import axios from "@/lib/axios";
import { toast } from "sonner";
import { EditSavedSearchDialog } from "@/components/dialogs/edit-saved-search-dialog";

interface SearchFilter {
    categoryId?: string;
    minPrice?: number;
    maxPrice?: number;
    condition?: string;
    sortBy?: string;
}

interface SavedSearch {
    _id: string;
    searchQuery: string;
    filters: SearchFilter;
    name: string;
    productCount: number;
    lastChecked: string;
    createdAt: string;
}

export default function SavedSearchesPage() {
    const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
    const [loading, setLoading] = useState(true);
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [selectedSearch, setSelectedSearch] = useState<SavedSearch | null>(
        null
    );
    const navigate = useNavigate();

    useEffect(() => {
        fetchSavedSearches();
    }, []);

    const fetchSavedSearches = async () => {
        try {
            const response = await axios.get("/api/saved-searches");
            if (response.data.success) {
                const searches = response.data.data;
                setSavedSearches(searches);

                // Update product counts for each search
                searches.forEach((search: SavedSearch) => {
                    updateProductCount(search._id);
                });
            }
        } catch (error) {
            console.error("Error fetching saved searches:", error);
            toast.error("Unable to load saved searches");
        } finally {
            setLoading(false);
        }
    };

    const updateProductCount = async (searchId: string) => {
        try {
            const response = await axios.get(`/api/saved-searches/${searchId}/count`);
            if (response.data.success) {
                setSavedSearches((prev) =>
                    prev.map((s) =>
                        s._id === searchId
                            ? { ...s, productCount: response.data.data.count }
                            : s
                    )
                );
            }
        } catch (error) {
            console.error("Error updating product count:", error);
        }
    };

    const handleDeleteSearch = async (id: string) => {
        try {
            const response = await axios.delete(`/api/saved-searches/${id}`);
            if (response.data.success) {
                setSavedSearches(savedSearches.filter((s) => s._id !== id));
                toast.success("Saved search deleted");
            }
        } catch (error) {
            console.error("Error deleting saved search:", error);
            toast.error("Unable to delete saved search");
        }
    };

    const handleEditSearch = (search: SavedSearch) => {
        setSelectedSearch(search);
        setEditDialogOpen(true);
    };

    const handleSaveEdit = async (id: string, name: string) => {
        try {
            const response = await axios.put(`/api/saved-searches/${id}`, { name });
            if (response.data.success) {
                setSavedSearches((prev) =>
                    prev.map((s) => (s._id === id ? { ...s, name } : s))
                );
                toast.success("Saved search updated");
            }
        } catch (error) {
            console.error("Error updating saved search:", error);
            toast.error("Unable to update saved search");
        }
    };

    const handleRunSearch = (search: SavedSearch) => {
        const params = new URLSearchParams();
        if (search.searchQuery) params.set("q", search.searchQuery);
        if (search.filters.categoryId)
            params.set("category", search.filters.categoryId);
        if (search.filters.minPrice)
            params.set("minPrice", search.filters.minPrice.toString());
        if (search.filters.maxPrice)
            params.set("maxPrice", search.filters.maxPrice.toString());
        if (search.filters.condition)
            params.set("condition", search.filters.condition);
        if (search.filters.sortBy) params.set("sortBy", search.filters.sortBy);

        navigate(`/products?${params.toString()}`);
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
                <h1 className="text-3xl font-bold mb-6">Saved Searches</h1>

                {savedSearches.length === 0 ? (
                    <Card className="p-12 text-center">
                        <Search className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                        <h3 className="text-xl font-semibold mb-2">
                            No saved searches yet
                        </h3>
                        <p className="text-gray-600 mb-4">
                            Save your searches to quickly find items you're looking for
                        </p>
                        <Button onClick={() => navigate("/products")}>
                            Browse Products
                        </Button>
                    </Card>
                ) : (
                    <div className="space-y-4">
                        {savedSearches.map((search) => (
                            <Card key={search._id} className="p-6">
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            <h3 className="text-lg font-semibold">{search.name}</h3>
                                            <Badge variant="secondary" className="flex items-center gap-1">
                                                <Package className="w-3 h-3" />
                                                {search.productCount} products
                                            </Badge>
                                        </div>
                                        <p className="text-gray-600 mb-3">
                                            Search: "{search.searchQuery}"
                                        </p>

                                        {Object.keys(search.filters).length > 0 && (
                                            <div className="flex flex-wrap gap-2 mb-3">
                                                {search.filters.minPrice && (
                                                    <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
                                                        Min: ${search.filters.minPrice}
                                                    </span>
                                                )}
                                                {search.filters.maxPrice && (
                                                    <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
                                                        Max: ${search.filters.maxPrice}
                                                    </span>
                                                )}
                                                {search.filters.condition && (
                                                    <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm">
                                                        {search.filters.condition}
                                                    </span>
                                                )}
                                            </div>
                                        )}

                                        <p className="text-sm text-gray-500">
                                            Saved on{" "}
                                            {new Date(search.createdAt).toLocaleDateString()}
                                        </p>
                                    </div>

                                    <div className="flex gap-2 ml-4">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleRunSearch(search)}
                                        >
                                            <ExternalLink className="w-4 h-4 mr-2" />
                                            Run Search
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleEditSearch(search)}
                                        >
                                            <Edit2 className="w-4 h-4" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleDeleteSearch(search._id)}
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

            <EditSavedSearchDialog
                open={editDialogOpen}
                onOpenChange={setEditDialogOpen}
                savedSearch={selectedSearch}
                onSave={handleSaveEdit}
            />
        </div>
    );
}

