export type UserRole = 'admin' | 'seller' | 'buyer';

export interface Permission {
  resource: string;
  actions: string[];
}

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

export const hasPermission = (userRole: UserRole, resource: string, action: string): boolean => {
  const permissions = ROLE_PERMISSIONS[userRole];
  if (!permissions) return false;

  const resourcePermission = permissions.find((p) => p.resource === resource);
  if (!resourcePermission) return false;

  return resourcePermission.actions.includes(action);
};

export const canAccessRoute = (userRole: UserRole, route: string): boolean => {
  if (route.startsWith('/admin')) return userRole === 'admin';
  if (route.startsWith('/seller')) return userRole === 'seller' || userRole === 'admin';
  if (route.startsWith('/my-ebay') || route.startsWith('/purchases')) return userRole === 'buyer' || userRole === 'admin';
  return true;
};

export const getAllowedRoutes = (userRole: UserRole): string[] => {
  const routes: string[] = ['/', '/products', '/messages', '/profile'];

  if (userRole === 'admin') {
    routes.push(
      '/admin',
      '/admin/users',
      '/admin/products',
      '/admin/feedback',
      '/admin/complaints',
      '/admin/reviews',
      '/admin/promotion-requests',
      '/admin/voucher-requests',
    );
  }

  if (userRole === 'seller' || userRole === 'admin') {
    routes.push('/seller/my-listings', '/seller/inventory', '/seller/sold', '/seller/promotion-requests', '/seller/vouchers');
  }

  if (userRole === 'buyer' || userRole === 'admin') {
    routes.push('/my-ebay/activity/purchases', '/cart', '/checkout');
  }

  return routes;
};

export const getUserCapabilities = (userRole: UserRole): string[] => {
  const capabilities: Record<UserRole, string[]> = {
    admin: [
      'Manage the entire system',
      'Manage users (create, edit, delete, ban)',
      'Manage products',
      'Review and process feedback revisions',
      'Handle complaints',
      'Moderate reviews',
      'Approve promotion requests',
      'View reports and analytics',
    ],
    seller: [
      'Create and manage products',
      'Manage inventory',
      'View and process orders',
      'Request feedback revisions',
      'Reply to reviews',
      'Create promotion requests',
      'View sales analytics',
      'Message buyers',
    ],
    buyer: [
      'Buy products',
      'View purchase history',
      'Review products',
      'Respond to feedback revisions',
      'Submit complaints',
      'Manage cart',
      'Message sellers',
    ],
  };

  return capabilities[userRole] || [];
};
