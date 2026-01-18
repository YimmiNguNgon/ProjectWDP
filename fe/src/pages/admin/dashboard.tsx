// src/pages/admin/dashboard.tsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getDashboardStats, type DashboardStats } from '../../api/admin';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Users, ShoppingBag, ShoppingCart, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';

export default function AdminDashboard() {
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        fetchStats();
    }, []);

    const fetchStats = async () => {
        try {
            setLoading(true);
            const response = await getDashboardStats();
            setStats(response.data);
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Lỗi khi tải thống kê');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="container mx-auto py-8">
                <div className="flex items-center justify-center h-64">
                    <p className="text-lg text-gray-500">Đang tải...</p>
                </div>
            </div>
        );
    }

    if (!stats) {
        return (
            <div className="container mx-auto py-8">
                <div className="flex items-center justify-center h-64">
                    <p className="text-lg text-gray-500">Không có dữ liệu</p>
                </div>
            </div>
        );
    }

    return (
        <div className="container mx-auto py-8">
            <h1 className="text-3xl font-bold mb-6">Dashboard Tổng Quan</h1>

            {/* Main Stats Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-8">
                {/* Users Card */}
                <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate('/admin/users')}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Tổng Người Dùng</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.users.total}</div>
                        <p className="text-xs text-muted-foreground mb-3">
                            +{stats.users.newLast7Days} trong 7 ngày qua
                        </p>
                        <Button
                            variant="outline"
                            size="sm"
                            className="w-full"
                            onClick={(e) => {
                                e.stopPropagation();
                                navigate('/admin/users');
                            }}
                        >
                            Quản lý người dùng
                            <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                    </CardContent>
                </Card>

                {/* Products Card */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Tổng Sản Phẩm</CardTitle>
                        <ShoppingBag className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.products.total}</div>
                        <p className="text-xs text-muted-foreground">
                            +{stats.products.newLast7Days} trong 7 ngày qua
                        </p>
                    </CardContent>
                </Card>

                {/* Orders Card */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Tổng Đơn Hàng</CardTitle>
                        <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.orders.total}</div>
                        <p className="text-xs text-muted-foreground">
                            +{stats.orders.newLast7Days} trong 7 ngày qua
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Detailed Stats */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {/* Users Breakdown */}
                <Card>
                    <CardHeader>
                        <CardTitle>Người Dùng Theo Vai Trò</CardTitle>
                        <CardDescription>Phân loại theo role</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        <div className="flex justify-between">
                            <span className="text-sm">Buyers:</span>
                            <span className="font-semibold">{stats.users.buyers}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-sm">Sellers:</span>
                            <span className="font-semibold">{stats.users.sellers}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-sm">Admins:</span>
                            <span className="font-semibold">{stats.users.admins}</span>
                        </div>
                    </CardContent>
                </Card>

                {/* Users Status */}
                <Card>
                    <CardHeader>
                        <CardTitle>Trạng Thái Người Dùng</CardTitle>
                        <CardDescription>Phân loại theo status</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        <div className="flex justify-between">
                            <span className="text-sm">Active:</span>
                            <span className="font-semibold text-green-600">{stats.users.active}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-sm">Banned:</span>
                            <span className="font-semibold text-red-600">{stats.users.banned}</span>
                        </div>
                    </CardContent>
                </Card>

                {/* Orders Status */}
                <Card>
                    <CardHeader>
                        <CardTitle>Đơn Hàng Theo Trạng Thái</CardTitle>
                        <CardDescription>Phân loại theo status</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        {Object.entries(stats.orders.byStatus).map(([status, count]) => (
                            <div key={status} className="flex justify-between">
                                <span className="text-sm capitalize">{status}:</span>
                                <span className="font-semibold">{count}</span>
                            </div>
                        ))}
                        {Object.keys(stats.orders.byStatus).length === 0 && (
                            <p className="text-sm text-muted-foreground">Chưa có đơn hàng</p>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
