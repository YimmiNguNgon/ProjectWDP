import { useEffect, useMemo, useState } from 'react';
import { createComplaint, getMyComplaints, getMyOrders } from '@/api/complaint';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from '@/components/ui/empty';
import { Button } from '@/components/ui/button';
import { Link, useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ArrowRightIcon,
  BadgeDollarSignIcon,
  ChevronRightIcon,
  PackageIcon,
} from 'lucide-react';
import { formatDateTime, formatUsd } from '@/lib/utils';

export default function MyOrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [complaints, setComplaints] = useState<any[]>([]);
  const [complaintForm, setComplaintForm] = useState<any>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      try {
        const res = await getMyOrders();
        const data = Array.isArray(res?.data) ? (res.data as any[]) : [];
        setOrders(data);
        const complaintsRes = await getMyComplaints();
        const complaintsData = Array.isArray(complaintsRes?.data)
          ? (complaintsRes.data as any[])
          : [];
        setComplaints(complaintsData);
      } catch (err: unknown) {
        console.error(err);
      }
    })();
  }, []);

  const complainedOrderIds = useMemo(() => {
    return new Set((complaints ?? []).map((c: any) => c.orderId));
  }, [complaints]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'created':
        return (
          <Badge
            variant='outline'
            className='text-blue-600 border-blue-200 bg-blue-50'
          >
            Created
          </Badge>
        );
      case 'confirmed':
        return (
          <Badge
            variant='outline'
            className='text-indigo-600 border-indigo-200 bg-indigo-50'
          >
            Confirmed
          </Badge>
        );
      case 'shipped':
        return (
          <Badge
            variant='outline'
            className='text-amber-600 border-amber-200 bg-amber-50'
          >
            Shipped
          </Badge>
        );
      case 'delivered':
        return (
          <Badge
            variant='outline'
            className='text-green-600 border-green-200 bg-green-50'
          >
            Delivered
          </Badge>
        );
      case 'cancelled':
        return (
          <Badge
            variant='outline'
            className='text-red-600 border-red-200 bg-red-50'
          >
            Cancelled
          </Badge>
        );
      default:
        return <Badge variant='outline'>{status}</Badge>;
    }
  };

  const openComplaintDialog = (order: any) => {
    setComplaintForm({
      orderId: order._id,
      sellerId: order.seller._id,
      reason: 'product_issue',
      content: '',
    });
    setIsDialogOpen(true);
  };

  const submitComplaint = async () => {
    if (!complaintForm?.content?.trim()) {
      return;
    }
    try {
      await createComplaint(complaintForm);
      setIsDialogOpen(false);
      setComplaintForm(null);
      toast.success('Complaint sent successfully');
      navigate('/complaints');
    } catch (e) {
      toast.error('Failed to send complaint');
      console.error(e);
    }
  };

  if (!orders.length) {
    return (
      <div className='p-4 md:p-6'>
        <Empty className='border'>
          <EmptyHeader>
            <EmptyTitle>No orders yet</EmptyTitle>
            <EmptyDescription>When you place an order, it will appear here.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      </div>
    );
  }

  return (
    <div className='p-4 md:p-6 max-w-7xl mx-auto'>
      <Card>
        <CardHeader className='pb-4'>
          <div className='flex items-center justify-between'>
            <CardTitle className='text-2xl font-bold flex items-center gap-2'>
              <PackageIcon className='w-6 h-6 text-primary' />
              My Orders
              <Badge variant='secondary' className='ml-2'>
                {orders.length}
              </Badge>
            </CardTitle>
            <Link
              to='/complaints'
              className='text-primary hover:text-primary/80 font-medium transition-colors flex items-center gap-1'
            >
              Complaints History
              <ChevronRightIcon className='w-4 h-4' />
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          <div className='rounded-lg border'>
            <Table>
              <TableHeader>
                <TableRow className='bg-gray-50/50'>
                  <TableHead className='font-semibold'>Order</TableHead>
                  <TableHead className='font-semibold'>Seller</TableHead>
                  <TableHead className='font-semibold'>Products</TableHead>
                  <TableHead className='font-semibold text-right'>
                    Total
                  </TableHead>
                  <TableHead className='font-semibold'>Status</TableHead>
                  <TableHead className='font-semibold'>Created</TableHead>
                  <TableHead className='font-semibold'>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order) => (
                  <TableRow
                    key={order._id}
                    className='hover:bg-gray-50/50 transition-colors'
                  >
                    <TableCell className='font-mono text-sm text-gray-600'>
                      #{order._id.slice(-8)}
                    </TableCell>
                    <TableCell>
                      <div className='flex items-center gap-2'>
                        <div className='w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center'>
                          <span className='text-xs font-medium text-primary'>
                            {order.seller?.username?.charAt(0).toUpperCase() ??
                              'S'}
                          </span>
                        </div>
                        <span className='font-medium'>
                          {order.seller?.username}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className='max-w-[420px]'>
                      <div
                        className='truncate'
                        title={order.items
                          .map((it: any) => `${it.title} x ${it.quantity}`)
                          .join(', ')}
                      >
                        {order.items
                          .map((it: any) => `${it.title} x ${it.quantity}`)
                          .join(', ')}
                      </div>
                    </TableCell>
                    <TableCell className='text-right'>
                      <div className='inline-flex items-center gap-1'>
                        <BadgeDollarSignIcon className='w-4 h-4 text-emerald-600' />
                        <span className='font-medium'>
                          {formatUsd(order.totalAmount)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(order.status)}</TableCell>
                    <TableCell className='text-sm text-gray-600'>
                      {formatDateTime(order.createdAt)}
                    </TableCell>
                    <TableCell>
                      {complainedOrderIds.has(order._id) ? (
                        <Button
                          variant='outline'
                          disabled={complainedOrderIds.has(order._id)}
                          onClick={() => openComplaintDialog(order)}
                        >
                          Complainted
                        </Button>
                      ) : (
                        <Button
                          variant='outline'
                          onClick={() => openComplaintDialog(order)}
                        >
                          Complaint
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Complaint</DialogTitle>
          </DialogHeader>
          <div className='space-y-3'>
            <div className='space-y-1.5'>
              <div className='text-sm font-medium'>Reason</div>
              <Select
                value={complaintForm?.reason}
                onValueChange={(val) =>
                  setComplaintForm((prev: any) => ({ ...prev, reason: val }))
                }
              >
                <SelectTrigger className='w-full justify-between'>
                  <SelectValue placeholder='Select Reason' />
                </SelectTrigger>
                <SelectContent align='start'>
                  <SelectItem value='product_issue'>Product Issue</SelectItem>
                  <SelectItem value='late_delivery'>Late Delivery</SelectItem>
                  <SelectItem value='fraud'>Fraud</SelectItem>
                  <SelectItem value='other'>Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className='space-y-1.5'>
              <div className='text-sm font-medium'>Content</div>
              <Textarea
                rows={5}
                placeholder='Describe your problem...'
                value={complaintForm?.content ?? ''}
                onChange={(e) =>
                  setComplaintForm((prev: any) => ({
                    ...prev,
                    content: e.target.value,
                  }))
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant='outline' onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={submitComplaint}
              disabled={!complaintForm?.content?.trim()}
            >
              Send Complaint
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

