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
import { Eye, Flag, Layers } from 'lucide-react';
import { toast } from 'sonner';
import api from '../../lib/axios';

const REPORT_REASONS = [
    'Sản phẩm vi phạm chính sách',
    'Hình ảnh không phù hợp',
    'Thông tin sai lệch / gian lận',
    'Sản phẩm bị cấm kinh doanh',
    'Giá bán bất thường',
    'Khác',
];

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
            toast.error(error.response?.data?.message || 'Lỗi khi tải danh sách sản phẩm');
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
            toast.success(`Đã gửi cảnh báo tới seller "${reportProduct.sellerId?.username}"`);
            setIsReportOpen(false);
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Lỗi khi gửi báo cáo');
        } finally {
            setReportLoading(false);
        }
    };

    return (
        <div className="container mx-auto py-8">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-3xl font-bold">Quản lý Sản Phẩm</h1>
                    <p className="text-gray-500 mt-1">Tổng cộng {total} sản phẩm</p>
                </div>
            </div>

            {/* Search */}
            <div className="flex gap-4 mb-6">
                <div className="flex-1">
                    <Input
                        placeholder="Tìm kiếm theo tên sản phẩm..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    />
                </div>
                <Button onClick={handleSearch}>Tìm kiếm</Button>
            </div>

            {/* Table */}
            <div className="border rounded-lg">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Hình ảnh</TableHead>
                            <TableHead>Tên sản phẩm</TableHead>
                            <TableHead>Người bán</TableHead>
                            <TableHead>Danh mục</TableHead>
                            <TableHead>Giá</TableHead>
                            <TableHead>Kho</TableHead>
                            <TableHead>Đặc điểm</TableHead>
                            <TableHead>Trạng thái</TableHead>
                            <TableHead>Đánh giá</TableHead>
                            <TableHead>Ngày tạo</TableHead>
                            <TableHead className="text-right">Hành động</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={11} className="text-center py-8">Đang tải...</TableCell>
                            </TableRow>
                        ) : products.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={11} className="text-center py-8">Không tìm thấy sản phẩm</TableCell>
                            </TableRow>
                        ) : (
                            products.map((product) => (
                                <TableRow key={product._id}>
                                    <TableCell>
                                        {product.images?.[0] ? (
                                            <img
                                                src={product.images[0]}
                                                alt={product.title}
                                                className="w-16 h-16 object-cover rounded"
                                                onError={(e) => { e.currentTarget.src = 'https://via.placeholder.com/64?text=No+Image'; }}
                                            />
                                        ) : (
                                            <div className="w-16 h-16 bg-gray-200 rounded flex items-center justify-center text-xs text-gray-500">No Image</div>
                                        )}
                                    </TableCell>
                                    <TableCell className="font-medium max-w-[180px]">
                                        <div className="truncate" title={product.title}>{product.title}</div>
                                    </TableCell>
                                    <TableCell>{product.sellerId?.username || 'N/A'}</TableCell>
                                    <TableCell>{product.categoryId?.name || '—'}</TableCell>
                                    <TableCell>${product.price.toFixed(2)}</TableCell>
                                    <TableCell>{product.quantity ?? 0}</TableCell>
                                    <TableCell>
                                        {(product as any).variants?.length > 0 ? (
                                            <Badge variant="outline" className="flex items-center gap-1 w-fit">
                                                <Layers className="h-3 w-3" />
                                                {(product as any).variants.length} đặc điểm
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
                                    <TableCell>{new Date(product.createdAt).toLocaleDateString('vi-VN')}</TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex gap-2 justify-end">
                                            <Button size="sm" variant="outline" onClick={() => handleViewClick(product)}>
                                                <Eye className="h-3 w-3 mr-1" />
                                                Xem
                                            </Button>
                                            <Button size="sm" variant="destructive" onClick={() => handleReportClick(product)}>
                                                <Flag className="h-3 w-3 mr-1" />
                                                Report
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Pagination */}
            <div className="flex justify-center gap-2 mt-6">
                <Button variant="outline" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
                    Trang trước
                </Button>
                <span className="flex items-center px-4">Trang {page} / {totalPages}</span>
                <Button variant="outline" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
                    Trang sau
                </Button>
            </div>

            {/* View Dialog */}
            <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Chi tiết sản phẩm</DialogTitle>
                        <DialogDescription>Thông tin đầy đủ của sản phẩm</DialogDescription>
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
                                <div><span className="text-gray-500">Người bán:</span><span className="ml-2 font-medium">{viewProduct.sellerId?.username || '—'}</span></div>
                                <div><span className="text-gray-500">Danh mục:</span><span className="ml-2">{viewProduct.categoryId?.name || '—'}</span></div>
                                <div><span className="text-gray-500">Giá:</span><span className="ml-2 font-semibold">${viewProduct.price.toFixed(2)}</span></div>
                                <div><span className="text-gray-500">Tồn kho:</span><span className="ml-2 font-semibold">{viewProduct.quantity ?? 0}</span></div>
                                <div><span className="text-gray-500">Tình trạng:</span><span className="ml-2">{viewProduct.condition || '—'}</span></div>
                                <div>
                                    <span className="text-gray-500">Trạng thái:</span>
                                    <span className={`ml-2 px-2 py-0.5 rounded text-xs ${viewProduct.status === 'available' ? 'bg-green-100 text-green-800' :
                                            viewProduct.status === 'sold' ? 'bg-gray-100 text-gray-800' :
                                                'bg-yellow-100 text-yellow-800'
                                        }`}>{viewProduct.status}</span>
                                </div>
                                <div>
                                    <span className="text-gray-500">Đánh giá:</span>
                                    <span className="ml-2">★ {(viewProduct.averageRating || 0).toFixed(1)} ({viewProduct.ratingCount || 0} lượt)</span>
                                </div>
                                <div><span className="text-gray-500">Ngày tạo:</span><span className="ml-2">{new Date(viewProduct.createdAt).toLocaleDateString('vi-VN')}</span></div>
                            </div>

                            {/* Variants */}
                            {(viewProduct as any).variants?.length > 0 && (
                                <div>
                                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                                        <Layers className="h-4 w-4" />
                                        Đặc điểm sản phẩm
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
                                    <h4 className="font-semibold mb-3">Tồn kho theo tổ hợp</h4>
                                    <div className="space-y-2">
                                        {(viewProduct as any).variantCombinations.map((combo: any) => (
                                            <div
                                                key={combo.key}
                                                className="flex items-center justify-between border rounded-md px-3 py-2 text-sm"
                                            >
                                                <span>{(combo.selections || []).map((s: any) => s.value).join(' / ')}</span>
                                                <span className="font-semibold">Kho: {combo.quantity || 0}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsViewOpen(false)}>Đóng</Button>
                        <Button variant="destructive" onClick={() => { setIsViewOpen(false); if (viewProduct) handleReportClick(viewProduct); }}>
                            <Flag className="h-4 w-4 mr-1" />
                            Report sản phẩm này
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
                            Báo cáo sản phẩm
                        </DialogTitle>
                        <DialogDescription>
                            Sẽ gửi cảnh báo trực tiếp tới seller qua hệ thống thông báo
                        </DialogDescription>
                    </DialogHeader>

                    {reportProduct && (
                        <div className="space-y-4 py-2">
                            <div className="p-3 bg-gray-50 rounded-md text-sm">
                                <div className="font-medium">{reportProduct.title}</div>
                                <div className="text-gray-500">Seller: {reportProduct.sellerId?.username || '—'}</div>
                            </div>

                            <div className="grid gap-2">
                                <Label>Lý do báo cáo *</Label>
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
                                <Label>Nội dung chi tiết (tùy chọn)</Label>
                                <Textarea
                                    rows={4}
                                    placeholder="Mô tả cụ thể vi phạm của sản phẩm..."
                                    value={reportMessage}
                                    onChange={(e) => setReportMessage(e.target.value)}
                                />
                            </div>
                        </div>
                    )}

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsReportOpen(false)}>Hủy</Button>
                        <Button variant="destructive" onClick={handleSubmitReport} disabled={reportLoading}>
                            {reportLoading ? 'Đang gửi...' : 'Gửi cảnh báo tới Seller'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

