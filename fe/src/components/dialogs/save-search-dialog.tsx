import { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import axios from "@/lib/axios";
import { toast } from "sonner";

interface SaveSearchDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    searchQuery: string;
    filters: {
        categories?: string[];
        minPrice?: number;
        maxPrice?: number;
        rating?: number;
    };
}

export function SaveSearchDialog({
    open,
    onOpenChange,
    searchQuery,
    filters,
}: SaveSearchDialogProps) {
    const [name, setName] = useState(searchQuery || "My Search");
    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
        if (!searchQuery.trim()) {
            toast.error("Please enter a search query first");
            return;
        }

        try {
            setSaving(true);
            const response = await axios.post("/api/saved-searches", {
                searchQuery,
                filters: {
                    minPrice: filters.minPrice,
                    maxPrice: filters.maxPrice,
                    // Add more filters as needed
                },
                name: name || searchQuery,
            });

            if (response.data.success) {
                toast.success("Search saved successfully!");
                onOpenChange(false);
                setName("");
            }
        } catch (error: any) {
            console.error("Error saving search:", error);
            toast.error(error.response?.data?.message || "Failed to save search");
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Save This Search</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="search-query">Search Query</Label>
                        <Input
                            id="search-query"
                            value={searchQuery}
                            disabled
                            className="bg-gray-50"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="name">Name Your Search</Label>
                        <Input
                            id="name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Enter a name for this search"
                        />
                    </div>
                    {Object.keys(filters).length > 0 && (
                        <div className="space-y-2">
                            <Label>Active Filters</Label>
                            <div className="flex flex-wrap gap-2">
                                {filters.minPrice && (
                                    <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
                                        Min: ${filters.minPrice}
                                    </span>
                                )}
                                {filters.maxPrice && (
                                    <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
                                        Max: ${filters.maxPrice}
                                    </span>
                                )}
                                {filters.rating && (
                                    <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-sm">
                                        Rating: {filters.rating}+ stars
                                    </span>
                                )}
                            </div>
                        </div>
                    )}
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button onClick={handleSave} disabled={saving}>
                        {saving ? "Saving..." : "Save Search"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
