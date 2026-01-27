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
import { Badge } from '@/components/ui/badge';
import { requestOutlet } from '@/api/promotions';
import { toast } from 'sonner';
import { CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import type { Product } from '@/api/seller-products';

interface RequestOutletDialogProps {
    product: Product;
    open: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export default function RequestOutletDialog({
    product,
    open,
    onClose,
    onSuccess,
}: RequestOutletDialogProps) {
    const [discountedPrice, setDiscountedPrice] = useState<number>(0);
    const [loading, setLoading] = useState(false);
    const [eligibility, setEligibility] = useState<any>(null);

    const originalPrice = product.price;
    const discountPercent =
        discountedPrice > 0 && discountedPrice < originalPrice
            ? Math.round(((originalPrice - discountedPrice) / originalPrice) * 100)
            : 0;

    // Calculate listing age
    const listingAge = Math.floor(
        (Date.now() - new Date(product.createdAt).getTime()) / (1000 * 60 * 60 * 24)
    );

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const response = await requestOutlet({
                productId: product._id,
                discountedPrice,
            });

            setEligibility(response.eligibility);

            if (response.eligibility.allPassed) {
                toast.success('Brand Outlet request submitted successfully!');
                onSuccess();
                onClose();
            } else {
                toast.warning('Request submitted but product may not meet all criteria');
            }
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to submit request');
        } finally {
            setLoading(false);
        }
    };

    const EligibilityCheck = ({
        label,
        passed,
        value,
    }: {
        label: string;
        passed: boolean;
        value?: string;
    }) => (
        <div className="flex items-center justify-between py-2 border-b">
            <div className="flex items-center gap-2">
                {passed ? (
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                ) : (
                    <XCircle className="w-5 h-5 text-red-600" />
                )}
                <span className="text-sm">{label}</span>
            </div>
            {value && <span className="text-sm font-medium">{value}</span>}
        </div>
    );

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Request Brand Outlet Status</DialogTitle>
                    <DialogDescription>
                        Submit your product for Brand Outlet promotion
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
                                Condition: {product.condition || 'N/A'}
                            </p>
                            <p className="text-sm text-gray-600">
                                Current Price: ${originalPrice.toFixed(2)}
                            </p>
                        </div>
                    </div>

                    {/* Pricing Input */}
                    <div className="space-y-4">
                        <div>
                            <Label htmlFor="discountedPrice">
                                Discounted Price (USD) *
                            </Label>
                            <Input
                                id="discountedPrice"
                                type="number"
                                step="0.01"
                                min="0.01"
                                max={originalPrice - 0.01}
                                value={discountedPrice || ''}
                                onChange={(e) => setDiscountedPrice(parseFloat(e.target.value))}
                                required
                                placeholder="Enter discounted price"
                            />
                            {discountPercent > 0 && (
                                <p className="text-sm mt-1">
                                    Discount:{' '}
                                    <span
                                        className={
                                            discountPercent >= 30
                                                ? 'text-green-600 font-semibold'
                                                : 'text-red-600 font-semibold'
                                        }
                                    >
                                        {discountPercent}%
                                    </span>
                                    {discountPercent < 30 && ' (Minimum 30% required)'}
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Eligibility Checks */}
                    <div className="space-y-2">
                        <h4 className="font-semibold text-sm flex items-center gap-2">
                            <AlertCircle className="w-4 h-4" />
                            Eligibility Requirements
                        </h4>
                        <div className="border rounded-lg p-4 space-y-2">
                            <EligibilityCheck
                                label="Product Condition is NEW"
                                passed={product.condition?.toLowerCase() === 'new'}
                            />
                            <EligibilityCheck
                                label="Listed for 60+ days"
                                passed={listingAge >= 60}
                                value={`${listingAge} days`}
                            />
                            <EligibilityCheck
                                label="Discount ≥ 30%"
                                passed={discountPercent >= 30}
                                value={`${discountPercent}%`}
                            />
                            <EligibilityCheck
                                label="Seller verified"
                                passed={true} // Assume verified if they can access this
                                value="✓"
                            />
                        </div>

                        {product.condition?.toLowerCase() !== 'new' && (
                            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                                <p className="text-sm text-red-800">
                                    Your product condition must be "NEW" to qualify for Brand
                                    Outlet.
                                </p>
                            </div>
                        )}

                        {listingAge < 60 && (
                            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                                <p className="text-sm text-yellow-800">
                                    Your product needs to be listed for at least 60 days. Wait{' '}
                                    {60 - listingAge} more days.
                                </p>
                            </div>
                        )}
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
                                !discountedPrice ||
                                discountedPrice >= originalPrice ||
                                discountPercent < 30
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
