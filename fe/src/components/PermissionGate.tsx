// src/components/PermissionGate.tsx
import type { ReactNode } from 'react';
import { useAuth } from '../hooks/use-auth';
import { hasPermission, type UserRole } from '../lib/permissions';

interface PermissionGateProps {
    children: ReactNode;
    resource: string;
    action: string;
    fallback?: ReactNode;
}

export const PermissionGate = ({ children, resource, action, fallback = null }: PermissionGateProps) => {
    const { user } = useAuth();

    if (!user) {
        return <>{fallback}</>;
    }

    const userRole = user.role as UserRole;
    const allowed = hasPermission(userRole, resource, action);

    if (!allowed) {
        return <>{fallback}</>;
    }

    return <>{children}</>;
};

// Hook to check permission
export const usePermission = (resource: string, action: string): boolean => {
    const { user } = useAuth();

    if (!user) return false;

    const userRole = user.role as UserRole;
    return hasPermission(userRole, resource, action);
};
