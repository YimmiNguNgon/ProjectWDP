// src/layouts/seller.tsx
import { Link, Outlet, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  PlusCircle, 
  Package, 
  ShoppingBag, 
  DollarSign, 
  Star, 
  Home 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/use-auth';

const navigation = [
    { 
      name: 'Tổng quan', 
      href: '/seller', 
      icon: LayoutDashboard,
    },
    { 
      name: 'Thêm sản phẩm mới', 
      href: '/seller/products/new', 
      icon: PlusCircle,
    },
    { 
      name: 'Quản lý sản phẩm', 
      href: '/seller/products', 
      icon: Package,
    },
    { 
      name: 'Quản lý đơn hàng', 
      href: '/seller/orders', 
      icon: ShoppingBag,
    },
    { 
      name: 'Quản lý doanh thu', 
      href: '/seller/revenue', 
      icon: DollarSign,
    },
    { 
      name: 'Phản hồi khách hàng', 
      href: '/seller/reviews', 
      icon: Star,
    },
];

export default function SellerLayout() {
    const location = useLocation();
    const { user } = useAuth();

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="flex">
                {/* Sidebar */}
                <div className="w-64 bg-white border-r border-gray-200 min-h-screen">
                    <div className="p-6">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                                <span className="text-green-600 font-bold">S</span>
                            </div>
                            <div>
                                <h1 className="text-xl font-bold text-gray-900">Seller Panel</h1>
                                <p className="text-sm text-gray-600">
                                    {user?.username || user?.email?.split('@')[0]}
                                </p>
                            </div>
                        </div>
                    </div>
                    
                    <nav className="px-3 space-y-1">
                        {navigation.map((item) => {
                            const Icon = item.icon;
                            const isActive = location.pathname === item.href ||
                                (item.href !== '/seller' && location.pathname.startsWith(item.href));

                            return (
                                <Link
                                    key={item.name}
                                    to={item.href}
                                    className={cn(
                                        'flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-colors group',
                                        isActive
                                            ? 'bg-green-50 text-green-700 border-l-4 border-green-600'
                                            : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                                    )}
                                >
                                    <Icon className={cn(
                                        'h-5 w-5',
                                        isActive ? 'text-green-600' : 'text-gray-400 group-hover:text-gray-600'
                                    )} />
                                    <div className="flex flex-col">
                                        <span>{item.name}</span>
                                        <span className="text-xs text-gray-500 font-normal">
                                        </span>
                                    </div>
                                </Link>
                            );
                        })}
                    </nav>

                    {/* Stats Summary */}
                    <div className="px-3 mt-6 pt-6 border-t border-gray-200">
                        <div className="p-3 bg-gray-50 rounded-lg">
                            <h3 className="text-sm font-semibold text-gray-700 mb-2">Thống kê nhanh</h3>
                            <div className="space-y-2">
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-gray-600">Đơn hàng hôm nay</span>
                                    <span className="font-semibold">3</span>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-gray-600">Sản phẩm đang bán</span>
                                    <span className="font-semibold">12</span>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-gray-600">Doanh thu tháng</span>
                                    <span className="font-semibold text-green-600">1,245.50đ</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Home Button */}
                    <div className="px-3 mt-6 pt-6 border-t border-gray-200">
                        <Link
                            to="/"
                            className="flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
                        >
                            <Home className="h-5 w-5 text-gray-400" />
                            <div className="flex flex-col">
                                <span>Về trang chủ</span>
                                <span className="text-xs text-gray-500 font-normal">
                                    Quay lại mua sắm
                                </span>
                            </div>
                        </Link>
                    </div>
                </div>

                {/* Main content */}
                <div className="flex-1">
                    <div className="bg-white border-b border-gray-200">
                        <div className="max-w-full mx-auto px-6 py-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h2 className="text-lg font-semibold text-gray-900">
                                        {navigation.find(nav => 
                                            nav.href === location.pathname || 
                                            (nav.href !== '/seller' && location.pathname.startsWith(nav.href))
                                        )?.name || 'Tổng quan'}
                                    </h2>
                                    <p className="text-sm text-gray-600">
                                        {navigation.find(nav => 
                                            nav.href === location.pathname || 
                                            (nav.href !== '/seller' && location.pathname.startsWith(nav.href))
                                        )?.name || 'Quản lý cửa hàng của bạn'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                    <Outlet />
                </div>
            </div>
        </div>
    );
}