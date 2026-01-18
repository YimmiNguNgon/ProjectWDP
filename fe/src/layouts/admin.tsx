// src/layouts/admin.tsx
import { Link, Outlet, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, ShoppingBag, MessageSquare, Star, Home } from 'lucide-react';
import { cn } from '@/lib/utils';

const navigation = [
    { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
    { name: 'Quản lý người dùng', href: '/admin/users', icon: Users },
    { name: 'Quản lý sản phẩm', href: '/admin/products', icon: ShoppingBag },
    { name: 'Khiếu nại', href: '/admin/complaints', icon: MessageSquare },
    { name: 'Đánh giá', href: '/admin/reviews', icon: Star },
];

export default function AdminLayout() {
    const location = useLocation();

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="flex">
                {/* Sidebar */}
                <div className="w-64 bg-white border-r border-gray-200 min-h-screen">
                    <div className="p-6">
                        <h1 className="text-2xl font-bold text-gray-900">Admin Panel</h1>
                    </div>
                    <nav className="px-3 space-y-1">
                        {navigation.map((item) => {
                            const Icon = item.icon;
                            const isActive = location.pathname === item.href ||
                                (item.href !== '/admin' && location.pathname.startsWith(item.href));

                            return (
                                <Link
                                    key={item.name}
                                    to={item.href}
                                    className={cn(
                                        'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                                        isActive
                                            ? 'bg-blue-50 text-blue-700'
                                            : 'text-gray-700 hover:bg-gray-100'
                                    )}
                                >
                                    <Icon className="h-5 w-5" />
                                    {item.name}
                                </Link>
                            );
                        })}
                    </nav>

                    {/* Home Button */}
                    <div className="px-3 mt-6 pt-6 border-t border-gray-200">
                        <Link
                            to="/"
                            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
                        >
                            <Home className="h-5 w-5" />
                            Về trang chủ
                        </Link>
                    </div>
                </div>

                {/* Main content */}
                <div className="flex-1">
                    <Outlet />
                </div>
            </div>
        </div>
    );
}
