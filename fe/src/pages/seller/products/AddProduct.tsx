import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
} from "lucide-react";
import { toast } from "sonner";
import { createProduct } from "@/api/seller-products";
import type {
  ProductVariant,
  ProductVariantCombination,
} from "@/api/seller-products";
import ProductVariantsManager from "@/components/seller/product-variants-manager";
import api from "@/lib/axios";

interface Category {
  _id: string;
  name: string;
  slug: string;
}

interface ImageFile {
  file: File;
  previewUrl: string;
  uploading: boolean;
  uploadedUrl?: string;
  error?: string;
}

const MAX_IMAGES = 5;
const numericInputClass =
  "h-12 text-lg font-semibold tracking-wide transition-[box-shadow,border-color,background-color] duration-200 focus-visible:shadow-sm focus-visible:ring-2 focus-visible:ring-blue-200";

export default function AddProduct() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [variantCombinations, setVariantCombinations] = useState<
    ProductVariantCombination[]
  >([]);
  const [imageFiles, setImageFiles] = useState<ImageFile[]>([]);

  const totalVariantStock = variantCombinations.reduce(
    (sum, combo) => sum + (Number(combo.quantity) || 0),
    0,
  );

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    price: "",
    saleEnabled: false,
    discountPercent: "",
    saleStartDate: "",
    saleEndDate: "",
    quantity: "",
    condition: "new",
    categoryId: "",
  });

  useEffect(() => {
    api
      .get("/api/categories")
      .then((res) => {
        const list = res.data?.data ?? res.data ?? [];
        setCategories(list);
      })
      .catch(() => {});

    // Cleanup preview URLs khi unmount
    return () => {
      imageFiles.forEach((img) => URL.revokeObjectURL(img.previewUrl));
    };
  }, []);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // ── Xử lý chọn file ──────────────────────────────────────────────────────────
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;

    const remaining = MAX_IMAGES - imageFiles.length;
    if (remaining <= 0) {
      toast.error(`Maximum ${MAX_IMAGES} images`);
      return;
    }

    const accepted = files.slice(0, remaining);
    const newImages: ImageFile[] = accepted.map((file) => ({
      file,
      previewUrl: URL.createObjectURL(file),
      uploading: false,
    }));

    setImageFiles((prev) => [...prev, ...newImages]);

    // Reset input để có thể chọn lại cùng file
    e.target.value = "";
  };

  // ── Kéo thả ──────────────────────────────────────────────────────────────────
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files).filter((f) =>
      f.type.startsWith("image/"),
    );
    if (!files.length) return;

    const remaining = MAX_IMAGES - imageFiles.length;
    const accepted = files.slice(0, remaining);
    const newImages: ImageFile[] = accepted.map((file) => ({
      file,
      previewUrl: URL.createObjectURL(file),
      uploading: false,
    }));
    setImageFiles((prev) => [...prev, ...newImages]);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) =>
    e.preventDefault();

  // ── Xoá ảnh ──────────────────────────────────────────────────────────────────
  const removeImage = (idx: number) => {
    setImageFiles((prev) => {
      URL.revokeObjectURL(prev[idx].previewUrl);
      return prev.filter((_, i) => i !== idx);
    });
  };

  // ── Set ảnh đại diện (đưa lên đầu) ───────────────────────────────────────────
  const setMainImage = (idx: number) => {
    if (idx === 0) return;
    setImageFiles((prev) => {
      const copy = [...prev];
      const [main] = copy.splice(idx, 1);
      copy.unshift(main);
      return copy;
    });
    toast.success("Set to main image successfully");
  };

  // ── Upload tất cả ảnh lên Cloudinary ─────────────────────────────────────────
  const uploadAllImages = async (): Promise<string[]> => {
    if (imageFiles.length === 0) return [];

    // Mark all as uploading
    setImageFiles((prev) => prev.map((img) => ({ ...img, uploading: true })));

    const formDataUpload = new FormData();
    imageFiles.forEach((img) => formDataUpload.append("images", img.file));

    const res = await api.post("/api/upload/product-images", formDataUpload, {
      headers: { "Content-Type": "multipart/form-data" },
    });

    const urls: string[] = res.data.urls ?? [];

    setImageFiles((prev) =>
      prev.map((img, i) => ({
        ...img,
        uploading: false,
        uploadedUrl: urls[i],
      })),
    );

    return urls;
  };

  // ── Submit form ───────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const hasVariants = variantCombinations.length > 0;
    if (!formData.title || !formData.categoryId) {
      toast.error("Please enter product's name and category");
      return;
    }
    if (!hasVariants && !formData.price) {
      toast.error("Please enter selling price");
      return;
    }

    const variantPrices = variantCombinations
      .map((c) => c.price)
      .filter((p): p is number => p !== undefined && p > 0);
    const effectiveBasePrice = hasVariants
      ? (variantPrices.length > 0 ? Math.min(...variantPrices) : 0)
      : parseFloat(formData.price) || 0;

    let computedSalePrice: number | undefined;
    if (formData.saleEnabled) {
      const pct = parseFloat(formData.discountPercent);
      if (!formData.discountPercent || !Number.isFinite(pct) || pct <= 0 || pct >= 100) {
        toast.error("Discount must be between 1% and 99%");
        return;
      }
      if (!formData.saleStartDate || !formData.saleEndDate) {
        toast.error("Please fill in sale start and end time");
        return;
      }
      if (new Date(formData.saleStartDate) >= new Date(formData.saleEndDate)) {
        toast.error("Start time must be before end time!");
        return;
      }
      if (effectiveBasePrice <= 0) {
        toast.error("Please set variant prices before enabling sale");
        return;
      }
      computedSalePrice = parseFloat((effectiveBasePrice * (1 - pct / 100)).toFixed(2));
    }

    setLoading(true);
    try {
      // Upload ảnh trước nếu có
      let imageUrls: string[] = [];
      if (imageFiles.length > 0) {
        toast.info("Uploading image...");
        imageUrls = await uploadAllImages();
      }

      await createProduct({
        title: formData.title,
        description: formData.description,
        price: hasVariants ? effectiveBasePrice : parseFloat(formData.price),
        saleEnabled: formData.saleEnabled,
        salePrice: formData.saleEnabled ? computedSalePrice : undefined,
        saleStartDate: formData.saleEnabled ? formData.saleStartDate : undefined,
        saleEndDate: formData.saleEnabled ? formData.saleEndDate : undefined,
        quantity: parseInt(formData.quantity) || 0,
        condition: formData.condition,
        categoryId: formData.categoryId,
        image: imageUrls[0] ?? "",
        images: imageUrls,
        variants,
        variantCombinations,
      });

      toast.success("Product add successfully!");
      navigate("/seller/products");
    } catch (error: any) {
      const msg =
        error?.response?.data?.message || "Error occur when adding product.";
      toast.error(msg);
      // Nếu lỗi xảy ra sau upload thì reset uploading state
      setImageFiles((prev) =>
        prev.map((img) => ({ ...img, uploading: false })),
      );
    } finally {
      setLoading(false);
    }
  };

  const isUploading = imageFiles.some((img) => img.uploading);

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Add Product</h1>
          <p className="text-gray-600">Creating new product for your shop</p>
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
                      id="title"
                      name="title"
                      placeholder="Enter product name here"
                      value={formData.title}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Product Description</Label>
                    <Textarea
                      id="description"
                      name="description"
                      placeholder="Detail description about the product..."
                      rows={6}
                      value={formData.description}
                      onChange={handleChange}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* ── Image Upload ── */}
              <Card className="shadow-sm border-0 ring-1 ring-gray-100">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <ImagePlus className="h-5 w-5" />
                    Product Images
                    <span className="ml-auto text-sm font-normal text-muted-foreground">
                      {imageFiles.length}/{MAX_IMAGES}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Drop zone */}
                  {imageFiles.length < MAX_IMAGES && (
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
                        JPG, PNG, WEBP · Maximum 5MB/image · Maximum{" "}
                        {MAX_IMAGES} images
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
                  {imageFiles.length > 0 && (
                    <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
                      {imageFiles.map((img, idx) => (
                        <div key={idx} className="relative group aspect-square">
                          <img
                            src={img.previewUrl}
                            alt={`product-${idx}`}
                            className={`w-full h-full object-cover rounded-lg border-2 transition-all ${
                              idx === 0
                                ? "border-primary ring-2 ring-primary/30"
                                : "border-border"
                            }`}
                          />

                          {/* Uploading overlay */}
                          {img.uploading && (
                            <div className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center">
                              <Loader2 className="h-6 w-6 text-white animate-spin" />
                            </div>
                          )}

                          {/* Main label */}
                          {idx === 0 && !img.uploading && (
                            <div className="absolute bottom-1 left-1 right-1 bg-primary/90 text-white text-[10px] font-medium text-center rounded py-0.5">
                              Main Image
                            </div>
                          )}

                          {/* Action buttons (hover) */}
                          {!img.uploading && (
                            <div className="absolute inset-0 bg-black/40 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                              {/* Set as main */}
                              {idx !== 0 && (
                                <button
                                  type="button"
                                  onClick={() => setMainImage(idx)}
                                  title="Set to Main Image"
                                  className="w-7 h-7 bg-white/90 rounded-full flex items-center justify-center hover:bg-white"
                                >
                                  <Star className="h-3.5 w-3.5 text-amber-500" />
                                </button>
                              )}
                              {/* Remove */}
                              <button
                                type="button"
                                onClick={() => removeImage(idx)}
                                title="Delete Image"
                                className="w-7 h-7 bg-white/90 rounded-full flex items-center justify-center hover:bg-red-50"
                              >
                                <X className="h-3.5 w-3.5 text-red-500" />
                              </button>
                            </div>
                          )}
                        </div>
                      ))}

                      {/* Add more button */}
                      {imageFiles.length < MAX_IMAGES && (
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

                  {imageFiles.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      💡 Hover in image to delete or set the image to main
                      image. The first image will be set to main image.
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
                    Add characteristics such as Size, Color... and list the
                    corresponding values.
                  </p>
                  <ProductVariantsManager
                    variants={variants}
                    onChange={setVariants}
                    variantCombinations={variantCombinations}
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
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                          $
                        </span>
                        <Input
                          id="price"
                          name="price"
                          type="number"
                          placeholder="0.00"
                          className={`pl-8 ${numericInputClass}`}
                          value={formData.price}
                          onChange={handleChange}
                          min="0"
                          step="0.01"
                        />
                      </div>
                    )}
                  </div>

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
                          setFormData((prev) => ({
                            ...prev,
                            saleEnabled: e.target.checked,
                          }))
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
                          {(() => {
                            const pct = parseFloat(formData.discountPercent);
                            const hasVariants = variantCombinations.length > 0;
                            if (!Number.isFinite(pct) || pct <= 0) return null;
                            if (hasVariants) {
                              const prices = variantCombinations
                                .map((c) => c.price)
                                .filter((p): p is number => p !== undefined && p > 0);
                              if (prices.length === 0) return null;
                              const min = parseFloat((Math.min(...prices) * (1 - pct / 100)).toFixed(2));
                              const max = parseFloat((Math.max(...prices) * (1 - pct / 100)).toFixed(2));
                              return (
                                <p className="text-xs text-red-600 font-medium">
                                  After discount: <span className="font-bold">
                                    {min === max ? `$${min.toFixed(2)}` : `$${min.toFixed(2)} - $${max.toFixed(2)}`}
                                  </span>
                                </p>
                              );
                            }
                            const base = parseFloat(formData.price);
                            if (!base) return null;
                            return (
                              <p className="text-xs text-red-600 font-medium">
                                After discount: <span className="font-bold">${(base * (1 - pct / 100)).toFixed(2)}</span>
                              </p>
                            );
                          })()}
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

                  <div className="space-y-2">
                    <Label htmlFor="quantity">Stock</Label>
                    <div className="relative">
                      <Package className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                      <Input
                        id="quantity"
                        name="quantity"
                        type="number"
                        placeholder="Stock"
                        className={`pl-10 ${numericInputClass}`}
                        value={
                          variantCombinations.length > 0
                            ? String(totalVariantStock)
                            : formData.quantity
                        }
                        onChange={handleChange}
                        disabled={variantCombinations.length > 0}
                        min="0"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="categoryId">Category *</Label>
                    <select
                      id="categoryId"
                      name="categoryId"
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={formData.categoryId}
                      onChange={handleChange}
                      required
                    >
                      <option value="">Select category</option>
                      {categories.map((cat) => (
                        <option key={cat._id} value={cat._id}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="condition">Condition</Label>
                    <select
                      id="condition"
                      name="condition"
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
                      className="w-full"
                      disabled={loading || isUploading}
                    >
                      {loading || isUploading ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          {isUploading ? "Loading Image..." : "Saving..."}
                        </>
                      ) : (
                        "Create Product"
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full"
                      onClick={() => navigate("/seller/products")}
                      disabled={loading || isUploading}
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
