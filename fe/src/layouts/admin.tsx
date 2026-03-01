import { Link, Outlet, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, ShoppingBag, MessageCircle, Home, ClipboardList, TicketPercent, Tags } from 'lucide-react';
import { cn } from '@/lib/utils';
import AdminBroadcast from '@/components/admin-broadcast';

const navigation = [
  { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  { name: 'User Management', href: '/admin/users', icon: Users },
  { name: 'Product Management', href: '/admin/products', icon: ShoppingBag },
  { name: 'Category Management', href: '/admin/categories', icon: Tags },
  { name: 'Feedback Revision', href: '/admin/feedback', icon: MessageCircle },
  { name: 'Seller Applications', href: '/admin/seller-applications', icon: ClipboardList },
  { name: 'Voucher Requests', href: '/admin/voucher-requests', icon: TicketPercent },
];

export default function AdminLayout() {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex">
        <div className="w-64 bg-white border-r border-gray-200 min-h-screen">
          <div className="p-6">
            <h1 className="text-2xl font-bold text-gray-900">Admin Panel</h1>
          </div>
          <nav className="px-3 space-y-1">
            {navigation.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.href || (item.href !== '/admin' && location.pathname.startsWith(item.href));

              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                    isActive ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-100',
                  )}
                >
                  <Icon className="h-5 w-5" />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          <div className="px-3 mt-4">
            <AdminBroadcast />
          </div>

          <div className="px-3 mt-6 pt-6 border-t border-gray-200">
            <Link
              to="/"
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
            >
              <Home className="h-5 w-5" />
              Back to Home
            </Link>
          </div>
        </div>

        <div className="flex-1">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
