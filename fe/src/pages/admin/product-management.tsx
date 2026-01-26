// src/pages/admin/product-management.tsx
import { useState, useEffect } from 'react';
import { getAllProducts, deleteProduct, createProduct, updateProduct, type Product, type GetProductsParams } from '../../api/admin-products';
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
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '../../components/ui/dialog';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { toast } from 'sonner';
import api from '../../lib/axios';

interface ProductFormData {
    title: string;
    description: string;
    price: number;
    quantity: number;
    categoryId: string;
    sellerId: string;
    condition: string;
    status: string;
    images: string[];
}

interface Category {
    _id: string;
    name: string;
}

interface Seller {
    _id: string;
    username: string;
}

export default function ProductManagement() {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [search, setSearch] = useState('');

    // Dialog state
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [formData, setFormData] = useState<ProductFormData>({
        title: '',
        description: '',
        price: 0,
        quantity: 0,
        categoryId: '',
        sellerId: '',
        condition: 'new',
        status: 'available',
        images: [],
    });
    const [uploading, setUploading] = useState(false);

    // Categories and sellers
    const [categories, setCategories] = useState<Category[]>([]);
    const [sellers, setSellers] = useState<Seller[]>([]);

    // Fetch categories and sellers
    useEffect(() => {
        const fetchData = async () => {
            try {
                const [categoriesRes, sellersRes] = await Promise.all([
                    api.get('/api/categories'),
                    api.get('/api/admin/users?role=seller&limit=100'),
                ]);
                setCategories(categoriesRes.data.data || categoriesRes.data);
                setSellers(sellersRes.data.data || []);
            } catch (error) {
                console.error('Error fetching categories/sellers:', error);
            }
        };
        fetchData();
    }, []);

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

    // Open create dialog
    const handleCreateClick = () => {
        setEditingProduct(null);
        setFormData({
            title: '',
            description: '',
            price: 0,
            quantity: 0,
            categoryId: categories[0]?._id || '',
            sellerId: sellers[0]?._id || '',
            condition: 'new',
            status: 'available',
            images: [],
        });
        setIsDialogOpen(true);
    };

    // Open edit dialog
    const handleEditClick = (product: Product) => {
        setEditingProduct(product);
        setFormData({
            title: product.title,
            description: product.description,
            price: product.price,
            quantity: product.quantity || 0,
            categoryId: product.categoryId?._id || '',
            sellerId: product.sellerId?._id || '',
            condition: product.condition || 'new',
            status: product.status || 'available',
            images: product.images || [],
        });
        setIsDialogOpen(true);
    };

    // Handle image upload
    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        setUploading(true);
        try {
            const formDataUpload = new FormData();
            Array.from(files).forEach((file) => {
                formDataUpload.append('images', file);
            });

            const response = await api.post('/api/upload/product-images', formDataUpload, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });

            const uploadedUrls = response.data.urls;
            setFormData(prev => ({
                ...prev,
                images: [...prev.images, ...uploadedUrls]
            }));
            toast.success(`Đã upload ${uploadedUrls.length} ảnh`);
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Lỗi khi upload ảnh');
        } finally {
            setUploading(false);
        }
    };

    // Remove image
    const handleRemoveImage = (index: number) => {
        setFormData(prev => ({
            ...prev,
            images: prev.images.filter((_, i) => i !== index)
        }));
    };

    // Handle form submit
    const handleSubmit = async () => {
        try {
            if (!formData.title || !formData.description || !formData.categoryId || !formData.sellerId) {
                toast.error('Vui lòng điền đầy đủ thông tin bắt buộc');
                return;
            }

            if (editingProduct) {
                // Update
                await updateProduct(editingProduct._id, formData);
                toast.success('Cập nhật sản phẩm thành công');
            } else {
                // Create
                await createProduct(formData);
                toast.success('Tạo sản phẩm thành công');
            }

            setIsDialogOpen(false);
            fetchProducts();
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Lỗi khi lưu sản phẩm');
        }
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
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold">Quản lý Sản Phẩm</h1>
                <Button onClick={handleCreateClick}>Tạo sản phẩm mới</Button>
            </div>

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
                                        <div className="flex gap-2 justify-end">
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => handleEditClick(product)}
                                            >
                                                Sửa
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="destructive"
                                                onClick={() => handleDeleteProduct(product)}
                                            >
                                                Xóa
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

            {/* Create/Edit Dialog */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>
                            {editingProduct ? 'Sửa sản phẩm' : 'Tạo sản phẩm mới'}
                        </DialogTitle>
                        <DialogDescription>
                            {editingProduct ? 'Cập nhật thông tin sản phẩm' : 'Điền thông tin để tạo sản phẩm mới'}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="title">Tên sản phẩm *</Label>
                            <Input
                                id="title"
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="description">Mô tả *</Label>
                            <Textarea
                                id="description"
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                rows={4}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="price">Giá ($) *</Label>
                                <Input
                                    id="price"
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={formData.price}
                                    onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                                />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="quantity">Số lượng</Label>
                                <Input
                                    id="quantity"
                                    type="number"
                                    min="0"
                                    value={formData.quantity}
                                    onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 0 })}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="categoryId">Danh mục *</Label>
                                <select
                                    id="categoryId"
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                    value={formData.categoryId}
                                    onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                                >
                                    <option value="">Chọn danh mục</option>
                                    {categories.map((cat) => (
                                        <option key={cat._id} value={cat._id}>{cat.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="sellerId">Người bán *</Label>
                                <select
                                    id="sellerId"
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                    value={formData.sellerId}
                                    onChange={(e) => setFormData({ ...formData, sellerId: e.target.value })}
                                >
                                    <option value="">Chọn người bán</option>
                                    {sellers.map((seller) => (
                                        <option key={seller._id} value={seller._id}>{seller.username}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="status">Trạng thái</Label>
                            <select
                                id="status"
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                value={formData.status}
                                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                            >
                                <option value="available">Có sẵn</option>
                                <option value="sold">Đã bán</option>
                                <option value="pending">Đang chờ</option>
                            </select>
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="images">Hình ảnh sản phẩm</Label>
                            <Input
                                id="images"
                                type="file"
                                accept="image/*"
                                multiple
                                onChange={handleImageUpload}
                                disabled={uploading}
                            />
                            {uploading && <p className="text-sm text-gray-500">Đang upload...</p>}

                            {/* Image preview grid */}
                            {formData.images.length > 0 && (
                                <div className="grid grid-cols-4 gap-2 mt-2">
                                    {formData.images.map((url, index) => (
                                        <div key={index} className="relative group">
                                            <img
                                                src={url}
                                                alt={`Product ${index + 1}`}
                                                className="w-full h-24 object-cover rounded border"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveImage(index)}
                                                className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                ×
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                            Hủy
                        </Button>
                        <Button onClick={handleSubmit}>
                            {editingProduct ? 'Cập nhật' : 'Tạo mới'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
