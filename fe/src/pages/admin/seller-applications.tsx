import { useEffect, useState } from 'react';
import api from '@/lib/axios';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';

interface Application {
  _id: string;
  shopName: string;
  phoneNumber: string;
  bankAccountNumber: string;
  bankName: string;
  productDescription: string;
  status: 'pending' | 'approved' | 'rejected';
  adminNote: string;
  createdAt: string;
  user: { _id: string; username: string; email: string };
  reviewedBy?: { username: string };
  reviewedAt?: string;
}

const STATUS_BADGE: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  pending: 'secondary',
  approved: 'default',
  rejected: 'destructive',
};

const STATUS_LABEL: Record<string, string> = {
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
};

const FILTER_TABS = [
  { value: '', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
];

export default function AdminSellerApplicationsPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [total, setTotal] = useState(0);
  const [actionLoading, setActionLoading] = useState(false);

  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [actionType, setActionType] = useState<'approve' | 'reject' | null>(null);
  const [adminNote, setAdminNote] = useState('');

  const fetchApplications = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/admin/seller-applications', {
        params: { status: statusFilter || undefined },
      });
      setApplications(res.data.data);
      setTotal(res.data.total);
    } catch {
      toast.error('Unable to load applications');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications();
  }, [statusFilter]);

  const openAction = (app: Application, type: 'approve' | 'reject') => {
    setSelectedApp(app);
    setActionType(type);
    setAdminNote('');
  };

  const closeModal = () => {
    setSelectedApp(null);
    setActionType(null);
    setAdminNote('');
  };

  const handleAction = async () => {
    if (!selectedApp || !actionType) return;
    setActionLoading(true);
    try {
      await api.post(`/api/admin/seller-applications/${selectedApp._id}/${actionType}`, { adminNote });
      toast.success(actionType === 'approve' ? 'Application approved successfully' : 'Application rejected');
      closeModal();
      fetchApplications();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'An error occurred');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-1">Seller Applications</h1>
        <p className="text-muted-foreground text-sm">Review and approve seller applications from users</p>
      </div>

      <div className="flex gap-2 items-center mb-4">
        {FILTER_TABS.map((tab) => (
          <Button
            key={tab.value}
            id={`filter-tab-${tab.value || 'all'}`}
            variant={statusFilter === tab.value ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter(tab.value)}
            className="cursor-pointer"
          >
            {tab.label}
          </Button>
        ))}
        <span className="ml-auto text-sm text-muted-foreground">{total} applications</span>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Shop name</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Bank</TableHead>
              <TableHead>Planned products</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Submitted date</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-10">Loading...</TableCell>
              </TableRow>
            ) : applications.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-10 text-muted-foreground">No applications found</TableCell>
              </TableRow>
            ) : (
              applications.map((app) => (
                <TableRow key={app._id}>
                  <TableCell>
                    <div className="font-medium">{app.user?.username}</div>
                    <div className="text-xs text-muted-foreground">{app.user?.email}</div>
                  </TableCell>
                  <TableCell className="font-medium">{app.shopName}</TableCell>
                  <TableCell>{app.phoneNumber}</TableCell>
                  <TableCell>
                    <div>{app.bankName}</div>
                    <div className="text-xs text-muted-foreground">{app.bankAccountNumber}</div>
                  </TableCell>
                  <TableCell className="max-w-[180px]">
                    <p className="text-sm line-clamp-2">{app.productDescription}</p>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <Badge variant={STATUS_BADGE[app.status]}>{STATUS_LABEL[app.status]}</Badge>
                      {app.adminNote && (
                        <span className="text-xs text-muted-foreground line-clamp-1 max-w-[120px]" title={app.adminNote}>
                          {app.adminNote}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">{new Date(app.createdAt).toLocaleDateString('en-US')}</div>
                    {app.reviewedAt && (
                      <div className="text-xs text-muted-foreground">{new Date(app.reviewedAt).toLocaleDateString('en-US')}</div>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {app.status === 'pending' ? (
                      <div className="flex gap-2 justify-end">
                        <Button id={`approve-btn-${app._id}`} size="sm" onClick={() => openAction(app, 'approve')} className="cursor-pointer">
                          Approve
                        </Button>
                        <Button
                          id={`reject-btn-${app._id}`}
                          size="sm"
                          variant="destructive"
                          onClick={() => openAction(app, 'reject')}
                          className="cursor-pointer"
                        >
                          Reject
                        </Button>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        {app.reviewedBy?.username ? `@${app.reviewedBy.username}` : ''}
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!selectedApp && !!actionType} onOpenChange={closeModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{actionType === 'approve' ? 'Approve application' : 'Reject application'}</DialogTitle>
            <DialogDescription>
              {actionType === 'approve'
                ? `You are approving the application of "${selectedApp?.shopName}". This user will be upgraded to Seller role.`
                : `You are rejecting the application of "${selectedApp?.shopName}".`}
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <Label htmlFor="admin-note-textarea" className="mb-2 block">
              Note (will be sent via email to the user):
            </Label>
            <Textarea
              id="admin-note-textarea"
              value={adminNote}
              onChange={(e) => setAdminNote(e.target.value)}
              placeholder={
                actionType === 'approve'
                  ? 'Example: Congratulations! Your application has been approved.'
                  : 'Example: Information is incomplete, please update and resubmit.'
              }
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeModal} className="cursor-pointer">
              Cancel
            </Button>
            <Button
              id="confirm-action-btn"
              variant={actionType === 'approve' ? 'default' : 'destructive'}
              onClick={handleAction}
              disabled={actionLoading}
              className="cursor-pointer"
            >
              {actionLoading ? 'Processing...' : actionType === 'approve' ? 'Confirm approval' : 'Confirm rejection'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
