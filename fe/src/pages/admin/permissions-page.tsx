// src/pages/admin/permissions-page.tsx
import { useAuth } from '../../hooks/use-auth';
import { getUserCapabilities, ROLE_PERMISSIONS, type UserRole } from '../../lib/permissions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Shield, CheckCircle2 } from 'lucide-react';

export default function PermissionsPage() {
    const { user } = useAuth();

    if (!user) {
        return (
            <div className="container mx-auto py-8">
                <p>Vui lòng đăng nhập để xem quyền hạn</p>
            </div>
        );
    }

    const userRole = user.role as UserRole;
    const capabilities = getUserCapabilities(userRole);
    const permissions = ROLE_PERMISSIONS[userRole] || [];

    const getRoleBadgeColor = (role: string) => {
        switch (role) {
            case 'admin':
                return 'bg-red-100 text-red-800';
            case 'seller':
                return 'bg-blue-100 text-blue-800';
            case 'buyer':
                return 'bg-green-100 text-green-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    const getRoleLabel = (role: string) => {
        const labels: Record<string, string> = {
            admin: 'Quản trị viên',
            seller: 'Người bán',
            buyer: 'Người mua',
        };
        return labels[role] || role;
    };

    return (
        <div className="container mx-auto py-8">
            <div className="mb-8">
                <div className="flex items-center gap-3 mb-2">
                    <Shield className="h-8 w-8 text-blue-600" />
                    <h1 className="text-3xl font-bold">Quyền hạn của tôi</h1>
                </div>
                <p className="text-gray-600">
                    Xem các quyền và khả năng của tài khoản {user.username}
                </p>
            </div>

            {/* User Role */}
            <Card className="mb-6">
                <CardHeader>
                    <CardTitle>Vai trò hiện tại</CardTitle>
                    <CardDescription>Vai trò của bạn trong hệ thống</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center gap-3">
                        <Badge className={getRoleBadgeColor(userRole)}>
                            {getRoleLabel(userRole)}
                        </Badge>
                        <span className="text-gray-600">
                            {user.email}
                        </span>
                    </div>
                </CardContent>
            </Card>

            {/* Capabilities */}
            <Card className="mb-6">
                <CardHeader>
                    <CardTitle>Khả năng</CardTitle>
                    <CardDescription>Những gì bạn có thể làm trong hệ thống</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-3">
                        {capabilities.map((capability, index) => (
                            <div key={index} className="flex items-start gap-3">
                                <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                                <span className="text-gray-700">{capability}</span>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Detailed Permissions */}
            <Card>
                <CardHeader>
                    <CardTitle>Quyền chi tiết</CardTitle>
                    <CardDescription>Quyền truy cập theo từng tài nguyên</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-4">
                        {permissions.map((permission, index) => (
                            <div key={index} className="border rounded-lg p-4">
                                <h3 className="font-semibold text-lg mb-2 capitalize">
                                    {permission.resource.replace(/-/g, ' ')}
                                </h3>
                                <div className="flex flex-wrap gap-2">
                                    {permission.actions.map((action, actionIndex) => (
                                        <Badge key={actionIndex} variant="outline">
                                            {action}
                                        </Badge>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* All Roles Comparison (Admin only) */}
            {userRole === 'admin' && (
                <Card className="mt-6">
                    <CardHeader>
                        <CardTitle>So sánh quyền hạn các vai trò</CardTitle>
                        <CardDescription>Xem quyền của tất cả các vai trò trong hệ thống</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid md:grid-cols-3 gap-4">
                            {(['admin', 'seller', 'buyer'] as UserRole[]).map((role) => (
                                <div key={role} className="border rounded-lg p-4">
                                    <Badge className={`${getRoleBadgeColor(role)} mb-3`}>
                                        {getRoleLabel(role)}
                                    </Badge>
                                    <div className="space-y-2">
                                        {getUserCapabilities(role).map((cap, idx) => (
                                            <div key={idx} className="text-sm text-gray-600 flex items-start gap-2">
                                                <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                                                <span>{cap}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
