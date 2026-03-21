// src/pages/admin/user-management.tsx
import { useState, useEffect } from 'react';
import {
    getAllUsers,
    banUser,
    unbanUser,
    deleteUser,
    getBanAppeals,
    reviewBanAppeal,
    type User,
    type BanAppeal,
    type GetUsersParams
} from '@/api/admin';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

export default function UserManagement() {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [search, setSearch] = useState('');
    const [roleFilter, setRoleFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');

    const handleRoleFilterChange = (value: string) => { setPage(1); setRoleFilter(value); };
    const handleStatusFilterChange = (value: string) => { setPage(1); setStatusFilter(value); };

    // Ban dialog state
    const [banDialogOpen, setBanDialogOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [banReason, setBanReason] = useState('');
    const [appeals, setAppeals] = useState<BanAppeal[]>([]);
    const [appealsLoading, setAppealsLoading] = useState(false);
    const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
    const [selectedAppeal, setSelectedAppeal] = useState<BanAppeal | null>(null);
    const [reviewAction, setReviewAction] = useState<'approve' | 'reject'>('approve');
    const [reviewNote, setReviewNote] = useState('');
    const [actionLoading, setActionLoading] = useState(false);

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

    const fetchAppeals = async () => {
        setAppealsLoading(true);
        try {
            const response = await getBanAppeals({ status: 'pending', limit: 20 });
            setAppeals(response.data);
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to load ban appeals');
        } finally {
            setAppealsLoading(false);
        }
    };

    useEffect(() => {
        fetchAppeals();
    }, []);

    const refreshAdminData = async () => {
        await Promise.all([fetchUsers(), fetchAppeals()]);
    };

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
            setActionLoading(true);
            await banUser(selectedUser._id, banReason);
            toast.success('Account banned successfully');
            setBanDialogOpen(false);
            setBanReason('');
            setSelectedUser(null);
            await refreshAdminData();
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to ban account');
        } finally {
            setActionLoading(false);
        }
    };

    // Handle unban user
    const handleUnbanUser = async (user: User) => {
        try {
            setActionLoading(true);
            await unbanUser(user._id);
            toast.success('Account unbanned successfully');
            await refreshAdminData();
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to unban account');
        } finally {
            setActionLoading(false);
        }
    };

    // Handle delete user
    const handleDeleteUser = async (user: User) => {
        if (!confirm(`Are you sure you want to delete user ${user.username}?`)) {
            return;
        }

        try {
            setActionLoading(true);
            await deleteUser(user._id);
            toast.success('User deleted successfully');
            await refreshAdminData();
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to delete user');
        } finally {
            setActionLoading(false);
        }
    };

    const handleReviewAppeal = async () => {
        if (!selectedAppeal) return;
        try {
            setActionLoading(true);
            await reviewBanAppeal(selectedAppeal._id, reviewAction, reviewNote.trim());
            toast.success(
                reviewAction === 'approve'
                    ? 'Appeal approved. Account restored.'
                    : 'Appeal rejected.'
            );
            setReviewDialogOpen(false);
            setSelectedAppeal(null);
            setReviewNote('');
            await refreshAdminData();
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to review appeal');
        } finally {
            setActionLoading(false);
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
                <Select value={roleFilter} onValueChange={handleRoleFilterChange}>
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
                <Select value={statusFilter} onValueChange={handleStatusFilterChange}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All statuses</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="banned">Banned</SelectItem>
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
                                                    disabled={actionLoading}
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
                                                    disabled={actionLoading}
                                                >
                                                    Ban
                                                </Button>
                                            )}
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => handleDeleteUser(user)}
                                                disabled={actionLoading}
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

            {/* Pending Appeals */}
            <div className="mt-10">
                <h2 className="text-2xl font-semibold mb-4">Pending Ban Appeals</h2>
                <div className="border rounded-lg">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>User</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead>Ban Reason</TableHead>
                                <TableHead>Appeal Reason</TableHead>
                                <TableHead>Submitted At</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {appealsLoading ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-8">Loading...</TableCell>
                                </TableRow>
                            ) : appeals.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-8">No pending appeals</TableCell>
                                </TableRow>
                            ) : (
                                appeals.map((appeal) => (
                                    <TableRow key={appeal._id}>
                                        <TableCell className="font-medium">{appeal.userId?.username || 'Unknown'}</TableCell>
                                        <TableCell>{appeal.userId?.email || 'N/A'}</TableCell>
                                        <TableCell className="max-w-[220px]">
                                            <p className="line-clamp-2 text-sm text-gray-700">
                                                {appeal.banReasonSnapshot || appeal.userId?.banReason || '-'}
                                            </p>
                                        </TableCell>
                                        <TableCell className="max-w-[320px]">
                                            <p className="line-clamp-3 text-sm">
                                                {appeal.appealReason}
                                            </p>
                                        </TableCell>
                                        <TableCell>{new Date(appeal.createdAt).toLocaleString('en-US')}</TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex gap-2 justify-end">
                                                <Button
                                                    size="sm"
                                                    onClick={() => {
                                                        setSelectedAppeal(appeal);
                                                        setReviewAction('approve');
                                                        setReviewNote('');
                                                        setReviewDialogOpen(true);
                                                    }}
                                                    disabled={actionLoading}
                                                >
                                                    Approve
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="destructive"
                                                    onClick={() => {
                                                        setSelectedAppeal(appeal);
                                                        setReviewAction('reject');
                                                        setReviewNote('');
                                                        setReviewDialogOpen(true);
                                                    }}
                                                    disabled={actionLoading}
                                                >
                                                    Reject
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
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
                        <Button variant="destructive" onClick={handleBanUser} disabled={actionLoading}>
                            {actionLoading ? 'Processing...' : 'Ban Account'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Review Appeal Dialog */}
            <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            {reviewAction === 'approve' ? 'Approve Appeal' : 'Reject Appeal'}
                        </DialogTitle>
                        <DialogDescription>
                            User: <strong>{selectedAppeal?.userId?.username || 'N/A'}</strong>
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3 py-2">
                        <p className="text-sm text-gray-600">
                            Appeal reason: {selectedAppeal?.appealReason || '-'}
                        </p>
                        <Textarea
                            placeholder="Admin note (optional)..."
                            value={reviewNote}
                            onChange={(e) => setReviewNote(e.target.value)}
                            rows={4}
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setReviewDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button
                            variant={reviewAction === 'approve' ? 'default' : 'destructive'}
                            onClick={handleReviewAppeal}
                            disabled={actionLoading}
                        >
                            {actionLoading
                                ? 'Processing...'
                                : reviewAction === 'approve'
                                    ? 'Approve & Unban'
                                    : 'Reject Appeal'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

