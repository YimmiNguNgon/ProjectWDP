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
import {
    Empty,
    EmptyDescription,
    EmptyHeader,
    EmptyTitle,
} from '@/components/ui/empty';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PackageIcon, ChevronLeftIcon } from 'lucide-react';
import { formatDateTime } from '@/lib/utils';
import api from '@/lib/axios';

export default function SellerSoldPage() {
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchSellerOrders = async () => {
            try {
                setLoading(true);
                // Fetch seller's sold items using the new role query param
                const res = await api.get('/api/orders?role=seller');
                const data = Array.isArray(res?.data?.data) ? res.data.data : [];
                setOrders(data);
            } catch (err) {
                console.error('Failed to load seller orders', err);
            } finally {
                setLoading(false);
            }
        };

        fetchSellerOrders();
    }, []);

    const getStatusBadge = (status: string) => {
        const statusConfig: Record<string, { label: string; className: string }> = {
            created: { label: 'Created', className: 'text-blue-600 border-blue-200 bg-blue-50' },
            paid: { label: 'Paid', className: 'text-emerald-600 border-emerald-200 bg-emerald-50' },
            processing: { label: 'Processing', className: 'text-indigo-600 border-indigo-200 bg-indigo-50' },
            confirmed: { label: 'Confirmed', className: 'text-indigo-600 border-indigo-200 bg-indigo-50' },
            shipped: { label: 'Shipped', className: 'text-amber-600 border-amber-200 bg-amber-50' },
            delivered: { label: 'Delivered', className: 'text-green-600 border-green-200 bg-green-50' },
            cancelled: { label: 'Cancelled', className: 'text-red-600 border-red-200 bg-red-50' },
            failed: { label: 'Failed', className: 'text-red-700 border-red-300 bg-red-50' },
        };

        const config = statusConfig[status] || { label: status, className: '' };
        return (
            <Badge variant="outline" className={config.className}>
                {config.label}
            </Badge>
        );
    };

    if (loading) {
        return (
            <div className="p-4 md:p-6 max-w-7xl mx-auto">
                <p className="text-center text-muted-foreground">Loading...</p>
            </div>
        );
    }

    if (!orders.length) {
        return (
            <div className="p-4 md:p-6 max-w-6xl mx-auto">
                <Card>
                    <CardHeader className="pb-4">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-2xl font-bold flex items-center gap-2">
                                <PackageIcon className="w-6 h-6 text-primary" />
                                Sold Items
                            </CardTitle>
                            <Link
                                to="/"
                                className="text-primary hover:text-primary/80 font-medium transition-colors"
                            >
                                ← Back to Home
                            </Link>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <Empty className="border-0">
                            <EmptyHeader>
                                <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                                    <PackageIcon className="w-8 h-8 text-gray-400" />
                                </div>
                                <EmptyTitle className="text-xl">No sold items yet</EmptyTitle>
                                <EmptyDescription className="text-base">
                                    When you sell items, they will appear here.
                                </EmptyDescription>
                            </EmptyHeader>
                        </Empty>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-6 max-w-7xl mx-auto">
            <Card>
                <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-2xl font-bold flex items-center gap-2">
                            <PackageIcon className="w-6 h-6 text-primary" />
                            Sold Items
                            <Badge variant="secondary" className="ml-2">
                                {orders.length}
                            </Badge>
                        </CardTitle>
                        <div className="flex items-center gap-3">
                            <Link
                                to="/seller/feedback"
                                className="text-primary hover:text-primary/80 font-medium transition-colors flex items-center gap-1"
                            >
                                My Feedback
                            </Link>
                            <Link
                                to="/seller/auto-reply"
                                className="text-primary hover:text-primary/80 font-medium transition-colors flex items-center gap-1"
                            >
                                Auto-Reply Settings
                            </Link>
                            <Link
                                to="/seller/complaints"
                                className="text-primary hover:text-primary/80 font-medium transition-colors flex items-center gap-1"
                            >
                                View Complaints
                                <ChevronLeftIcon className="w-4 h-4 rotate-180" />
                            </Link>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="rounded-lg border">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-gray-50/50">
                                    <TableHead className="font-semibold">Order</TableHead>
                                    <TableHead className="font-semibold">Buyer</TableHead>
                                    <TableHead className="font-semibold">Products</TableHead>
                                    <TableHead className="font-semibold text-right">Total</TableHead>
                                    <TableHead className="font-semibold">Status</TableHead>
                                    <TableHead className="font-semibold">Date</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {orders.map((order) => (
                                    <TableRow
                                        key={order._id}
                                        className="hover:bg-gray-50/50 transition-colors"
                                    >
                                        <TableCell className="font-mono text-sm text-gray-600">
                                            #{order._id.slice(-8)}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                                                    <span className="text-xs font-medium text-primary">
                                                        {order.buyer?.username?.charAt(0).toUpperCase() ?? 'B'}
                                                    </span>
                                                </div>
                                                <span className="font-medium">
                                                    {order.buyer?.username ?? 'N/A'}
                                                </span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="max-w-[420px]">
                                            <div
                                                className="truncate"
                                                title={order.items
                                                    .map((it: any) => `${it.title} x ${it.quantity}`)
                                                    .join(', ')}
                                            >
                                                {order.items
                                                    .map((it: any) => `${it.title} x ${it.quantity}`)
                                                    .join(', ')}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right font-medium">
                                            ${order.totalAmount.toFixed(2)}
                                        </TableCell>
                                        <TableCell>{getStatusBadge(order.status)}</TableCell>
                                        <TableCell className="text-sm text-gray-600">
                                            {formatDateTime(order.createdAt)}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
