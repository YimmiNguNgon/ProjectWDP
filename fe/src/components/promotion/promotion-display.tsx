import { Badge } from '@/components/ui/badge';
import { Package, Tag, Clock } from 'lucide-react';
import { useEffect, useState } from 'react';

export interface ProductProps {
    promotionType?: 'normal' | 'outlet' | 'daily_deal';
    originalPrice?: number;
    discountPercent?: number;
    dealEndDate?: string;
    dealQuantityLimit?: number;
    dealQuantitySold?: number;
    price: number;
}

export function PromotionBadges({ product }: { product: ProductProps }) {
    if (!product.promotionType || product.promotionType === 'normal') {
        return null;
    }

    return (
        <div className="absolute top-2 left-2 flex flex-col gap-1">
            {product.promotionType === 'outlet' && (
                <Badge className="bg-orange-600 text-white shadow-lg">
                    <Package className="w-3 h-3 mr-1" />
                    Brand Outlet
                </Badge>
            )}
            {product.promotionType === 'daily_deal' && (
                <Badge className="bg-red-600 text-white shadow-lg">
                    <Tag className="w-3 h-3 mr-1" />
                    Daily Deal
                </Badge>
            )}
        </div>
    );
}

export function PromotionPricing({ product }: { product: ProductProps }) {
    if (!product.promotionType || product.promotionType === 'normal') {
        return (
            <p className="text-lg font-bold text-foreground">
                ${product.price.toFixed(2)}
            </p>
        );
    }

    return (
        <div className="flex flex-col gap-1">
            {product.originalPrice && (
                <p className="text-sm text-gray-500 line-through">
                    ${product.originalPrice.toFixed(2)}
                </p>
            )}
            <div className="flex items-center gap-2">
                <p className="text-lg font-bold text-red-600">
                    ${product.price.toFixed(2)}
                </p>
                {product.discountPercent && (
                    <Badge variant="destructive" className="text-xs">
                        -{product.discountPercent}%
                    </Badge>
                )}
            </div>
        </div>
    );
}

export function DealCountdown({ endDate }: { endDate?: string }) {
    const [timeLeft, setTimeLeft] = useState('');

    useEffect(() => {
        if (!endDate) return;

        const calculateTimeLeft = () => {
            const end = new Date(endDate).getTime();
            const now = new Date().getTime();
            const diff = end - now;

            if (diff <= 0) {
                setTimeLeft('Expired');
                return;
            }

            const days = Math.floor(diff / (1000 * 60 * 60 * 24));
            const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

            if (days > 0) {
                setTimeLeft(`${days}d ${hours}h`);
            } else if (hours > 0) {
                setTimeLeft(`${hours}h ${minutes}m`);
            } else {
                setTimeLeft(`${minutes}m`);
            }
        };

        calculateTimeLeft();
        const interval = setInterval(calculateTimeLeft, 60000); // Update every minute

        return () => clearInterval(interval);
    }, [endDate]);

    if (!endDate || !timeLeft) return null;

    return (
        <div className="flex items-center gap-1 text-xs text-orange-600 font-semibold">
            <Clock className="w-3 h-3" />
            <span>Ends in {timeLeft}</span>
        </div>
    );
}

export function DealQuantity({
    quantityLimit,
    quantitySold,
}: {
    quantityLimit?: number;
    quantitySold?: number;
}) {
    if (!quantityLimit) return null;

    const remaining = quantityLimit - (quantitySold || 0);
    const percentSold = ((quantitySold || 0) / quantityLimit) * 100;

    if (remaining <= 0) {
        return (
            <Badge variant="destructive" className="text-xs">
                Sold Out
            </Badge>
        );
    }

    return (
        <div className="text-xs text-gray-600">
            <span className={remaining <= 5 ? 'text-red-600 font-semibold' : ''}>
                {remaining} left
            </span>
            {percentSold > 50 && ' - Selling fast!'}
        </div>
    );
}
