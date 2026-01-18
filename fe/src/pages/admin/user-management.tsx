// src/pages/admin/user-management.tsx
import { useState, useEffect } from 'react';
import { getAllUsers, banUser, unbanUser, deleteUser, type User, type GetUsersParams } from '../../api/admin';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '../../components/ui/table';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '../../components/ui/select';
import { Badge } from '../../components/ui/badge';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '../../components/ui/dialog';
import { Textarea } from '../../components/ui/textarea';
import { toast } from 'sonner';

export default function UserManagement() {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [search, setSearch] = useState('');
    const [roleFilter, setRoleFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');

    // Ban dialog state
    const [banDialogOpen, setBanDialogOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [banReason, setBanReason] = useState('');

    // Fetch users
    const fetchUsers = async () => {
        setLoading(true);
        try {
            const params: GetUsersParams = {
                page,
                limit: 10,
                // Khi chọn 'all' hoặc 'admin' thì không exclude admin
                excludeAdmin: roleFilter !== 'all' && roleFilter !== 'admin',
            };

            if (search) params.search = search;
            if (roleFilter !== 'all') params.role = roleFilter;
            if (statusFilter !== 'all') params.status = statusFilter;

            const response = await getAllUsers(params);
            setUsers(response.data);
            setTotalPages(response.pagination.totalPages);
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Lỗi khi tải danh sách người dùng');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, [page, roleFilter, statusFilter]);

    // Handle search
    const handleSearch = () => {
        setPage(1);
        fetchUsers();
    };

    // Handle ban user
    const handleBanUser = async () => {
        if (!selectedUser || !banReason.trim()) {
            toast.error('Vui lòng nhập lý do khóa tài khoản');
            return;
        }

        try {
            await banUser(selectedUser._id, banReason);
            toast.success('Đã khóa tài khoản thành công');
            setBanDialogOpen(false);
            setBanReason('');
            setSelectedUser(null);
            fetchUsers();
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Lỗi khi khóa tài khoản');
        }
    };

    // Handle unban user
    const handleUnbanUser = async (user: User) => {
        try {
            await unbanUser(user._id);
            toast.success('Đã mở khóa tài khoản thành công');
            fetchUsers();
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Lỗi khi mở khóa tài khoản');
        }
    };

    // Handle delete user
    const handleDeleteUser = async (user: User) => {
        if (!confirm(`Bạn có chắc muốn xóa người dùng ${user.username}?`)) {
            return;
        }

        try {
            await deleteUser(user._id);
            toast.success('Đã xóa người dùng thành công');
            fetchUsers();
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Lỗi khi xóa người dùng');
        }
    };

    // Get status badge
    const getStatusBadge = (status: string) => {
        const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
            active: 'default',
            banned: 'destructive',
            suspended: 'secondary',
            restricted: 'outline',
        };
        return <Badge variant={variants[status] || 'default'}>{status}</Badge>;
    };

    // Get role badge
    const getRoleBadge = (role: string) => {
        const variants: Record<string, 'default' | 'secondary' | 'outline'> = {
            admin: 'default',
            seller: 'secondary',
            buyer: 'outline',
        };
        return <Badge variant={variants[role] || 'outline'}>{role}</Badge>;
    };

    return (
        <div className="container mx-auto py-8">
            <h1 className="text-3xl font-bold mb-6">Quản lý người dùng</h1>

            {/* Filters */}
            <div className="flex gap-4 mb-6">
                <div className="flex-1">
                    <Input
                        placeholder="Tìm kiếm theo username hoặc email..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                    />
                </div>
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Lọc theo vai trò" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Tất cả vai trò</SelectItem>
                        <SelectItem value="buyer">Buyer</SelectItem>
                        <SelectItem value="seller">Seller</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Lọc theo trạng thái" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Tất cả trạng thái</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="banned">Banned</SelectItem>
                        <SelectItem value="suspended">Suspended</SelectItem>
                    </SelectContent>
                </Select>

                <Button onClick={handleSearch}>Tìm kiếm</Button>
            </div>

            {/* Users Table */}
            <div className="border rounded-lg">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Username</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Vai trò</TableHead>
                            <TableHead>Trạng thái</TableHead>
                            <TableHead>Điểm uy tín</TableHead>
                            <TableHead>Ngày tạo</TableHead>
                            <TableHead className="text-right">Hành động</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={7} className="text-center py-8">
                                    Đang tải...
                                </TableCell>
                            </TableRow>
                        ) : users.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="text-center py-8">
                                    Không tìm thấy người dùng
                                </TableCell>
                            </TableRow>
                        ) : (
                            users.map((user) => (
                                <TableRow key={user._id}>
                                    <TableCell className="font-medium">{user.username}</TableCell>
                                    <TableCell>{user.email}</TableCell>
                                    <TableCell>{getRoleBadge(user.role)}</TableCell>
                                    <TableCell>{getStatusBadge(user.status)}</TableCell>
                                    <TableCell>{user.reputationScore}</TableCell>
                                    <TableCell>{new Date(user.createdAt).toLocaleDateString('vi-VN')}</TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex gap-2 justify-end">
                                            {user.status === 'banned' ? (
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => handleUnbanUser(user)}
                                                >
                                                    Mở khóa
                                                </Button>
                                            ) : (
                                                <Button
                                                    size="sm"
                                                    variant="destructive"
                                                    onClick={() => {
                                                        setSelectedUser(user);
                                                        setBanDialogOpen(true);
                                                    }}
                                                >
                                                    Khóa
                                                </Button>
                                            )}
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => handleDeleteUser(user)}
                                            >
                                                Xóa
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Pagination */}
            <div className="flex justify-center gap-2 mt-6">
                <Button
                    variant="outline"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                >
                    Trang trước
                </Button>
                <span className="flex items-center px-4">
                    Trang {page} / {totalPages}
                </span>
                <Button
                    variant="outline"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                >
                    Trang sau
                </Button>
            </div>

            {/* Ban Dialog */}
            <Dialog open={banDialogOpen} onOpenChange={setBanDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Khóa tài khoản</DialogTitle>
                        <DialogDescription>
                            Bạn đang khóa tài khoản: <strong>{selectedUser?.username}</strong>
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <Textarea
                            placeholder="Nhập lý do khóa tài khoản..."
                            value={banReason}
                            onChange={(e) => setBanReason(e.target.value)}
                            rows={4}
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setBanDialogOpen(false)}>
                            Hủy
                        </Button>
                        <Button variant="destructive" onClick={handleBanUser}>
                            Khóa tài khoản
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
