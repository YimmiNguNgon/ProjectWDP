// src/components/RoleGuard.tsx
import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/use-auth';
import type { UserRole } from '../lib/permissions';

interface RoleGuardProps {
    children: ReactNode;
    allowedRoles?: UserRole[];
    requireRole?: UserRole;
    redirectTo?: string;
}

export const RoleGuard = ({
    children,
    allowedRoles,
    requireRole,
    redirectTo = '/unauthorized'
}: RoleGuardProps) => {
    const { user, loading } = useAuth();

    // Still loading
    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Đang kiểm tra quyền truy cập...</p>
                </div>
            </div>
        );
    }

    // Not logged in
    if (!user) {
        return <Navigate to="/auth/sign-in" replace />;
    }

    const userRole = user.role as UserRole;

    // Check specific role requirement
    if (requireRole && userRole !== requireRole) {
        return <Navigate to={redirectTo} replace />;
    }

    // Check allowed roles
    if (allowedRoles && !allowedRoles.includes(userRole)) {
        return <Navigate to={redirectTo} replace />;
    }

    return <>{children}</>;
};

// Hook to check if user has role
export const useHasRole = (role: UserRole): boolean => {
    const { user } = useAuth();
    return user?.role === role;
};

// Hook to check if user has any of the roles
export const useHasAnyRole = (roles: UserRole[]): boolean => {
    const { user } = useAuth();
    return user ? roles.includes(user.role as UserRole) : false;
};
