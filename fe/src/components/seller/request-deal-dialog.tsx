import { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { requestDailyDeal } from '@/api/promotions';
import { toast } from 'sonner';
import type { Product } from '@/api/seller-products';

interface RequestDailyDealDialogProps {
    product: Product;
    open: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export default function RequestDailyDealDialog({
    product,
    open,
    onClose,
    onSuccess,
}: RequestDailyDealDialogProps) {
    const [formData, setFormData] = useState({
        discountedPrice: 0,
        startDate: '',
        endDate: '',
        quantityLimit: 0,
    });
    const [loading, setLoading] = useState(false);

    const originalPrice = product.price;
    const discountPercent =
        formData.discountedPrice > 0 && formData.discountedPrice < originalPrice
            ? Math.round(
                ((originalPrice - formData.discountedPrice) / originalPrice) * 100
            )
            : 0;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            await requestDailyDeal({
                productId: product._id,
                discountedPrice: formData.discountedPrice,
                startDate: formData.startDate,
                endDate: formData.endDate,
                quantityLimit: formData.quantityLimit,
            });

            toast.success('Daily Deal request submitted successfully!');
            onSuccess();
            onClose();
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to submit request');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Request Daily Deal Status</DialogTitle>
                    <DialogDescription>
                        Create a time-limited deal with special pricing
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Product Info */}
                    <div className="flex gap-4 p-4 bg-gray-50 rounded-lg">
                        {product.image && (
                            <img
                                src={product.image}
                                alt={product.title}
                                className="w-20 h-20 object-cover rounded"
                            />
                        )}
                        <div className="flex-1">
                            <h3 className="font-semibold line-clamp-2">{product.title}</h3>
                            <p className="text-sm text-gray-600 mt-1">
                                Available Quantity: {product.quantity}
                            </p>
                            <p className="text-sm text-gray-600">
                                Current Price: ${originalPrice.toFixed(2)}
                            </p>
                        </div>
                    </div>

                    {/* Pricing */}
                    <div>
                        <Label htmlFor="discountedPrice">Deal Price (USD) *</Label>
                        <Input
                            id="discountedPrice"
                            type="number"
                            step="0.01"
                            min="0.01"
                            max={originalPrice - 0.01}
                            value={formData.discountedPrice || ''}
                            onChange={(e) =>
                                setFormData({
                                    ...formData,
                                    discountedPrice: parseFloat(e.target.value),
                                })
                            }
                            required
                            placeholder="Enter deal price"
                        />
                        {discountPercent > 0 && (
                            <p className="text-sm mt-1 text-gray-600">
                                Discount: <span className="font-semibold">{discountPercent}%</span>{' '}
                                (Recommended: 10-90%)
                            </p>
                        )}
                    </div>

                    {/* Date Range */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="startDate">Start Date & Time *</Label>
                            <Input
                                id="startDate"
                                type="datetime-local"
                                value={formData.startDate}
                                onChange={(e) =>
                                    setFormData({ ...formData, startDate: e.target.value })
                                }
                                required
                                min={new Date().toISOString().slice(0, 16)}
                            />
                        </div>
                        <div>
                            <Label htmlFor="endDate">End Date & Time *</Label>
                            <Input
                                id="endDate"
                                type="datetime-local"
                                value={formData.endDate}
                                onChange={(e) =>
                                    setFormData({ ...formData, endDate: e.target.value })
                                }
                                required
                                min={formData.startDate || new Date().toISOString().slice(0, 16)}
                            />
                        </div>
                    </div>

                    {/* Quantity Limit */}
                    <div>
                        <Label htmlFor="quantityLimit">Quantity Limit *</Label>
                        <Input
                            id="quantityLimit"
                            type="number"
                            min="1"
                            max={product.quantity}
                            value={formData.quantityLimit || ''}
                            onChange={(e) =>
                                setFormData({
                                    ...formData,
                                    quantityLimit: parseInt(e.target.value),
                                })
                            }
                            required
                            placeholder={`Max: ${product.quantity}`}
                        />
                        <p className="text-sm text-gray-600 mt-1">
                            Maximum units available for this deal
                        </p>
                    </div>

                    {/* Info Box */}
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <h4 className="font-semibold text-sm text-blue-900 mb-2">
                            ℹ️ Daily Deal Requirements
                        </h4>
                        <ul className="text-sm text-blue-800 space-y-1">
                            <li>• Deal end date must be in the future</li>
                            <li>• Start date must be before end date</li>
                            <li>• Discount between 10% and 90%</li>
                            <li>• Quantity limit must be at least 1</li>
                            <li>• All deals require admin approval</li>
                        </ul>
                    </div>

                    {/* Submit */}
                    <div className="flex justify-end gap-2 pt-4">
                        <Button type="button" variant="outline" onClick={onClose}>
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={
                                loading ||
                                !formData.discountedPrice ||
                                !formData.startDate ||
                                !formData.endDate ||
                                !formData.quantityLimit ||
                                formData.discountedPrice >= originalPrice ||
                                discountPercent < 10 ||
                                discountPercent > 90
                            }
                        >
                            {loading ? 'Submitting...' : 'Submit Request'}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
