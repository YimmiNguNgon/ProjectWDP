// src/lib/permissions.ts

export type UserRole = 'admin' | 'seller' | 'buyer';

export interface Permission {
    resource: string;
    actions: string[];
}

// Define permissions for each role
export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
    admin: [
        { resource: 'users', actions: ['create', 'read', 'update', 'delete', 'ban', 'unban'] },
        { resource: 'products', actions: ['create', 'read', 'update', 'delete'] },
        { resource: 'orders', actions: ['read', 'update', 'delete'] },
        { resource: 'reviews', actions: ['read', 'delete', 'flag'] },
        { resource: 'feedback-revision', actions: ['read', 'approve', 'reject', 'cancel'] },
        { resource: 'complaints', actions: ['read', 'resolve'] },
        { resource: 'promotions', actions: ['read', 'approve', 'reject'] },
        { resource: 'vouchers', actions: ['read', 'approve', 'reject'] },
        { resource: 'dashboard', actions: ['read'] },
        { resource: 'reports', actions: ['read'] },
    ],
    seller: [
        { resource: 'products', actions: ['create', 'read', 'update', 'delete'] },
        { resource: 'orders', actions: ['read', 'update'] },
        { resource: 'inventory', actions: ['read', 'update'] },
        { resource: 'reviews', actions: ['read', 'respond'] },
        { resource: 'feedback-revision', actions: ['create', 'read', 'cancel'] },
        { resource: 'promotions', actions: ['create', 'read'] },
        { resource: 'vouchers', actions: ['create', 'read', 'update'] },
        { resource: 'messages', actions: ['read', 'send'] },
        { resource: 'analytics', actions: ['read'] },
    ],
    buyer: [
        { resource: 'products', actions: ['read'] },
        { resource: 'orders', actions: ['create', 'read'] },
        { resource: 'reviews', actions: ['create', 'read', 'update'] },
        { resource: 'feedback-revision', actions: ['read', 'respond'] },
        { resource: 'complaints', actions: ['create', 'read'] },
        { resource: 'messages', actions: ['read', 'send'] },
        { resource: 'cart', actions: ['create', 'read', 'update', 'delete'] },
    ],
};

// Check if user has permission
export const hasPermission = (
    userRole: UserRole,
    resource: string,
    action: string
): boolean => {
    const permissions = ROLE_PERMISSIONS[userRole];
    if (!permissions) return false;

    const resourcePermission = permissions.find(p => p.resource === resource);
    if (!resourcePermission) return false;

    return resourcePermission.actions.includes(action);
};

// Check if user can access route
export const canAccessRoute = (userRole: UserRole, route: string): boolean => {
    // Admin routes
    if (route.startsWith('/admin')) {
        return userRole === 'admin';
    }

    // Seller routes
    if (route.startsWith('/seller')) {
        return userRole === 'seller' || userRole === 'admin';
    }

    // Buyer routes (purchases, cart, etc.)
    if (route.startsWith('/my-ebay') || route.startsWith('/purchases')) {
        return userRole === 'buyer' || userRole === 'admin';
    }

    // Public routes
    return true;
};

// Get allowed routes for user
export const getAllowedRoutes = (userRole: UserRole): string[] => {
    const routes: string[] = [
        '/',
        '/products',
        '/messages',
        '/profile',
    ];

    if (userRole === 'admin') {
        routes.push(
            '/admin',
            '/admin/users',
            '/admin/products',
            '/admin/feedback',
            '/admin/complaints',
            '/admin/reviews',
            '/admin/promotion-requests'
            ,
            '/admin/voucher-requests'
        );
    }

    if (userRole === 'seller' || userRole === 'admin') {
        routes.push(
            '/seller/my-listings',
            '/seller/inventory',
            '/seller/sold',
            '/seller/promotion-requests'
            ,
            '/seller/vouchers'
        );
    }

    if (userRole === 'buyer' || userRole === 'admin') {
        routes.push(
            '/my-ebay/activity/purchases',
            '/cart',
            '/checkout'
        );
    }

    return routes;
};

// Get user capabilities description
export const getUserCapabilities = (userRole: UserRole): string[] => {
    const capabilities: Record<UserRole, string[]> = {
        admin: [
            'Quản lý toàn bộ hệ thống',
            'Quản lý người dùng (tạo, sửa, xóa, ban)',
            'Quản lý sản phẩm',
            'Xem và xử lý feedback revision',
            'Xử lý khiếu nại',
            'Kiểm duyệt đánh giá',
            'Phê duyệt promotion requests',
            'Xem báo cáo và thống kê',
        ],
        seller: [
            'Đăng và quản lý sản phẩm',
            'Quản lý kho hàng',
            'Xem và xử lý đơn hàng',
            'Yêu cầu sửa feedback',
            'Trả lời đánh giá',
            'Tạo promotion requests',
            'Xem phân tích bán hàng',
            'Nhắn tin với buyers',
        ],
        buyer: [
            'Mua sản phẩm',
            'Xem lịch sử mua hàng',
            'Đánh giá sản phẩm',
            'Phản hồi feedback revision',
            'Gửi khiếu nại',
            'Quản lý giỏ hàng',
            'Nhắn tin với sellers',
        ],
    };

    return capabilities[userRole] || [];
};
