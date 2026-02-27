import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tag, DollarSign, Package, Layers, ArrowLeft, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';
import { updateProduct, type ProductVariant } from '@/api/seller-products';
import ProductVariantsManager from '@/components/seller/product-variants-manager';
import api from '@/lib/axios';

interface Category {
    _id: string;
    name: string;
}

export default function EditProduct() {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const [pageLoading, setPageLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [categories, setCategories] = useState<Category[]>([]);
    const [variants, setVariants] = useState<ProductVariant[]>([]);
    const [images, setImages] = useState<string[]>([]);
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        price: '',
        quantity: '',
        condition: 'new',
        categoryId: '',
    });

    useEffect(() => {
        api.get('/api/categories').then((res) => {
            setCategories(res.data?.data ?? res.data ?? []);
        }).catch(() => { });
    }, []);

    useEffect(() => {
        if (!id) return;
        api.get(`/api/products/${id}`)
            .then((res) => {
                const p = res.data?.data ?? res.data;
                setFormData({
                    title: p.title ?? '',
                    description: p.description ?? '',
                    price: String(p.price ?? ''),
                    quantity: String(p.quantity ?? ''),
                    condition: p.condition ?? 'new',
                    categoryId: p.categoryId?._id ?? p.categoryId ?? '',
                });
                setImages(p.images ?? []);
                setVariants(p.variants ?? []);
            })
            .catch(() => {
                toast.error('Không thể tải thông tin sản phẩm');
                navigate('/seller/products');
            })
            .finally(() => setPageLoading(false));
    }, [id]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;
        setUploading(true);
        try {
            const fd = new FormData();
            Array.from(files).forEach((file) => fd.append('images', file));
            const res = await api.post('/api/upload/product-images', fd, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            const urls: string[] = res.data.urls ?? [];
            setImages((prev) => [...prev, ...urls]);
            toast.success(`Đã upload ${urls.length} ảnh`);
        } catch {
            toast.error('Lỗi khi upload ảnh');
        } finally {
            setUploading(false);
        }
    };

    const handleRemoveImage = (index: number) => {
        setImages((prev) => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.title || !formData.price) {
            toast.error('Vui lòng điền tên sản phẩm và giá bán');
            return;
        }
        setSaving(true);
        try {
            await updateProduct(id!, {
                title: formData.title,
                description: formData.description,
                price: parseFloat(formData.price),
                quantity: parseInt(formData.quantity) || 0,
                condition: formData.condition,
                categoryId: formData.categoryId || undefined,
                images,
                variants,
            } as any);
            toast.success('Cập nhật sản phẩm thành công!');
            navigate('/seller/products');
        } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Có lỗi xảy ra khi cập nhật sản phẩm');
        } finally {
            setSaving(false);
        }
    };

    if (pageLoading) {
        return (
            <div className="p-6 flex items-center justify-center h-64">
                <p className="text-gray-500">Đang tải thông tin sản phẩm...</p>
            </div>
        );
    }

    return (
        <div className="p-6">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="mb-8 flex items-center gap-4">
                    <Button variant="ghost" onClick={() => navigate('/seller/products')} className="flex items-center gap-2">
                        <ArrowLeft className="h-4 w-4" />
                        Quay lại
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Chỉnh sửa sản phẩm</h1>
                        <p className="text-gray-600">Cập nhật thông tin sản phẩm của bạn</p>
                    </div>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Left Column */}
                        <div className="lg:col-span-2 space-y-6">
                            {/* Product Info */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-lg flex items-center gap-2">
                                        <Tag className="h-5 w-5" />
                                        Thông tin sản phẩm
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="title">Tên sản phẩm *</Label>
                                        <Input id="title" name="title" value={formData.title} onChange={handleChange} required />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="description">Mô tả sản phẩm</Label>
                                        <Textarea id="description" name="description" rows={6} value={formData.description} onChange={handleChange} />
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Images */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-lg flex items-center gap-2">
                                        <ImageIcon className="h-5 w-5" />
                                        Hình ảnh sản phẩm
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    <Input type="file" accept="image/*" multiple onChange={handleImageUpload} disabled={uploading} />
                                    {uploading && <p className="text-sm text-gray-500">Đang upload...</p>}
                                    {images.length > 0 && (
                                        <div className="grid grid-cols-5 gap-2">
                                            {images.map((url, index) => (
                                                <div key={index} className="relative group">
                                                    <img src={url} alt="" className="w-full h-20 object-cover rounded border" />
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRemoveImage(index)}
                                                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                                    >
                                                        ×
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            {/* Variants */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-lg flex items-center gap-2">
                                        <Layers className="h-5 w-5" />
                                        Đặc điểm sản phẩm
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-sm text-gray-500 mb-4">
                                        Thêm các đặc điểm như Kích thước, Màu sắc... và liệt kê các giá trị tương ứng.
                                    </p>
                                    <ProductVariantsManager variants={variants} onChange={setVariants} />
                                </CardContent>
                            </Card>
                        </div>

                        {/* Right Column */}
                        <div className="space-y-6">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-lg flex items-center gap-2">
                                        <DollarSign className="h-5 w-5" />
                                        Giá & Tồn kho
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="price">Giá bán *</Label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-2.5 text-gray-500">$</span>
                                            <Input
                                                id="price" name="price" type="number" placeholder="0.00"
                                                className="pl-8" value={formData.price} onChange={handleChange} required
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="quantity">Số lượng tồn kho</Label>
                                        <div className="relative">
                                            <Package className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
                                            <Input
                                                id="quantity" name="quantity" type="number" placeholder="Số lượng"
                                                className="pl-10" value={formData.quantity} onChange={handleChange}
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="categoryId">Danh mục</Label>
                                        <select
                                            id="categoryId" name="categoryId"
                                            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                            value={formData.categoryId} onChange={handleChange}
                                        >
                                            <option value="">Chọn danh mục</option>
                                            {categories.map((cat) => (
                                                <option key={cat._id} value={cat._id}>{cat.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="condition">Tình trạng</Label>
                                        <select
                                            id="condition" name="condition"
                                            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                            value={formData.condition} onChange={handleChange}
                                        >
                                            <option value="new">Mới</option>
                                            <option value="like_new">Như mới</option>
                                            <option value="used">Đã qua sử dụng</option>
                                        </select>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardContent className="pt-6">
                                    <div className="space-y-3">
                                        <Button type="submit" className="w-full bg-green-600 hover:bg-green-700" disabled={saving}>
                                            {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
                                        </Button>
                                        <Button type="button" variant="outline" className="w-full" onClick={() => navigate('/seller/products')}>
                                            Hủy bỏ
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}