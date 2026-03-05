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

const numericInputClass =
    "h-12 text-base font-semibold tracking-wide transition-[box-shadow,border-color,background-color] duration-200 focus-visible:shadow-sm focus-visible:ring-2 focus-visible:ring-blue-200";

export default function EditProductDialog({
    product,
    open,
    onClose,
    onSuccess,
}: EditProductDialogProps) {
    const toInputDateTime = (value?: string | null) => {
        if (!value) return "";
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return "";
        const offset = date.getTimezoneOffset();
        const local = new Date(date.getTime() - offset * 60000);
        return local.toISOString().slice(0, 16);
    };

    const [formData, setFormData] = useState({
        title: product.title,
        description: product.description,
        price: product.basePrice ?? product.originalPrice ?? product.price,
        saleEnabled: Boolean(product.promotionType === "daily_deal" || product.salePrice),
        salePrice: product.salePrice ?? product.price,
        saleStartDate: toInputDateTime(product.saleStartDate ?? product.dealStartDate),
        saleEndDate: toInputDateTime(product.saleEndDate ?? product.dealEndDate),
        quantity: product.quantity,
        condition: product.condition,
        lowStockThreshold: product.lowStockThreshold || 5,
        variants: product.variants || [],
        variantCombinations: product.variantCombinations || [],
    });
    const [loading, setLoading] = useState(false);


    useEffect(() => {
        setFormData({
            title: product.title,
            description: product.description,
            price: product.basePrice ?? product.originalPrice ?? product.price,
            saleEnabled: Boolean(product.promotionType === "daily_deal" || product.salePrice),
            salePrice: product.salePrice ?? product.price,
            saleStartDate: toInputDateTime(product.saleStartDate ?? product.dealStartDate),
            saleEndDate: toInputDateTime(product.saleEndDate ?? product.dealEndDate),
            quantity: product.quantity,
            condition: product.condition,
            lowStockThreshold: product.lowStockThreshold || 5,
            variants: product.variants || [],
            variantCombinations: product.variantCombinations || [],
        });
    }, [product]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (formData.saleEnabled) {
            if (!formData.salePrice || !formData.saleStartDate || !formData.saleEndDate) {
                toast.error("Please fill sale price and sale time range");
                return;
            }
            if (Number(formData.salePrice) >= Number(formData.price)) {
                toast.error("Sale price must be lower than base price");
                return;
            }
        }
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
                                className={numericInputClass}
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
                                className={numericInputClass}
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
                                className={numericInputClass}
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
                            variantCombinations={formData.variantCombinations}
                            basePrice={Number(formData.price) || 0}
                            onCombinationsChange={(variantCombinations) =>
                                setFormData({ ...formData, variantCombinations })
                            }
                        />
                    </div>

                    <div className="space-y-3 rounded-lg border border-dashed border-red-300 p-3 bg-red-50/40">
                        <Label className="flex items-center justify-between">
                            <span>Sale Time</span>
                            <input
                                type="checkbox"
                                checked={formData.saleEnabled}
                                onChange={(e) =>
                                    setFormData({ ...formData, saleEnabled: e.target.checked })
                                }
                            />
                        </Label>
                        {formData.saleEnabled && (
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <div>
                                    <Label htmlFor="salePrice">Sale Price *</Label>
                                    <Input
                                        id="salePrice"
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        className={numericInputClass}
                                        value={formData.salePrice}
                                        onChange={(e) =>
                                            setFormData({ ...formData, salePrice: parseFloat(e.target.value) || 0 })
                                        }
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="saleStartDate">Start *</Label>
                                    <Input
                                        id="saleStartDate"
                                        type="datetime-local"
                                        value={formData.saleStartDate}
                                        onChange={(e) =>
                                            setFormData({ ...formData, saleStartDate: e.target.value })
                                        }
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="saleEndDate">End *</Label>
                                    <Input
                                        id="saleEndDate"
                                        type="datetime-local"
                                        value={formData.saleEndDate}
                                        onChange={(e) =>
                                            setFormData({ ...formData, saleEndDate: e.target.value })
                                        }
                                    />
                                </div>
                            </div>
                        )}
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
