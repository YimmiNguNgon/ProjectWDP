import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Upload,
    Tag,
    DollarSign,
    Package,
    Layers,
    X,
    ImagePlus,
    Loader2,
    Star,
    Percent,
    ArrowLeft,
} from 'lucide-react';
import { toast } from 'sonner';
import {
    updateProduct,
    type ProductVariant,
    type ProductVariantCombination,
} from '@/api/seller-products';
import ProductVariantsManager from '@/components/seller/product-variants-manager';
import api from '@/lib/axios';

interface Category {
    _id: string;
    name: string;
}

interface NewImageFile {
    file: File;
    previewUrl: string;
    uploading: boolean;
    uploadedUrl?: string;
}

const MAX_IMAGES = 5;
const numericInputClass =
    "h-12 text-lg font-semibold tracking-wide transition-[box-shadow,border-color,background-color] duration-200 focus-visible:shadow-sm focus-visible:ring-2 focus-visible:ring-blue-200";

const getErrorMessage = (error: unknown, fallback: string) => {
    if (
        typeof error === "object" &&
        error !== null &&
        "response" in error &&
        typeof error.response === "object" &&
        error.response !== null &&
        "data" in error.response &&
        typeof error.response.data === "object" &&
        error.response.data !== null &&
        "message" in error.response.data &&
        typeof error.response.data.message === "string"
    ) {
        return error.response.data.message;
    }

    return fallback;
};

const toInputDateTime = (value?: string | null) => {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    const offset = date.getTimezoneOffset();
    const local = new Date(date.getTime() - offset * 60000);
    return local.toISOString().slice(0, 16);
};

export default function EditProduct() {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const newImageFilesRef = useRef<NewImageFile[]>([]);

    const [pageLoading, setPageLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [categories, setCategories] = useState<Category[]>([]);
    const [variants, setVariants] = useState<ProductVariant[]>([]);
    const [variantCombinations, setVariantCombinations] = useState<ProductVariantCombination[]>([]);

    // Existing uploaded images (URLs)
    const [existingImages, setExistingImages] = useState<string[]>([]);
    // New files not yet uploaded
    const [newImageFiles, setNewImageFiles] = useState<NewImageFile[]>([]);

    const totalImages = existingImages.length + newImageFiles.length;

    const totalVariantStock = variantCombinations.reduce(
        (sum, combo) => sum + (Number(combo.quantity) || 0),
        0,
    );

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        price: '',
        saleEnabled: false,
        discountPercent: '',
        saleStartDate: '',
        saleEndDate: '',
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
        newImageFilesRef.current = newImageFiles;
    }, [newImageFiles]);

    useEffect(() => {
        return () => {
            newImageFilesRef.current.forEach((img) => URL.revokeObjectURL(img.previewUrl));
        };
    }, []);

    useEffect(() => {
        if (!id) return;
        api.get(`/api/products/${id}`)
            .then((res) => {
                const p = res.data?.data ?? res.data;
                setFormData({
                    title: p.title ?? '',
                    description: p.description ?? '',
                    price: String(p.basePrice ?? p.originalPrice ?? p.price ?? ''),
                    saleEnabled: Boolean(p.promotionType === 'daily_deal' || p.discountPercent),
                    discountPercent: p.discountPercent ? String(p.discountPercent) : '',
                    saleStartDate: toInputDateTime(p.saleStartDate ?? p.dealStartDate),
                    saleEndDate: toInputDateTime(p.saleEndDate ?? p.dealEndDate),
                    quantity: String(p.quantity ?? ''),
                    condition: p.condition ?? 'new',
                    categoryId: p.categoryId?._id ?? p.categoryId ?? '',
                });
                // images[] is the authoritative list (includes all images, main is index 0)
                // Fallback: if images[] empty but image exists, use it
                if (p.images?.length > 0) {
                    setExistingImages(p.images);
                } else if (p.image) {
                    setExistingImages([p.image]);
                }
                setVariants(p.variants ?? []);
                setVariantCombinations(p.variantCombinations ?? []);
            })
            .catch(() => {
                toast.error('Unable to load product information');
                navigate('/seller/products');
            })
            .finally(() => setPageLoading(false));
    }, [id, navigate]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    // ── Image handlers ────────────────────────────────────────────────────────

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files ?? []);
        if (!files.length) return;
        const remaining = MAX_IMAGES - totalImages;
        if (remaining <= 0) {
            toast.error(`Maximum ${MAX_IMAGES} images`);
            return;
        }
        const accepted = files.slice(0, remaining);
        const newImgs: NewImageFile[] = accepted.map((file) => ({
            file,
            previewUrl: URL.createObjectURL(file),
            uploading: false,
        }));
        setNewImageFiles((prev) => [...prev, ...newImgs]);
        e.target.value = "";
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        const files = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith("image/"));
        if (!files.length) return;
        const remaining = MAX_IMAGES - totalImages;
        const accepted = files.slice(0, remaining);
        const newImgs: NewImageFile[] = accepted.map((file) => ({
            file,
            previewUrl: URL.createObjectURL(file),
            uploading: false,
        }));
        setNewImageFiles((prev) => [...prev, ...newImgs]);
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => e.preventDefault();

    const removeExistingImage = (index: number) => {
        setExistingImages((prev) => prev.filter((_, i) => i !== index));
    };

    const removeNewImage = (index: number) => {
        setNewImageFiles((prev) => {
            URL.revokeObjectURL(prev[index].previewUrl);
            return prev.filter((_, i) => i !== index);
        });
    };

    // Move an existing image to position 0 (main)
    const setMainExisting = (index: number) => {
        if (index === 0 && existingImages.length > 0) return;
        setExistingImages((prev) => {
            const copy = [...prev];
            const [item] = copy.splice(index, 1);
            copy.unshift(item);
            return copy;
        });
        toast.success("Set to main image successfully");
    };

    // Move a new image to position 0 overall (needs to become first existing after upload,
    // but for now just reorder within newImageFiles and ensure it goes before all new)
    const setMainNew = (newIndex: number) => {
        if (existingImages.length === 0 && newIndex === 0) return;
        setNewImageFiles((prev) => {
            const copy = [...prev];
            const [item] = copy.splice(newIndex, 1);
            copy.unshift(item);
            return copy;
        });
        if (existingImages.length === 0) {
            toast.success("Set to main image successfully");
        }
    };

    const uploadNewImages = async (): Promise<string[]> => {
        if (newImageFiles.length === 0) return [];
        setNewImageFiles((prev) => prev.map((img) => ({ ...img, uploading: true })));
        const fd = new FormData();
        newImageFiles.forEach((img) => fd.append('images', img.file));
        const res = await api.post('/api/upload/product-images', fd, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        const urls: string[] = res.data.urls ?? [];
        setNewImageFiles((prev) =>
            prev.map((img, i) => ({ ...img, uploading: false, uploadedUrl: urls[i] })),
        );
        return urls;
    };

    // ── Effective base price ──────────────────────────────────────────────────

    const getEffectiveBasePrice = () => {
        if (variantCombinations.length > 0) {
            const prices = variantCombinations
                .map((c) => c.price)
                .filter((p): p is number => p !== undefined && p > 0);
            return prices.length > 0 ? Math.min(...prices) : 0;
        }
        return parseFloat(formData.price) || 0;
    };

    // ── Submit ────────────────────────────────────────────────────────────────

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const hasVariants = variantCombinations.length > 0;

        if (!formData.title) {
            toast.error('Please enter product name');
            return;
        }
        if (!hasVariants && !formData.price) {
            toast.error('Please enter selling price');
            return;
        }

        const effectiveBasePrice = getEffectiveBasePrice();
        let computedSalePrice: number | undefined;

        if (formData.saleEnabled) {
            const pct = parseFloat(formData.discountPercent);
            if (!formData.discountPercent || !Number.isFinite(pct) || pct <= 0 || pct >= 100) {
                toast.error('Discount must be between 1% and 99%');
                return;
            }
            if (!formData.saleStartDate || !formData.saleEndDate) {
                toast.error('Please fill in sale start and end time');
                return;
            }
            if (new Date(formData.saleStartDate) >= new Date(formData.saleEndDate)) {
                toast.error('Sale start time must be before end time');
                return;
            }
            if (effectiveBasePrice <= 0) {
                toast.error('Please set variant prices before enabling sale');
                return;
            }
            computedSalePrice = parseFloat((effectiveBasePrice * (1 - pct / 100)).toFixed(2));
        }

        setSaving(true);
        try {
            let newUrls: string[] = [];
            if (newImageFiles.length > 0) {
                toast.info("Uploading images...");
                newUrls = await uploadNewImages();
            }
            const allImages = [...existingImages, ...newUrls];

            await updateProduct(id!, {
                title: formData.title,
                description: formData.description,
                price: hasVariants ? effectiveBasePrice : parseFloat(formData.price),
                saleEnabled: formData.saleEnabled,
                salePrice: formData.saleEnabled ? computedSalePrice : undefined,
                saleStartDate: formData.saleEnabled ? formData.saleStartDate : undefined,
                saleEndDate: formData.saleEnabled ? formData.saleEndDate : undefined,
                quantity: parseInt(formData.quantity) || 0,
                condition: formData.condition,
                categoryId: formData.categoryId || undefined,
                image: allImages[0] ?? "",
                images: allImages,
                variants,
                variantCombinations,
            });
            toast.success('Product updated successfully!');
            navigate('/seller/products');
        } catch (error: unknown) {
            toast.error(getErrorMessage(error, 'Failed to update product'));
            setNewImageFiles((prev) => prev.map((img) => ({ ...img, uploading: false })));
        } finally {
            setSaving(false);
        }
    };

    const isUploading = newImageFiles.some((img) => img.uploading);

    // ── Sale price preview ────────────────────────────────────────────────────

    const getSalePricePreview = () => {
        const pct = parseFloat(formData.discountPercent);
        if (!formData.saleEnabled || !Number.isFinite(pct) || pct <= 0) return null;
        if (variantCombinations.length > 0) {
            const prices = variantCombinations
                .map((c) => c.price)
                .filter((p): p is number => p !== undefined && p > 0);
            if (prices.length === 0) return null;
            const min = parseFloat((Math.min(...prices) * (1 - pct / 100)).toFixed(2));
            const max = parseFloat((Math.max(...prices) * (1 - pct / 100)).toFixed(2));
            return min === max ? `$${min.toFixed(2)}` : `$${min.toFixed(2)} - $${max.toFixed(2)}`;
        }
        const base = parseFloat(formData.price);
        if (!base) return null;
        return `$${(base * (1 - pct / 100)).toFixed(2)}`;
    };

    if (pageLoading) {
        return (
            <div className="p-6 flex items-center justify-center h-64">
                <p className="text-gray-500">Loading product information...</p>
            </div>
        );
    }

    const salePricePreview = getSalePricePreview();

    return (
        <div className="p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8 flex items-center gap-4">
                    <Button variant="ghost" onClick={() => navigate('/seller/products')} className="flex items-center gap-2">
                        <ArrowLeft className="h-4 w-4" />
                        Back
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Edit Product</h1>
                        <p className="text-gray-600">Update your product information</p>
                    </div>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                        {/* Left Column */}
                        <div className="lg:col-span-3 space-y-6">
                            {/* Product Info */}
                            <Card className="shadow-sm border-0 ring-1 ring-gray-100">
                                <CardHeader>
                                    <CardTitle className="text-lg flex items-center gap-2">
                                        <Tag className="h-5 w-5" />
                                        Product Information
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="title">Product Name *</Label>
                                        <Input
                                            id="title" name="title"
                                            placeholder="Enter product name here"
                                            value={formData.title}
                                            onChange={handleChange}
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="description">Product Description</Label>
                                        <Textarea
                                            id="description" name="description"
                                            placeholder="Detail description about the product..."
                                            rows={6}
                                            value={formData.description}
                                            onChange={handleChange}
                                        />
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Images */}
                            <Card className="shadow-sm border-0 ring-1 ring-gray-100">
                                <CardHeader>
                                    <CardTitle className="text-lg flex items-center gap-2">
                                        <ImagePlus className="h-5 w-5" />
                                        Product Images
                                        <span className="ml-auto text-sm font-normal text-muted-foreground">
                                            {totalImages}/{MAX_IMAGES}
                                        </span>
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {/* Drop zone */}
                                    {totalImages < MAX_IMAGES && (
                                        <div
                                            className="border-2 border-dashed border-border rounded-xl p-8 text-center cursor-pointer hover:border-primary hover:bg-primary/5 transition-colors select-none"
                                            onClick={() => fileInputRef.current?.click()}
                                            onDrop={handleDrop}
                                            onDragOver={handleDragOver}
                                        >
                                            <Upload className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                                            <p className="text-sm font-medium text-foreground mb-1">
                                                Drag image here or click to select image
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                JPG, PNG, WEBP · Maximum 5MB/image · Maximum {MAX_IMAGES} images
                                            </p>
                                            <input
                                                ref={fileInputRef}
                                                type="file"
                                                accept="image/*"
                                                multiple
                                                className="hidden"
                                                onChange={handleFileSelect}
                                            />
                                        </div>
                                    )}

                                    {/* Preview grid */}
                                    {totalImages > 0 && (
                                        <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
                                            {/* Existing images */}
                                            {existingImages.map((url, idx) => (
                                                <div key={`existing-${idx}`} className="relative group aspect-square">
                                                    <img
                                                        src={url}
                                                        alt={`product-${idx}`}
                                                        className={`w-full h-full object-cover rounded-lg border-2 transition-all ${
                                                            idx === 0 && newImageFiles.length === 0
                                                                ? "border-primary ring-2 ring-primary/30"
                                                                : "border-border"
                                                        }`}
                                                    />
                                                    {idx === 0 && newImageFiles.length === 0 && (
                                                        <div className="absolute bottom-1 left-1 right-1 bg-primary/90 text-white text-[10px] font-medium text-center rounded py-0.5">
                                                            Main Image
                                                        </div>
                                                    )}
                                                    <div className="absolute inset-0 bg-black/40 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                                        {!(idx === 0 && newImageFiles.length === 0) && (
                                                            <button
                                                                type="button"
                                                                onClick={() => setMainExisting(idx)}
                                                                title="Set to Main Image"
                                                                className="w-7 h-7 bg-white/90 rounded-full flex items-center justify-center hover:bg-white"
                                                            >
                                                                <Star className="h-3.5 w-3.5 text-amber-500" />
                                                            </button>
                                                        )}
                                                        <button
                                                            type="button"
                                                            onClick={() => removeExistingImage(idx)}
                                                            title="Delete Image"
                                                            className="w-7 h-7 bg-white/90 rounded-full flex items-center justify-center hover:bg-red-50"
                                                        >
                                                            <X className="h-3.5 w-3.5 text-red-500" />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}

                                            {/* New files */}
                                            {newImageFiles.map((img, idx) => (
                                                <div key={`new-${idx}`} className="relative group aspect-square">
                                                    <img
                                                        src={img.previewUrl}
                                                        alt={`new-${idx}`}
                                                        className={`w-full h-full object-cover rounded-lg border-2 transition-all ${
                                                            existingImages.length === 0 && idx === 0
                                                                ? "border-primary ring-2 ring-primary/30"
                                                                : "border-border"
                                                        }`}
                                                    />
                                                    {img.uploading && (
                                                        <div className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center">
                                                            <Loader2 className="h-6 w-6 text-white animate-spin" />
                                                        </div>
                                                    )}
                                                    {existingImages.length === 0 && idx === 0 && !img.uploading && (
                                                        <div className="absolute bottom-1 left-1 right-1 bg-primary/90 text-white text-[10px] font-medium text-center rounded py-0.5">
                                                            Main Image
                                                        </div>
                                                    )}
                                                    {!img.uploading && (
                                                        <div className="absolute inset-0 bg-black/40 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                                            {!(existingImages.length === 0 && idx === 0) && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setMainNew(idx)}
                                                                    title="Set to Main Image"
                                                                    className="w-7 h-7 bg-white/90 rounded-full flex items-center justify-center hover:bg-white"
                                                                >
                                                                    <Star className="h-3.5 w-3.5 text-amber-500" />
                                                                </button>
                                                            )}
                                                            <button
                                                                type="button"
                                                                onClick={() => removeNewImage(idx)}
                                                                title="Delete Image"
                                                                className="w-7 h-7 bg-white/90 rounded-full flex items-center justify-center hover:bg-red-50"
                                                            >
                                                                <X className="h-3.5 w-3.5 text-red-500" />
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            ))}

                                            {/* Add more */}
                                            {totalImages < MAX_IMAGES && (
                                                <button
                                                    type="button"
                                                    onClick={() => fileInputRef.current?.click()}
                                                    className="aspect-square rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center text-muted-foreground hover:border-primary hover:text-primary transition-colors"
                                                >
                                                    <ImagePlus className="h-5 w-5 mb-1" />
                                                    <span className="text-xs">Add</span>
                                                </button>
                                            )}
                                        </div>
                                    )}

                                    {totalImages > 0 && (
                                        <p className="text-xs text-muted-foreground">
                                            💡 Hover on image to delete or set as main image. The first image will be the main image.
                                        </p>
                                    )}
                                </CardContent>
                            </Card>

                            {/* Variants */}
                            <Card className="shadow-sm border-0 ring-1 ring-gray-100">
                                <CardHeader>
                                    <CardTitle className="text-lg flex items-center gap-2">
                                        <Layers className="h-5 w-5" />
                                        Product Variants
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-sm text-gray-500 mb-4">
                                        Add characteristics such as Size, Color... and list the corresponding values.
                                    </p>
                                    <ProductVariantsManager
                                        variants={variants}
                                        onChange={setVariants}
                                        variantCombinations={variantCombinations}
                                        basePrice={parseFloat(formData.price) || 0}
                                        onCombinationsChange={setVariantCombinations}
                                        showSkuFields={false}
                                    />
                                </CardContent>
                            </Card>
                        </div>

                        {/* Right Column */}
                        <div className="space-y-6">
                            {/* Pricing */}
                            <Card className="shadow-sm border-0 ring-1 ring-gray-100">
                                <CardHeader>
                                    <CardTitle className="text-lg flex items-center gap-2">
                                        <DollarSign className="h-5 w-5" />
                                        Prices & Stock
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {/* Price */}
                                    <div className="space-y-2">
                                        <Label htmlFor="price">Price *</Label>
                                        {variantCombinations.length > 0 ? (() => {
                                            const prices = variantCombinations
                                                .map((c) => c.price)
                                                .filter((p): p is number => p !== undefined && p > 0);
                                            const min = prices.length > 0 ? Math.min(...prices) : null;
                                            const max = prices.length > 0 ? Math.max(...prices) : null;
                                            return (
                                                <div className={`flex items-center pl-4 pr-3 rounded-md border border-input bg-muted/50 ${numericInputClass}`}>
                                                    <span className="text-gray-500 mr-1">$</span>
                                                    <span className="text-gray-700">
                                                        {min !== null && max !== null
                                                            ? min === max
                                                                ? min.toFixed(2)
                                                                : `${min.toFixed(2)} - ${max.toFixed(2)}`
                                                            : "Set per variant below"}
                                                    </span>
                                                </div>
                                            );
                                        })() : (
                                            <div className="relative">
                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                                                <Input
                                                    id="price" name="price" type="number" placeholder="0.00"
                                                    className={`pl-8 ${numericInputClass}`}
                                                    value={formData.price}
                                                    onChange={handleChange}
                                                    min="0"
                                                    step="0.01"
                                                />
                                            </div>
                                        )}
                                    </div>

                                    {/* Sale Discount */}
                                    <div className="rounded-xl border border-dashed border-red-300 p-4 bg-red-50/40 space-y-3">
                                        <label className="flex items-center justify-between cursor-pointer">
                                            <span className="font-medium text-sm flex items-center gap-2">
                                                <Percent className="h-4 w-4 text-red-500" />
                                                Sale Discount
                                            </span>
                                            <input
                                                type="checkbox"
                                                className="w-4 h-4 accent-red-500"
                                                checked={formData.saleEnabled}
                                                onChange={(e) =>
                                                    setFormData((prev) => ({ ...prev, saleEnabled: e.target.checked }))
                                                }
                                            />
                                        </label>

                                        {formData.saleEnabled && (
                                            <div className="space-y-3 pt-1">
                                                <div className="space-y-1">
                                                    <Label htmlFor="discountPercent" className="text-xs">Discount % *</Label>
                                                    <div className="relative">
                                                        <Input
                                                            id="discountPercent"
                                                            name="discountPercent"
                                                            type="number"
                                                            min="1"
                                                            max="99"
                                                            step="1"
                                                            placeholder="e.g. 20"
                                                            value={formData.discountPercent}
                                                            onChange={handleChange}
                                                            className={`pr-8 ${numericInputClass}`}
                                                        />
                                                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">%</span>
                                                    </div>
                                                    {salePricePreview && (
                                                        <p className="text-xs text-red-600 font-medium">
                                                            After discount: <span className="font-bold">{salePricePreview}</span>
                                                        </p>
                                                    )}
                                                </div>
                                                <div className="grid grid-cols-2 gap-2">
                                                    <div className="space-y-1">
                                                        <Label htmlFor="saleStartDate" className="text-xs">Start *</Label>
                                                        <Input
                                                            id="saleStartDate"
                                                            name="saleStartDate"
                                                            type="datetime-local"
                                                            value={formData.saleStartDate}
                                                            onChange={handleChange}
                                                            className="h-10 text-sm"
                                                        />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <Label htmlFor="saleEndDate" className="text-xs">End *</Label>
                                                        <Input
                                                            id="saleEndDate"
                                                            name="saleEndDate"
                                                            type="datetime-local"
                                                            value={formData.saleEndDate}
                                                            onChange={handleChange}
                                                            className="h-10 text-sm"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Stock */}
                                    <div className="space-y-2">
                                        <Label htmlFor="quantity">Stock</Label>
                                        <div className="relative">
                                            <Package className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                                            <Input
                                                id="quantity" name="quantity" type="number" placeholder="Stock"
                                                className={`pl-10 ${numericInputClass}`}
                                                value={variantCombinations.length > 0 ? String(totalVariantStock) : formData.quantity}
                                                onChange={handleChange}
                                                disabled={variantCombinations.length > 0}
                                                min="0"
                                            />
                                        </div>
                                    </div>

                                    {/* Category */}
                                    <div className="space-y-2">
                                        <Label htmlFor="categoryId">Category *</Label>
                                        <select
                                            id="categoryId" name="categoryId"
                                            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                            value={formData.categoryId}
                                            onChange={handleChange}
                                            required
                                        >
                                            <option value="">Select category</option>
                                            {categories.map((cat) => (
                                                <option key={cat._id} value={cat._id}>{cat.name}</option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Condition */}
                                    <div className="space-y-2">
                                        <Label htmlFor="condition">Condition</Label>
                                        <select
                                            id="condition" name="condition"
                                            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                            value={formData.condition}
                                            onChange={handleChange}
                                        >
                                            <option value="new">New</option>
                                            <option value="like_new">Like New</option>
                                            <option value="used">Used</option>
                                        </select>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Actions */}
                            <Card className="shadow-sm border-0 ring-1 ring-gray-100">
                                <CardContent className="pt-6">
                                    <div className="space-y-3">
                                        <Button
                                            type="submit"
                                            className="w-full bg-green-600 hover:bg-green-700"
                                            disabled={saving || isUploading}
                                        >
                                            {saving || isUploading ? (
                                                <>
                                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                                    {isUploading ? "Uploading Images..." : "Saving..."}
                                                </>
                                            ) : (
                                                "Save Changes"
                                            )}
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            className="w-full"
                                            onClick={() => navigate('/seller/products')}
                                            disabled={saving || isUploading}
                                        >
                                            Cancel
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
