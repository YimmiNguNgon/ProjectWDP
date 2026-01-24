import { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { updateProduct, type Product } from '@/api/seller-products';
import { toast } from 'sonner';
import ProductVariantsManager from '@/components/seller/product-variants-manager';

interface EditProductDialogProps {
    product: Product;
    open: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export default function EditProductDialog({
    product,
    open,
    onClose,
    onSuccess,
}: EditProductDialogProps) {
    const [formData, setFormData] = useState({
        title: product.title,
        description: product.description,
        price: product.price,
        quantity: product.quantity,
        condition: product.condition,
        lowStockThreshold: product.lowStockThreshold || 5,
        variants: product.variants || [],
    });
    const [loading, setLoading] = useState(false);


    useEffect(() => {
        setFormData({
            title: product.title,
            description: product.description,
            price: product.price,
            quantity: product.quantity,
            condition: product.condition,
            lowStockThreshold: product.lowStockThreshold || 5,
            variants: product.variants || [],
        });
    }, [product]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            await updateProduct(product._id, formData);
            toast.success('Product updated successfully');
            onSuccess();
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Failed to update product');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Edit Product</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <Label htmlFor="title">Title *</Label>
                        <Input
                            id="title"
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            required
                        />
                    </div>

                    {/* Product Image */}
                    <div>
                        <Label>Product Image</Label>
                        <div className="mt-2">
                            {product.image && (
                                <div className="relative inline-block">
                                    <img
                                        src={product.image}
                                        alt={product.title}
                                        className="w-32 h-32 object-cover rounded-lg border"
                                    />
                                    <p className="text-xs text-gray-500 mt-1">
                                        Current image (upload feature coming soon)
                                    </p>
                                </div>
                            )}
                            {!product.image && (
                                <div className="w-32 h-32 bg-gray-100 rounded-lg border flex items-center justify-center">
                                    <p className="text-xs text-gray-400">No image</p>
                                </div>
                            )}
                        </div>
                    </div>

                    <div>
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                            id="description"
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            rows={4}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="price">Price ($) *</Label>
                            <Input
                                id="price"
                                type="number"
                                step="0.01"
                                min="0"
                                value={formData.price}
                                onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) })}
                                required
                            />
                        </div>

                        <div>
                            <Label htmlFor="quantity">Quantity *</Label>
                            <Input
                                id="quantity"
                                type="number"
                                min="0"
                                value={formData.quantity}
                                onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) })}
                                required
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="condition">Condition</Label>
                            <Input
                                id="condition"
                                value={formData.condition}
                                onChange={(e) => setFormData({ ...formData, condition: e.target.value })}
                                placeholder="e.g., New, Used, Refurbished"
                            />
                        </div>

                        <div>
                            <Label htmlFor="lowStockThreshold">Low Stock Alert Threshold</Label>
                            <Input
                                id="lowStockThreshold"
                                type="number"
                                min="0"
                                value={formData.lowStockThreshold}
                                onChange={(e) =>
                                    setFormData({ ...formData, lowStockThreshold: parseInt(e.target.value) })
                                }
                            />
                        </div>
                    </div>

                    <div>
                        <Label>Product Variants</Label>
                        <ProductVariantsManager
                            variants={formData.variants}
                            onChange={(variants: import('@/api/seller-products').ProductVariant[]) => setFormData({ ...formData, variants })}
                        />
                    </div>

                    <div className="flex justify-end gap-2 pt-4">
                        <Button type="button" variant="outline" onClick={onClose}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading ? 'Saving...' : 'Save Changes'}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
