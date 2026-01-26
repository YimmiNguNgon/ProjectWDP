import { useState, useEffect } from 'react';
import {
    getPendingPromotionRequests,
    approvePromotionRequest,
    rejectPromotionRequest,
    type PromotionRequest,
} from '@/api/promotions';
import { toast } from 'sonner';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { CheckCircle2, XCircle, Package, Tag } from 'lucide-react';

export default function AdminPromotionRequestsPage() {
    const [requests, setRequests] = useState<PromotionRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedRequest, setSelectedRequest] = useState<PromotionRequest | null>(null);
    const [actionType, setActionType] = useState<'approve' | 'reject' | null>(null);
    const [adminNotes, setAdminNotes] = useState('');
    const [rejectionReason, setRejectionReason] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const fetchRequests = async () => {
        try {
            setLoading(true);
            const response = await getPendingPromotionRequests();
            setRequests(response.data);
        } catch (error: any) {
            console.error('Failed to load requests:', error);
            toast.error('Failed to load promotion requests');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRequests();
    }, []);

    const handleApprove = async () => {
        if (!selectedRequest) return;
        setSubmitting(true);

        try {
            await approvePromotionRequest(selectedRequest._id, adminNotes);
            toast.success('Promotion request approved!');
            fetchRequests();
            closeDialog();
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to approve request');
        } finally {
            setSubmitting(false);
        }
    };

    const handleReject = async () => {
        if (!selectedRequest || !rejectionReason.trim()) {
            toast.error('Rejection reason is required');
            return;
        }
        setSubmitting(true);

        try {
            await rejectPromotionRequest(selectedRequest._id, rejectionReason, adminNotes);
            toast.success('Promotion request rejected');
            fetchRequests();
            closeDialog();
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to reject request');
        } finally {
            setSubmitting(false);
        }
    };

    const openDialog = (request: PromotionRequest, action: 'approve' | 'reject') => {
        setSelectedRequest(request);
        setActionType(action);
        setAdminNotes('');
        setRejectionReason('');
    };

    const closeDialog = () => {
        setSelectedRequest(null);
        setActionType(null);
        setAdminNotes('');
        setRejectionReason('');
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const EligibilityBadge = ({ checks }: { checks: PromotionRequest['eligibilityChecks'] }) => {
        if (checks.allPassed) {
            return (
                <Badge className="bg-green-600">
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    All Checks Passed
                </Badge>
            );
        }
        return (
            <Badge variant="destructive">
                <XCircle className="w-3 h-3 mr-1" />
                Failed Checks
            </Badge>
        );
    };

    return (
        <div className="container mx-auto py-8">
            <div className="mb-6">
                <h1 className="text-3xl font-bold">Promotion Requests</h1>
                <p className="text-gray-600 mt-1">
                    Review and approve promotion requests from sellers
                </p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Pending Requests ({requests.length})</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    {loading ? (
                        <div className="text-center py-12">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
                            <p className="mt-4 text-gray-600">Loading...</p>
                        </div>
                    ) : requests.length === 0 ? (
                        <div className="text-center py-12">
                            <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                            <p className="text-gray-600">No pending requests</p>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Product</TableHead>
                                    <TableHead>Seller</TableHead>
                                    <TableHead>Type</TableHead>
                                    <TableHead>Pricing</TableHead>
                                    <TableHead>Eligibility</TableHead>
                                    <TableHead>Submitted</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {requests.map((request) => (
                                    <TableRow key={request._id}>
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                {request.product.image && (
                                                    <img
                                                        src={request.product.image}
                                                        alt={request.product.title}
                                                        className="w-12 h-12 object-cover rounded"
                                                    />
                                                )}
                                                <div>
                                                    <p className="font-medium line-clamp-1">
                                                        {request.product.title}
                                                    </p>
                                                    <p className="text-xs text-gray-500">
                                                        {request.product.condition}
                                                    </p>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div>
                                                <p className="font-medium text-sm">{request.seller.username}</p>
                                                <p className="text-xs text-gray-500">{request.seller.email}</p>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {request.requestType === 'outlet' ? (
                                                <Badge className="bg-orange-600">
                                                    <Package className="w-3 h-3 mr-1" />
                                                    Outlet
                                                </Badge>
                                            ) : (
                                                <Badge className="bg-red-600">
                                                    <Tag className="w-3 h-3 mr-1" />
                                                    Daily Deal
                                                </Badge>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <div className="space-y-1">
                                                <p className="line-through text-gray-500 text-xs">
                                                    ${request.originalPrice.toFixed(2)}
                                                </p>
                                                <p className="font-bold text-sm">
                                                    ${request.discountedPrice.toFixed(2)}
                                                </p>
                                                <Badge variant="outline" className="text-xs">
                                                    {request.discountPercent}% off
                                                </Badge>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <EligibilityBadge checks={request.eligibilityChecks} />
                                        </TableCell>
                                        <TableCell className="text-sm text-gray-600">
                                            {formatDate(request.createdAt)}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex gap-2 justify-end">
                                                <Button
                                                    size="sm"
                                                    onClick={() => openDialog(request, 'approve')}
                                                    className="bg-green-600 hover:bg-green-700"
                                                >
                                                    Approve
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="destructive"
                                                    onClick={() => openDialog(request, 'reject')}
                                                >
                                                    Reject
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            {/* Action Dialog */}
            <Dialog open={!!actionType} onOpenChange={() => closeDialog()}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>
                            {actionType === 'approve' ? 'Approve' : 'Reject'} Promotion Request
                        </DialogTitle>
                        <DialogDescription>
                            {selectedRequest &&
                                `${selectedRequest.product.title} - ${selectedRequest.requestType === 'outlet' ? 'Brand Outlet' : 'Daily Deal'}`}
                        </DialogDescription>
                    </DialogHeader>

                    {selectedRequest && (
                        <div className="space-y-4">
                            {/* Eligibility Details */}
                            <div className="p-4 bg-gray-50 rounded-lg space-y-2">
                                <h4 className="font-semibold text-sm">Eligibility Checks:</h4>
                                {selectedRequest.requestType === 'outlet' && (
                                    <>
                                        <div className="flex justify-between text-sm">
                                            <span>Condition NEW:</span>
                                            <span>
                                                {selectedRequest.eligibilityChecks.conditionNew ? '✅' : '❌'}
                                            </span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span>Listing Age ≥60 days:</span>
                                            <span>
                                                {selectedRequest.eligibilityChecks.listingAgeMet
                                                    ? `✅ (${selectedRequest.eligibilityChecks.listingAge} days)`
                                                    : `❌ (${selectedRequest.eligibilityChecks.listingAge} days)`}
                                            </span>
                                        </div>
                                    </>
                                )}
                                <div className="flex justify-between text-sm">
                                    <span>Discount ≥30%:</span>
                                    <span>
                                        {selectedRequest.eligibilityChecks.discountMet
                                            ? `✅ (${selectedRequest.discountPercent}%)`
                                            : `❌ (${selectedRequest.discountPercent}%)`}
                                    </span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span>Seller Verified:</span>
                                    <span>
                                        {selectedRequest.eligibilityChecks.sellerVerified ? '✅' : '❌'}
                                    </span>
                                </div>
                            </div>

                            {/* Daily Deal Info */}
                            {selectedRequest.requestType === 'daily_deal' && (
                                <div className="p-4 bg-blue-50 rounded-lg space-y-2">
                                    <h4 className="font-semibold text-sm">Deal Details:</h4>
                                    <p className="text-sm">
                                        Start: {selectedRequest.startDate && formatDate(selectedRequest.startDate)}
                                    </p>
                                    <p className="text-sm">
                                        End: {selectedRequest.endDate && formatDate(selectedRequest.endDate)}
                                    </p>
                                    <p className="text-sm">Quantity Limit: {selectedRequest.quantityLimit}</p>
                                </div>
                            )}

                            {/* Admin Notes */}
                            <div>
                                <Label htmlFor="adminNotes">Admin Notes (Optional)</Label>
                                <Textarea
                                    id="adminNotes"
                                    value={adminNotes}
                                    onChange={(e) => setAdminNotes(e.target.value)}
                                    placeholder="Internal notes about this decision..."
                                    rows={3}
                                />
                            </div>

                            {/* Rejection Reason */}
                            {actionType === 'reject' && (
                                <div>
                                    <Label htmlFor="rejectionReason">Rejection Reason *</Label>
                                    <Textarea
                                        id="rejectionReason"
                                        value={rejectionReason}
                                        onChange={(e) => setRejectionReason(e.target.value)}
                                        placeholder="Explain why this request is being rejected..."
                                        rows={3}
                                        required
                                    />
                                </div>
                            )}

                            {/* Actions */}
                            <div className="flex justify-end gap-2 pt-4">
                                <Button variant="outline" onClick={closeDialog}>
                                    Cancel
                                </Button>
                                {actionType === 'approve' ? (
                                    <Button
                                        onClick={handleApprove}
                                        disabled={submitting}
                                        className="bg-green-600 hover:bg-green-700"
                                    >
                                        {submitting ? 'Approving...' : 'Confirm Approval'}
                                    </Button>
                                ) : (
                                    <Button
                                        onClick={handleReject}
                                        disabled={submitting || !rejectionReason.trim()}
                                        variant="destructive"
                                    >
                                        {submitting ? 'Rejecting...' : 'Confirm Rejection'}
                                    </Button>
                                )}
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
