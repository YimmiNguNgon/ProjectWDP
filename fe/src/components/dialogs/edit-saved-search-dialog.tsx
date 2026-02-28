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

interface EditSavedSearchDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    savedSearch: {
        _id: string;
        name: string;
        searchQuery: string;
    } | null;
    onSave: (id: string, name: string) => void;
}

export function EditSavedSearchDialog({
    open,
    onOpenChange,
    savedSearch,
    onSave,
}: EditSavedSearchDialogProps) {
    const [name, setName] = useState(savedSearch?.name || "");

    const handleSave = () => {
        if (savedSearch) {
            onSave(savedSearch._id, name);
            onOpenChange(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Edit Saved Search</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="search-query">Search Query</Label>
                        <Input
                            id="search-query"
                            value={savedSearch?.searchQuery || ""}
                            disabled
                            className="bg-gray-50"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="name">Name</Label>
                        <Input
                            id="name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Enter search name"
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button onClick={handleSave}>Save</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
