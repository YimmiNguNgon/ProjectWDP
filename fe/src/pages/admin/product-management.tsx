// src/pages/admin/product-management.tsx
import { useState, useEffect } from 'react';
import { getAllProducts, deleteProduct, type Product, type GetProductsParams } from '../../api/admin-products';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '../../components/ui/table';
import { toast } from 'sonner';

export default function ProductManagement() {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [search, setSearch] = useState('');

    // Fetch products
    const fetchProducts = async () => {
        setLoading(true);
        try {
            const params: GetProductsParams = {
                page,
                limit: 10,
            };

            if (search) params.search = search;

            const response = await getAllProducts(params);
            setProducts(response.data);
            setTotalPages(response.pagination.totalPages);
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Lỗi khi tải danh sách sản phẩm');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProducts();
    }, [page]);

    // Handle search
    const handleSearch = () => {
        setPage(1);
        fetchProducts();
    };

    // Handle delete product
    const handleDeleteProduct = async (product: Product) => {
        if (!confirm(`Bạn có chắc muốn xóa sản phẩm "${product.title}"?`)) {
            return;
        }

        try {
            await deleteProduct(product._id);
            toast.success('Đã xóa sản phẩm thành công');
            fetchProducts();
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Lỗi khi xóa sản phẩm');
        }
    };

    return (
        <div className="container mx-auto py-8">
            <h1 className="text-3xl font-bold mb-6">Quản lý Sản Phẩm</h1>

            {/* Filters */}
            <div className="flex gap-4 mb-6">
                <div className="flex-1">
                    <Input
                        placeholder="Tìm kiếm theo tên sản phẩm..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                    />
                </div>
                <Button onClick={handleSearch}>Tìm kiếm</Button>
            </div>

            {/* Products Table */}
            <div className="border rounded-lg">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Hình ảnh</TableHead>
                            <TableHead>Tên sản phẩm</TableHead>
                            <TableHead>Mô tả</TableHead>
                            <TableHead>Người bán</TableHead>
                            <TableHead>Danh mục</TableHead>
                            <TableHead>Giá</TableHead>
                            <TableHead>Kho</TableHead>
                            <TableHead>Trạng thái</TableHead>
                            <TableHead>Đánh giá</TableHead>
                            <TableHead>Ngày tạo</TableHead>
                            <TableHead className="text-right">Hành động</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={11} className="text-center py-8">
                                    Đang tải...
                                </TableCell>
                            </TableRow>
                        ) : products.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={11} className="text-center py-8">
                                    Không tìm thấy sản phẩm
                                </TableCell>
                            </TableRow>
                        ) : (
                            products.map((product) => (
                                <TableRow key={product._id}>
                                    <TableCell>
                                        {product.images && product.images[0] ? (
                                            <img
                                                src={product.images[0]}
                                                alt={product.title}
                                                className="w-16 h-16 object-cover rounded"
                                                onError={(e) => {
                                                    e.currentTarget.src = 'https://via.placeholder.com/64?text=No+Image';
                                                }}
                                            />
                                        ) : (
                                            <div className="w-16 h-16 bg-gray-200 rounded flex items-center justify-center text-xs text-gray-500">
                                                No Image
                                            </div>
                                        )}
                                    </TableCell>
                                    <TableCell className="font-medium">{product.title}</TableCell>
                                    <TableCell>
                                        <div className="max-w-xs truncate" title={product.description}>
                                            {product.description || 'Không có mô tả'}
                                        </div>
                                    </TableCell>
                                    <TableCell>{product.sellerId?.username || 'N/A'}</TableCell>
                                    <TableCell>
                                        {product.categoryId?.name || 'Không có danh mục'}
                                    </TableCell>
                                    <TableCell>${product.price.toFixed(2)}</TableCell>
                                    <TableCell>{product.quantity ?? 0}</TableCell>
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
                                        <Button
                                            size="sm"
                                            variant="destructive"
                                            onClick={() => handleDeleteProduct(product)}
                                        >
                                            Xóa
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Pagination */}
            <div className="flex justify-center gap-2 mt-6">
                <Button
                    variant="outline"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                >
                    Trang trước
                </Button>
                <span className="flex items-center px-4">
                    Trang {page} / {totalPages}
                </span>
                <Button
                    variant="outline"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                >
                    Trang sau
                </Button>
            </div>
        </div>
    );
}
