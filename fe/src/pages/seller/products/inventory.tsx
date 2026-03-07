import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    PackageIcon,
    AlertTriangleIcon,
    TrendingDownIcon,
    BoxIcon,
    CheckCircleIcon,
} from 'lucide-react';
import { getInventorySummary, getLowStockProducts, type Product } from '@/api/seller-products';

export default function InventoryPage() {
    const [summary, setSummary] = useState({
        totalProducts: 0,
        activeProducts: 0,
        lowStockCount: 0,
        outOfStock: 0,
    });
    const [lowStockProducts, setLowStockProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                const [summaryRes, lowStockRes] = await Promise.all([
                    getInventorySummary(),
                    getLowStockProducts(),
                ]);

                setSummary(summaryRes.data);
                setLowStockProducts(Array.isArray(lowStockRes?.data) ? lowStockRes.data : []);
            } catch (err) {
                console.error('Failed to load inventory', err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    if (loading) {
        return (
            <div className="p-4 md:p-6 max-w-7xl mx-auto">
                <p className="text-center text-muted-foreground">Loading...</p>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold flex items-center gap-2">
                    <BoxIcon className="w-8 h-8 text-primary" />
                    Inventory Management
                </h1>
                <Link to="/seller/my-listings">
                    <Button variant="outline">View All Listings</Button>
                </Link>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-gray-600">Total Products</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center justify-between">
                            <div className="text-3xl font-bold">{summary.totalProducts}</div>
                            <PackageIcon className="w-8 h-8 text-blue-500 opacity-50" />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-gray-600">Active Listings</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center justify-between">
                            <div className="text-3xl font-bold text-green-600">{summary.activeProducts}</div>
                            <CheckCircleIcon className="w-8 h-8 text-green-500 opacity-50" />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-gray-600">Low Stock</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center justify-between">
                            <div className="text-3xl font-bold text-yellow-600">{summary.lowStockCount}</div>
                            <AlertTriangleIcon className="w-8 h-8 text-yellow-500 opacity-50" />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-gray-600">Out of Stock</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center justify-between">
                            <div className="text-3xl font-bold text-red-600">{summary.outOfStock}</div>
                            <TrendingDownIcon className="w-8 h-8 text-red-500 opacity-50" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Low Stock Products */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <AlertTriangleIcon className="w-5 h-5 text-yellow-600" />
                        Low Stock Products
                        <Badge variant="secondary" className="ml-2">
                            {lowStockProducts.length}
                        </Badge>
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {lowStockProducts.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                            <CheckCircleIcon className="w-12 h-12 mx-auto mb-2 text-green-500" />
                            <p className="font-medium">All products are well-stocked!</p>
                            <p className="text-sm">No low stock alerts at this time.</p>
                        </div>
                    ) : (
                        <div className="rounded-lg border">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-gray-50/50">
                                        <TableHead className="font-semibold">Product</TableHead>
                                        <TableHead className="font-semibold text-right">Price</TableHead>
                                        <TableHead className="font-semibold text-right">Current Stock</TableHead>
                                        <TableHead className="font-semibold text-right">Threshold</TableHead>
                                        <TableHead className="font-semibold">Status</TableHead>
                                        <TableHead className="font-semibold">Variants</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {lowStockProducts.map((product) => (
                                        <TableRow key={product._id} className="hover:bg-gray-50/50">
                                            <TableCell>
                                                <div className="flex items-center gap-3">
                                                    <img
                                                        src={product.image || product.images?.[0] || '/placeholder.png'}
                                                        alt={product.title}
                                                        className="w-12 h-12 object-cover rounded border"
                                                    />
                                                    <div>
                                                        <div className="font-medium">{product.title}</div>
                                                        <div className="text-sm text-gray-500">
                                                            {product.categoryId?.name || 'Uncategorized'}
                                                        </div>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right font-medium">
                                                ${product.price.toFixed(2)}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <span
                                                    className={
                                                        product.quantity === 0
                                                            ? 'text-red-600 font-bold'
                                                            : 'text-yellow-600 font-medium'
                                                    }
                                                >
                                                    {product.quantity}
                                                </span>
                                            </TableCell>
                                            <TableCell className="text-right text-gray-600">
                                                {product.lowStockThreshold}
                                            </TableCell>
                                            <TableCell>
                                                {product.quantity === 0 ? (
                                                    <Badge variant="outline" className="bg-red-100 text-red-800 border-red-200">
                                                        Out of Stock
                                                    </Badge>
                                                ) : (
                                                    <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-200">
                                                        Low Stock
                                                    </Badge>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                {product.variants && product.variants.length > 0 ? (
                                                    <div className="text-sm">
                                                        {product.variants.map((v, i) => (
                                                            <div key={i} className="text-gray-600">
                                                                {v.name}: {v.options.length} options
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <span className="text-gray-400 text-sm">No variants</span>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
