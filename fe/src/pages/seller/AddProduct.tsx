import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Upload,
  Image as ImageIcon,
  Tag,
  DollarSign,
  Package,
  Layers,
  AlertCircle
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { createProduct } from '@/api/seller-products';
import type { ProductVariant, ProductVariantCombination } from '@/api/seller-products';
import ProductVariantsManager from '@/components/seller/product-variants-manager';
import api from '@/lib/axios';

interface Category {
  _id: string;
  name: string;
  slug: string;
}

export default function AddProduct() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [variantCombinations, setVariantCombinations] = useState<ProductVariantCombination[]>([]);
  const totalVariantStock = variantCombinations.reduce(
    (sum, combo) => sum + (Number(combo.quantity) || 0),
    0,
  );
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
      const list = res.data?.data ?? res.data ?? [];
      setCategories(list);
    }).catch(() => { });
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (!formData.title || !formData.price) {
      toast.error('Please enter product name and selling price');
      setLoading(false);
      return;
    }

    try {
      await createProduct({
        title: formData.title,
        description: formData.description,
        price: parseFloat(formData.price),
        quantity: parseInt(formData.quantity) || 0,
        condition: formData.condition,
        categoryId: formData.categoryId || undefined,
        variants,
        variantCombinations,
      });

      toast.success('Product added successfully!');
      navigate('/seller/products');
    } catch (error: any) {
      const msg = error?.response?.data?.message || 'Failed to add product';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Add New Product</h1>
          <p className="text-gray-600">Create a new product for your store</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Main Info */}
            <div className="lg:col-span-2 space-y-6">
              {/* Product Info */}
              <Card>
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
                      placeholder="Enter product name"
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
                      placeholder="Enter detailed product description..."
                      rows={6}
                      value={formData.description}
                      onChange={handleChange}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Images */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <ImageIcon className="h-5 w-5" />
                    Product Images
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                    <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 mb-2">Drag and drop images here, or click to select</p>
                    <p className="text-sm text-gray-500 mb-4">Formats: JPG, PNG, GIF. Max size 10MB</p>
                    <Button type="button" variant="outline">
                      Select Images
                    </Button>
                  </div>
                  <Alert className="mt-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Upload at least 3 high-quality images to improve conversion
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>

              {/* Variants */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Layers className="h-5 w-5" />
                    Product Variants
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-500 mb-4">
                    Add attributes like Size and Color, then define their values.
                  </p>
                  <ProductVariantsManager
                    variants={variants}
                    onChange={setVariants}
                    variantCombinations={variantCombinations}
                    basePrice={parseFloat(formData.price) || 0}
                    onCombinationsChange={setVariantCombinations}
                  />
                </CardContent>
              </Card>
            </div>

            {/* Right Column - Pricing & Details */}
            <div className="space-y-6">
              {/* Pricing */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <DollarSign className="h-5 w-5" />
                    Price & Stock
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="price">Selling Price *</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-gray-500">$</span>
                      <Input
                        id="price"
                        name="price"
                        type="number"
                        placeholder="0.00"
                        className="pl-8"
                        value={formData.price}
                        onChange={handleChange}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="quantity">Stock Quantity</Label>
                    <div className="relative">
                      <Package className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
                      <Input
                        id="quantity"
                        name="quantity"
                        type="number"
                        placeholder="Quantity"
                        className="pl-10"
                        value={variantCombinations.length > 0 ? String(totalVariantStock) : formData.quantity}
                        onChange={handleChange}
                        disabled={variantCombinations.length > 0}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="categoryId">Category</Label>
                    <select
                      id="categoryId"
                      name="categoryId"
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={formData.categoryId}
                      onChange={handleChange}
                    >
                      <option value="">Select category</option>
                      {categories.map(cat => (
                        <option key={cat._id} value={cat._id}>{cat.name}</option>
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

              {/* Action Buttons */}
              <Card>
                <CardContent className="pt-6">
                  <div className="space-y-3">
                    <Button
                      type="submit"
                      className="w-full bg-green-600 hover:bg-green-700"
                      disabled={loading}
                    >
                      {loading ? 'Processing...' : 'Add Product'}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full"
                      onClick={() => navigate('/seller/products')}
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






