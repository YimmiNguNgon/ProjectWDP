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
                // When selecting 'all' or 'admin', do not exclude admin accounts
                excludeAdmin: roleFilter !== 'all' && roleFilter !== 'admin',
            };

            if (search) params.search = search;
            if (roleFilter !== 'all') params.role = roleFilter;
            if (statusFilter !== 'all') params.status = statusFilter;

            const response = await getAllUsers(params);
            setUsers(response.data);
            setTotalPages(response.pagination.totalPages);
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to load users');
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
            toast.error('Please enter a reason for banning this account');
            return;
        }

        try {
            await banUser(selectedUser._id, banReason);
            toast.success('Account banned successfully');
            setBanDialogOpen(false);
            setBanReason('');
            setSelectedUser(null);
            fetchUsers();
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to ban account');
        }
    };

    // Handle unban user
    const handleUnbanUser = async (user: User) => {
        try {
            await unbanUser(user._id);
            toast.success('Account unbanned successfully');
            fetchUsers();
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to unban account');
        }
    };

    // Handle delete user
    const handleDeleteUser = async (user: User) => {
        if (!confirm(`Are you sure you want to delete user ${user.username}?`)) {
            return;
        }

        try {
            await deleteUser(user._id);
            toast.success('User deleted successfully');
            fetchUsers();
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to delete user');
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
            <h1 className="text-3xl font-bold mb-6">User Management</h1>

            {/* Filters */}
            <div className="flex gap-4 mb-6">
                <div className="flex-1">
                    <Input
                        placeholder="Search by username or email..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                    />
                </div>
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Filter by role" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All roles</SelectItem>
                        <SelectItem value="buyer">Buyer</SelectItem>
                        <SelectItem value="seller">Seller</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All statuses</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="banned">Banned</SelectItem>
                        <SelectItem value="suspended">Suspended</SelectItem>
                    </SelectContent>
                </Select>

                <Button onClick={handleSearch}>Search</Button>
            </div>

            {/* Users Table */}
            <div className="border rounded-lg">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Username</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Role</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Reputation</TableHead>
                            <TableHead>Created At</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={7} className="text-center py-8">
                                    Loading...
                                </TableCell>
                            </TableRow>
                        ) : users.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="text-center py-8">
                                    No users found
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
                                    <TableCell>{new Date(user.createdAt).toLocaleDateString('en-US')}</TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex gap-2 justify-end">
                                            {user.status === 'banned' ? (
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => handleUnbanUser(user)}
                                                >
                                                    Unban
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
                                                    Ban
                                                </Button>
                                            )}
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => handleDeleteUser(user)}
                                            >
                                                Delete
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
                    Previous
                </Button>
                <span className="flex items-center px-4">
                    Page {page} / {totalPages}
                </span>
                <Button
                    variant="outline"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                >
                    Next
                </Button>
            </div>

            {/* Ban Dialog */}
            <Dialog open={banDialogOpen} onOpenChange={setBanDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Ban Account</DialogTitle>
                        <DialogDescription>
                            You are banning account: <strong>{selectedUser?.username}</strong>
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <Textarea
                            placeholder="Enter ban reason..."
                            value={banReason}
                            onChange={(e) => setBanReason(e.target.value)}
                            rows={4}
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setBanDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button variant="destructive" onClick={handleBanUser}>
                            Ban Account
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

