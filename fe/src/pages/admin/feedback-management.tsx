// src/pages/admin/feedback-management.tsx
import { useState, useEffect } from 'react';
import { getAllFeedbackRequests, getFlaggedFeedbackRequests, reviewFeedbackRequest, type FeedbackRevisionRequest } from '../../api/feedback-revision';
import { Button } from '../../components/ui/button';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '../../components/ui/table';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '../../components/ui/dialog';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { toast } from 'sonner';

export default function FeedbackManagement() {
    const [requests, setRequests] = useState<FeedbackRevisionRequest[]>([]);
    const [loading, setLoading] = useState(false);
    const [showFlaggedOnly, setShowFlaggedOnly] = useState(false);

    // Dialog state
    const [selectedRequest, setSelectedRequest] = useState<FeedbackRevisionRequest | null>(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [adminNotes, setAdminNotes] = useState('');
    const [selectedAction, setSelectedAction] = useState<'approved' | 'rejected' | 'cancelled_feedback' | 'warned_seller'>('approved');

    // Fetch requests
    const fetchRequests = async () => {
        setLoading(true);
        try {
            const response = showFlaggedOnly
                ? await getFlaggedFeedbackRequests({ limit: 100 })
                : await getAllFeedbackRequests({ limit: 100 });
            setRequests(response.data);
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to load feedback requests');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRequests();
    }, [showFlaggedOnly]);

    // Open review dialog
    const handleReviewClick = (request: FeedbackRevisionRequest) => {
        setSelectedRequest(request);
        setAdminNotes(request.adminNotes || '');
        setSelectedAction('approved');
        setIsDialogOpen(true);
    };

    // Submit review
    const handleSubmitReview = async () => {
        if (!selectedRequest) return;

        try {
            await reviewFeedbackRequest(selectedRequest._id, {
                action: selectedAction,
                notes: adminNotes,
            });

            toast.success(`Request ${selectedAction === 'approved' ? 'approved' : selectedAction === 'rejected' ? 'rejected' : 'processed'}`);
            setIsDialogOpen(false);
            fetchRequests();
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to process request');
        }
    };

    // Get status badge color
    const getStatusColor = (status: string) => {
        switch (status) {
            case 'pending': return 'bg-yellow-100 text-yellow-800';
            case 'accepted': return 'bg-green-100 text-green-800';
            case 'declined': return 'bg-red-100 text-red-800';
            case 'expired': return 'bg-gray-100 text-gray-800';
            case 'cancelled': return 'bg-gray-100 text-gray-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    // Get reason label
    const getReasonLabel = (reason: string) => {
        const labels: Record<string, string> = {
            'refund': 'Refund',
            'replacement': 'Replacement',
            'resolved': 'Resolved',
            'misunderstanding': 'Misunderstanding',
            'other': 'Other',
        };
        return labels[reason] || reason;
    };

    return (
        <div className="container mx-auto py-8">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold">Feedback Revision Management</h1>
                <div className="flex gap-2">
                    <Button
                        variant={!showFlaggedOnly ? 'default' : 'outline'}
                        onClick={() => setShowFlaggedOnly(false)}
                    >
                        All
                    </Button>
                    <Button
                        variant={showFlaggedOnly ? 'default' : 'outline'}
                        onClick={() => setShowFlaggedOnly(true)}
                    >
                        Flagged
                    </Button>
                </div>
            </div>

            {/* Requests Table */}
            <div className="border rounded-lg">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Seller</TableHead>
                            <TableHead>Buyer</TableHead>
                            <TableHead>Reason</TableHead>
                            <TableHead>Message</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Flagged</TableHead>
                            <TableHead>Created At</TableHead>
                            <TableHead>Expires At</TableHead>
                            <TableHead className="text-right">Action</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={9} className="text-center py-8">
                                    Loading...
                                </TableCell>
                            </TableRow>
                        ) : requests.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={9} className="text-center py-8">
                                    No requests found
                                </TableCell>
                            </TableRow>
                        ) : (
                            requests.map((request) => (
                                <TableRow key={request._id}>
                                    <TableCell className="font-medium">
                                        {request.seller?.username || 'N/A'}
                                    </TableCell>
                                    <TableCell>
                                        {request.buyer?.username || 'N/A'}
                                    </TableCell>
                                    <TableCell>
                                        {getReasonLabel(request.reason)}
                                    </TableCell>
                                    <TableCell>
                                        <div className="max-w-xs truncate" title={request.message}>
                                            {request.message}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <span className={`px-2 py-1 rounded text-xs ${getStatusColor(request.status)}`}>
                                            {request.status}
                                        </span>
                                    </TableCell>
                                    <TableCell>
                                        {request.flaggedForReview ? (
                                            <div className="flex flex-col gap-1">
                                                <span className="px-2 py-1 rounded text-xs bg-red-100 text-red-800">
                                                    Yes
                                                </span>
                                                {request.flagReason && (
                                                    <span className="text-xs text-gray-500">
                                                        {request.flagReason}
                                                    </span>
                                                )}
                                            </div>
                                        ) : (
                                            <span className="text-gray-400">No</span>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        {new Date(request.createdAt).toLocaleDateString('en-US')}
                                    </TableCell>
                                    <TableCell>
                                        {new Date(request.expiresAt).toLocaleDateString('en-US')}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        {request.adminAction ? (
                                            <div className="flex flex-col items-end gap-1">
                                                <span className="text-xs text-gray-500">
                                                    Processed: {request.adminAction}
                                                </span>
                                                {request.reviewedByAdmin && (
                                                    <span className="text-xs text-gray-400">
                                                        By: {request.reviewedByAdmin.username}
                                                    </span>
                                                )}
                                            </div>
                                        ) : (
                                            <Button
                                                size="sm"
                                                onClick={() => handleReviewClick(request)}
                                            >
                                                Review
                                            </Button>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Review Dialog */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Review Feedback Revision Request</DialogTitle>
                        <DialogDescription>
                            Approve or reject the seller's revision request
                        </DialogDescription>
                    </DialogHeader>

                    {selectedRequest && (
                        <div className="grid gap-4 py-4">
                            {/* Request details */}
                            <div className="grid gap-2">
                                <Label>Request Information</Label>
                                <div className="p-4 bg-gray-50 rounded space-y-2">
                                    <p><strong>Seller:</strong> {selectedRequest.seller?.username}</p>
                                    <p><strong>Buyer:</strong> {selectedRequest.buyer?.username}</p>
                                    <p><strong>Reason:</strong> {getReasonLabel(selectedRequest.reason)}</p>
                                    <p><strong>Message:</strong> {selectedRequest.message}</p>
                                    {selectedRequest.resolutionType && (
                                        <p><strong>Resolution:</strong> {selectedRequest.resolutionType}</p>
                                    )}
                                    {selectedRequest.resolutionProof && (
                                        <p><strong>Proof:</strong> {selectedRequest.resolutionProof}</p>
                                    )}
                                </div>
                            </div>

                            {/* Flagged info */}
                            {selectedRequest.flaggedForReview && (
                                <div className="grid gap-2">
                                    <Label className="text-red-600">Flag Information</Label>
                                    <div className="p-4 bg-red-50 rounded space-y-2">
                                        <p><strong>Flag reason:</strong> {selectedRequest.flagReason}</p>
                                        {selectedRequest.violationKeywords && selectedRequest.violationKeywords.length > 0 && (
                                            <p><strong>Violation keywords:</strong> {selectedRequest.violationKeywords.join(', ')}</p>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Action selection */}
                            <div className="grid gap-2">
                                <Label htmlFor="action">Action</Label>
                                <select
                                    id="action"
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                    value={selectedAction}
                                    onChange={(e) => setSelectedAction(e.target.value as any)}
                                >
                                    <option value="approved">Approve</option>
                                    <option value="rejected">Reject</option>
                                    <option value="cancelled_feedback">Cancel feedback (serious violation)</option>
                                    <option value="warned_seller">Warn seller</option>
                                </select>
                            </div>

                            {/* Admin notes */}
                            <div className="grid gap-2">
                                <Label htmlFor="notes">Admin Notes</Label>
                                <Textarea
                                    id="notes"
                                    value={adminNotes}
                                    onChange={(e) => setAdminNotes(e.target.value)}
                                    rows={4}
                                    placeholder="Add notes about your decision..."
                                />
                            </div>
                        </div>
                    )}

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleSubmitReview}>
                            Confirm
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

