// src/pages/admin/product-management.tsx
import { useState, useEffect } from 'react';
import { getAllProducts, type Product, type GetProductsParams } from '../../api/admin-products';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '../../components/ui/table';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '../../components/ui/dialog';
import { Badge } from '../../components/ui/badge';
import { Clock3, Eye, Flag, Flame, Layers } from 'lucide-react';
import { toast } from 'sonner';
import api from '../../lib/axios';

const REPORT_REASONS = [
    'Product violates policy',
    'Inappropriate images',
    'Misleading or fraudulent information',
    'Restricted product',
    'Abnormal pricing',
    'Other',
];

type SaleState = 'none' | 'upcoming' | 'active' | 'expired';

interface SaleInfo {
    state: SaleState;
    basePrice: number;
    salePrice: number | null;
    startDate: Date | null;
    endDate: Date | null;
    discountPercent: number;
    countdown: string;
}

const toValidDate = (value?: string | Date | null) => {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
};

const formatCountdown = (target: Date) => {
    const diffMs = target.getTime() - Date.now();
    if (diffMs <= 0) return 'Ending soon';
    const totalMinutes = Math.floor(diffMs / (1000 * 60));
    const days = Math.floor(totalMinutes / (60 * 24));
    const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
    const mins = totalMinutes % 60;
    if (days > 0) return `${days}d ${hours}h left`;
    if (hours > 0) return `${hours}h ${mins}m left`;
    return `${Math.max(1, mins)}m left`;
};

const resolveSaleInfo = (product: Product): SaleInfo => {
    const currentPrice = Number(product.price ?? 0);
    const baseCandidate = Number(product.basePrice ?? product.originalPrice ?? currentPrice);
    const basePrice =
        Number.isFinite(baseCandidate) && baseCandidate > 0
            ? baseCandidate
            : currentPrice;
    const saleCandidate = Number(product.salePrice ?? product.price ?? 0);
    const salePrice =
        Number.isFinite(saleCandidate) && saleCandidate > 0 && saleCandidate < basePrice
            ? saleCandidate
            : null;

    const startDate = toValidDate(product.saleStartDate ?? product.dealStartDate ?? null);
    const endDate = toValidDate(product.saleEndDate ?? product.dealEndDate ?? null);
    const isTimedSale = Boolean(
        product.isTimedSale ||
        product.promotionType === 'daily_deal' ||
        startDate ||
        endDate,
    );

    if (!salePrice || !isTimedSale) {
        return {
            state: 'none',
            basePrice,
            salePrice: null,
            startDate,
            endDate,
            discountPercent: 0,
            countdown: '',
        };
    }

    const now = Date.now();
    const discountPercent = Math.round(((basePrice - salePrice) / basePrice) * 100);

    if (startDate && now < startDate.getTime()) {
        return {
            state: 'upcoming',
            basePrice,
            salePrice,
            startDate,
            endDate,
            discountPercent,
            countdown: `Starts ${startDate.toLocaleString('vi-VN')}`,
        };
    }

    if (endDate && now > endDate.getTime()) {
        return {
            state: 'expired',
            basePrice,
            salePrice,
            startDate,
            endDate,
            discountPercent,
            countdown: `Ended ${endDate.toLocaleString('vi-VN')}`,
        };
    }

    return {
        state: 'active',
        basePrice,
        salePrice,
        startDate,
        endDate,
        discountPercent,
        countdown: endDate ? formatCountdown(endDate) : 'Sale live',
    };
};

export default function ProductManagement() {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);
    const [search, setSearch] = useState('');

    // View dialog
    const [viewProduct, setViewProduct] = useState<Product | null>(null);
    const [isViewOpen, setIsViewOpen] = useState(false);

    // Report dialog
    const [reportProduct, setReportProduct] = useState<Product | null>(null);
    const [isReportOpen, setIsReportOpen] = useState(false);
    const [reportReason, setReportReason] = useState(REPORT_REASONS[0]);
    const [reportMessage, setReportMessage] = useState('');
    const [reportLoading, setReportLoading] = useState(false);
    const viewingSaleInfo = viewProduct ? resolveSaleInfo(viewProduct) : null;

    const fetchProducts = async () => {
        setLoading(true);
        try {
            const params: GetProductsParams = { page, limit: 10 };
            if (search) params.search = search;
            const response = await getAllProducts(params);
            setProducts(response.data);
            setTotalPages(response.pagination.totalPages);
            setTotal(response.pagination.total);
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to load products');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchProducts(); }, [page]);

    const handleSearch = () => { setPage(1); fetchProducts(); };

    const handleViewClick = (product: Product) => {
        setViewProduct(product);
        setIsViewOpen(true);
    };

    const handleReportClick = (product: Product) => {
        setReportProduct(product);
        setReportReason(REPORT_REASONS[0]);
        setReportMessage('');
        setIsReportOpen(true);
    };

    const handleSubmitReport = async () => {
        if (!reportProduct) return;
        setReportLoading(true);
        try {
            await api.post(`/api/admin/products/${reportProduct._id}/report`, {
                reason: reportReason,
                message: reportMessage.trim(),
            });
            toast.success(`Warning sent to seller "${reportProduct.sellerId?.username}"`);
            setIsReportOpen(false);
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to send report');
        } finally {
            setReportLoading(false);
        }
    };

    return (
        <div className="container mx-auto py-8">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-3xl font-bold">Product Management</h1>
                    <p className="text-gray-500 mt-1">Total products: {total}</p>
                </div>
            </div>

            {/* Search */}
            <div className="flex gap-4 mb-6">
                <div className="flex-1">
                    <Input
                        placeholder="Search by product name..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    />
                </div>
                <Button onClick={handleSearch}>Search</Button>
            </div>

            {/* Table */}
            <div className="border rounded-lg">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Image</TableHead>
                            <TableHead>Product Name</TableHead>
                            <TableHead>Seller</TableHead>
                            <TableHead>Category</TableHead>
                            <TableHead>Price</TableHead>
                            <TableHead>Sale Time</TableHead>
                            <TableHead>Stock</TableHead>
                            <TableHead>Variants</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Rating</TableHead>
                            <TableHead>Created At</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={12} className="text-center py-8">Loading...</TableCell>
                            </TableRow>
                        ) : products.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={12} className="text-center py-8">No products found</TableCell>
                            </TableRow>
                        ) : (
                            products.map((product) => {
                                const saleInfo = resolveSaleInfo(product);
                                return (
                                <TableRow key={product._id} className={saleInfo.state === 'active' ? 'bg-red-50/30 hover:bg-red-50/50' : ''}>
                                    <TableCell>
                                        {product.images?.[0] ? (
                                            <div className="relative w-16 h-16">
                                                {saleInfo.state === 'active' && (
                                                    <span className="absolute left-0 top-0 z-10 rounded-br-md bg-gradient-to-r from-red-600 to-rose-500 px-1.5 py-0.5 text-[9px] font-extrabold tracking-wide text-white shadow">
                                                        SALE
                                                    </span>
                                                )}
                                                <img
                                                    src={product.images[0]}
                                                    alt={product.title}
                                                    className="w-16 h-16 object-cover rounded"
                                                    onError={(e) => { e.currentTarget.src = 'https://via.placeholder.com/64?text=No+Image'; }}
                                                />
                                            </div>
                                        ) : (
                                            <div className="w-16 h-16 bg-gray-200 rounded flex items-center justify-center text-xs text-gray-500">No Image</div>
                                        )}
                                    </TableCell>
                                    <TableCell className="font-medium max-w-[180px]">
                                        <div className="truncate flex items-center gap-2" title={product.title}>
                                            <span>{product.title}</span>
                                            {saleInfo.state === 'active' && (
                                                <Badge className="bg-red-600 hover:bg-red-600 text-white border-0">Sale</Badge>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell>{product.sellerId?.username || 'N/A'}</TableCell>
                                    <TableCell>{product.categoryId?.name || '—'}</TableCell>
                                    <TableCell>
                                        {saleInfo.state === 'active' && saleInfo.salePrice ? (
                                            <div className="flex flex-col">
                                                <span className="text-xs text-gray-400 line-through">${saleInfo.basePrice.toFixed(2)}</span>
                                                <span className="font-semibold text-red-600">${saleInfo.salePrice.toFixed(2)}</span>
                                            </div>
                                        ) : (
                                            <span>${saleInfo.basePrice.toFixed(2)}</span>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        {saleInfo.state === 'active' && (
                                            <div className="space-y-1">
                                                <Badge className="bg-red-100 text-red-700 hover:bg-red-100 border border-red-200">
                                                    <Flame className="h-3 w-3 mr-1" />
                                                    -{saleInfo.discountPercent}%
                                                </Badge>
                                                <div className="text-[11px] text-red-600 font-medium flex items-center gap-1">
                                                    <Clock3 className="h-3 w-3" />
                                                    {saleInfo.countdown}
                                                </div>
                                            </div>
                                        )}
                                        {saleInfo.state === 'upcoming' && (
                                            <div className="space-y-1">
                                                <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border border-amber-200">Upcoming</Badge>
                                                <div className="text-[11px] text-amber-700 font-medium">{saleInfo.countdown}</div>
                                            </div>
                                        )}
                                        {saleInfo.state === 'expired' && (
                                            <Badge className="bg-gray-100 text-gray-600 hover:bg-gray-100 border border-gray-200">Expired</Badge>
                                        )}
                                        {saleInfo.state === 'none' && <span className="text-xs text-gray-400">-</span>}
                                    </TableCell>
                                    <TableCell>{product.quantity ?? 0}</TableCell>
                                    <TableCell>
                                        {(product as any).variants?.length > 0 ? (
                                            <Badge variant="outline" className="flex items-center gap-1 w-fit">
                                                <Layers className="h-3 w-3" />
                                                {(product as any).variants.length} variants
                                            </Badge>
                                        ) : (
                                            <span className="text-gray-400 text-sm">—</span>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <span className={`px-2 py-1 rounded text-xs ${product.status === 'available' ? 'bg-green-100 text-green-800' :
                                                product.status === 'sold' ? 'bg-gray-100 text-gray-800' :
                                                    'bg-yellow-100 text-yellow-800'
                                            }`}>
                                            {product.status || 'N/A'}
                                        </span>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-1">
                                            <span className="text-yellow-500">★</span>
                                            <span className="font-medium">{(product.averageRating || 0).toFixed(1)}</span>
                                            <span className="text-gray-400 text-sm">({product.ratingCount || 0})</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>{new Date(product.createdAt).toLocaleDateString('en-US')}</TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex gap-2 justify-end">
                                            <Button size="sm" variant="outline" onClick={() => handleViewClick(product)}>
                                                <Eye className="h-3 w-3 mr-1" />
                                                View
                                            </Button>
                                            <Button size="sm" variant="destructive" onClick={() => handleReportClick(product)}>
                                                <Flag className="h-3 w-3 mr-1" />
                                                Report
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )})
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Pagination */}
            <div className="flex justify-center gap-2 mt-6">
                <Button variant="outline" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
                    Previous
                </Button>
                <span className="flex items-center px-4">Page {page} / {totalPages}</span>
                <Button variant="outline" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
                    Next
                </Button>
            </div>

            {/* View Dialog */}
            <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Product Details</DialogTitle>
                        <DialogDescription>Complete product information</DialogDescription>
                    </DialogHeader>
                    {viewProduct && (
                        <div className="space-y-5 py-2">
                            {/* Images */}
                            {viewProduct.images?.length > 0 ? (
                                <div className="flex gap-2 flex-wrap">
                                    {viewProduct.images.map((url, i) => (
                                        <img key={i} src={url} alt="" className="w-24 h-24 object-cover rounded border" />
                                    ))}
                                </div>
                            ) : (
                                <div className="w-24 h-24 bg-gray-100 rounded border flex items-center justify-center text-xs text-gray-400">No Image</div>
                            )}

                            {/* Title & Description */}
                            <div>
                                <h3 className="text-lg font-bold">{viewProduct.title}</h3>
                                {viewProduct.description && (
                                    <p className="text-sm text-gray-600 mt-1">{viewProduct.description}</p>
                                )}
                            </div>

                            {/* Basic Info */}
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div><span className="text-gray-500">Seller:</span><span className="ml-2 font-medium">{viewProduct.sellerId?.username || '—'}</span></div>
                                <div><span className="text-gray-500">Category:</span><span className="ml-2">{viewProduct.categoryId?.name || '—'}</span></div>
                                <div>
                                    <span className="text-gray-500">Price:</span>
                                    {viewingSaleInfo?.state === 'active' && viewingSaleInfo.salePrice ? (
                                        <span className="ml-2 inline-flex flex-col align-middle">
                                            <span className="text-xs text-gray-400 line-through">${viewingSaleInfo.basePrice.toFixed(2)}</span>
                                            <span className="font-semibold text-red-600">${viewingSaleInfo.salePrice.toFixed(2)}</span>
                                        </span>
                                    ) : (
                                        <span className="ml-2 font-semibold">${viewingSaleInfo?.basePrice.toFixed(2) ?? viewProduct.price.toFixed(2)}</span>
                                    )}
                                </div>
                                <div><span className="text-gray-500">Stock:</span><span className="ml-2 font-semibold">{viewProduct.quantity ?? 0}</span></div>
                                <div>
                                    <span className="text-gray-500">Sale:</span>
                                    {viewingSaleInfo?.state === 'active' && (
                                        <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">
                                            <Flame className="h-3 w-3" />
                                            Active -{viewingSaleInfo.discountPercent}%
                                        </span>
                                    )}
                                    {viewingSaleInfo?.state === 'upcoming' && (
                                        <span className="ml-2 inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
                                            Upcoming
                                        </span>
                                    )}
                                    {viewingSaleInfo?.state === 'expired' && (
                                        <span className="ml-2 inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-600">
                                            Expired
                                        </span>
                                    )}
                                    {viewingSaleInfo?.state === 'none' && <span className="ml-2 text-gray-400">-</span>}
                                </div>
                                <div>
                                    <span className="text-gray-500">Sale Time:</span>
                                    <span className={`ml-2 text-xs ${viewingSaleInfo?.state === 'active' ? 'text-red-600 font-semibold' : 'text-gray-500'}`}>
                                        {viewingSaleInfo?.countdown || '-'}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-gray-500">Sale Window:</span>
                                    <span className="ml-2 text-xs text-gray-600">
                                        {viewingSaleInfo?.startDate && viewingSaleInfo?.endDate
                                            ? `${viewingSaleInfo.startDate.toLocaleString('vi-VN')} - ${viewingSaleInfo.endDate.toLocaleString('vi-VN')}`
                                            : '-'}
                                    </span>
                                </div>
                                <div><span className="text-gray-500">Condition:</span><span className="ml-2">{viewProduct.condition || '—'}</span></div>
                                <div>
                                    <span className="text-gray-500">Status:</span>
                                    <span className={`ml-2 px-2 py-0.5 rounded text-xs ${viewProduct.status === 'available' ? 'bg-green-100 text-green-800' :
                                            viewProduct.status === 'sold' ? 'bg-gray-100 text-gray-800' :
                                                'bg-yellow-100 text-yellow-800'
                                        }`}>{viewProduct.status}</span>
                                </div>
                                <div>
                                    <span className="text-gray-500">Rating:</span>
                                    <span className="ml-2">★ {(viewProduct.averageRating || 0).toFixed(1)} ({viewProduct.ratingCount || 0} reviews)</span>
                                </div>
                                <div><span className="text-gray-500">Created At:</span><span className="ml-2">{new Date(viewProduct.createdAt).toLocaleDateString('en-US')}</span></div>
                            </div>

                            {/* Variants */}
                            {(viewProduct as any).variants?.length > 0 && (
                                <div>
                                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                                        <Layers className="h-4 w-4" />
                                        Product Variants
                                    </h4>
                                    <div className="space-y-4">
                                        {(viewProduct as any).variants.map((variant: any) => (
                                            <div key={variant.name}>
                                                <p className="text-sm font-medium text-gray-700 mb-2">{variant.name}</p>
                                                <div className="flex flex-wrap gap-2">
                                                    {variant.options.map((opt: any) => (
                                                        <div
                                                            key={opt.value}
                                                            className="border rounded-md px-3 py-2 text-sm border-solid bg-white"
                                                        >
                                                            <div className="font-medium">{opt.value}</div>
                                                            <div className="text-xs text-gray-500 space-x-2">
                                                                {opt.sku && <span>SKU: {opt.sku}</span>}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                            {(viewProduct as any).variantCombinations?.length > 0 && (
                                <div>
                                    <h4 className="font-semibold mb-3">Combination Inventory</h4>
                                    <div className="space-y-2">
                                        {(viewProduct as any).variantCombinations.map((combo: any) => (
                                            <div
                                                key={combo.key}
                                                className="flex items-center justify-between border rounded-md px-3 py-2 text-sm"
                                            >
                                                <span>{(combo.selections || []).map((s: any) => s.value).join(' / ')}</span>
                                                <span className="font-semibold">
                                                    Price: ${Number(combo.price ?? (viewProduct as any).price ?? 0).toFixed(2)} | Stock: {combo.quantity || 0}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsViewOpen(false)}>Close</Button>
                        <Button variant="destructive" onClick={() => { setIsViewOpen(false); if (viewProduct) handleReportClick(viewProduct); }}>
                            <Flag className="h-4 w-4 mr-1" />
                            Report this product
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Report Dialog */}
            <Dialog open={isReportOpen} onOpenChange={setIsReportOpen}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Flag className="h-5 w-5 text-red-500" />
                            Report Product
                        </DialogTitle>
                        <DialogDescription>
                            A warning will be sent directly to the seller via system notifications
                        </DialogDescription>
                    </DialogHeader>

                    {reportProduct && (
                        <div className="space-y-4 py-2">
                            <div className="p-3 bg-gray-50 rounded-md text-sm">
                                <div className="font-medium">{reportProduct.title}</div>
                                <div className="text-gray-500">Seller: {reportProduct.sellerId?.username || '—'}</div>
                            </div>

                            <div className="grid gap-2">
                                <Label>Reason *</Label>
                                <select
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                    value={reportReason}
                                    onChange={(e) => setReportReason(e.target.value)}
                                >
                                    {REPORT_REASONS.map(r => (
                                        <option key={r} value={r}>{r}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="grid gap-2">
                                <Label>Details (optional)</Label>
                                <Textarea
                                    rows={4}
                                    placeholder="Describe the product violation in detail..."
                                    value={reportMessage}
                                    onChange={(e) => setReportMessage(e.target.value)}
                                />
                            </div>
                        </div>
                    )}

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsReportOpen(false)}>Cancel</Button>
                        <Button variant="destructive" onClick={handleSubmitReport} disabled={reportLoading}>
                            {reportLoading ? 'Sending...' : 'Send warning to seller'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}



