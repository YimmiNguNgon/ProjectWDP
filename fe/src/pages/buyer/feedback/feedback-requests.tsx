import { useEffect, useState, useContext } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Clock, CheckCircle, XCircle, AlertCircle, Star } from 'lucide-react';
import { toast } from 'sonner';
import { getBuyerRequests, respondToRequest, applyRevision } from '@/api/feedbackRevision';
import { formatDateTime } from '@/lib/utils';
import { SocketContext } from '@/hooks/use-socket';

export default function BuyerFeedbackRequestsPage() {
    const [requests, setRequests] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const socketCtx = useContext(SocketContext);

    // Dialog state
    const [selectedRequest, setSelectedRequest] = useState<any>(null);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [responding, setResponding] = useState(false);

    // Edit feedback state
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [editingRequestId, setEditingRequestId] = useState<string | null>(null);
    const [newRating, setNewRating] = useState(5);
    const [newComment, setNewComment] = useState('');

    const loadRequests = async () => {
        try {
            const res = await getBuyerRequests();
            setRequests(res.data.data || []);
        } catch (err: any) {
            console.error(err);
            toast.error('Failed to load requests');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadRequests();
    }, []);

    // Listen for realtime feedback_revision_request notification to auto-reload
    useEffect(() => {
        const socket = socketCtx?.socket;
        if (!socket) return;

        const handleNotification = (notif: any) => {
            if (notif.type === 'feedback_revision_request') {
                loadRequests();
                toast.info('You have a new feedback revision request!');
            }
        };

        socket.on('notification', handleNotification);
        return () => {
            socket.off('notification', handleNotification);
        };
    }, [socketCtx?.socket]);


    const handleViewRequest = (request: any) => {
        setSelectedRequest(request);
        setDialogOpen(true);
    };

    const handleAccept = async () => {
        if (!selectedRequest) return;

        setResponding(true);
        try {
            await respondToRequest(selectedRequest._id, {
                responseType: 'accepted',
                message: 'I will revise my feedback'
            });

            toast.success('Request accepted! Please revise your feedback below.');

            // Save the requestId before closing/reloading so edit dialog can use it
            const reqId = selectedRequest._id;
            const currentReview = selectedRequest.review;
            setDialogOpen(false);
            await loadRequests();

            // Open edit dialog with saved state
            setEditingRequestId(reqId);
            setNewRating(currentReview?.rating || 5);
            setNewComment(currentReview?.comment || '');
            setEditDialogOpen(true);
        } catch (err: any) {
            console.error(err);
            toast.error(err.response?.data?.message || 'Failed to accept request');
        } finally {
            setResponding(false);
        }
    };

    const openEditDialog = (request: any) => {
        setEditingRequestId(request._id);
        setNewRating(request.review?.rating || 5);
        setNewComment(request.review?.comment || '');
        setEditDialogOpen(true);
    };

    const handleDecline = async () => {
        if (!selectedRequest) return;

        setResponding(true);
        try {
            await respondToRequest(selectedRequest._id, {
                responseType: 'declined',
                message: 'I decline to revise my feedback'
            });

            toast.success('Request declined');
            setDialogOpen(false);
            loadRequests();
        } catch (err: any) {
            console.error(err);
            toast.error(err.response?.data?.message || 'Failed to decline request');
        } finally {
            setResponding(false);
        }
    };

    const handleSubmitRevision = async () => {
        if (!editingRequestId) return;

        if (newRating < 1 || newRating > 5) {
            toast.error('Rating must be between 1 and 5');
            return;
        }

        try {
            await applyRevision(editingRequestId, {
                rating: newRating,
                comment: newComment
            });

            toast.success('Feedback revised successfully!');
            setEditDialogOpen(false);
            setEditingRequestId(null);
            loadRequests();
        } catch (err: any) {
            console.error(err);
            toast.error(err.response?.data?.message || 'Failed to revise feedback');
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'pending':
                return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
            case 'accepted':
                return <Badge className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" />Accepted</Badge>;
            case 'declined':
                return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Declined</Badge>;
            case 'expired':
                return <Badge variant="outline">Expired</Badge>;
            default:
                return <Badge>{status}</Badge>;
        }
    };

    if (loading) {
        return (
            <div className="p-6 max-w-7xl mx-auto">
                <p className="text-center text-muted-foreground">Loading...</p>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <Card>
                <CardHeader>
                    <CardTitle className="text-2xl font-bold flex items-center gap-2">
                        Feedback Revision Requests
                        <Badge variant="secondary" className="ml-2">
                            {requests.filter(r => r.status === 'pending').length} Pending
                        </Badge>
                    </CardTitle>
                </CardHeader>

                <CardContent>
                    <Alert className="mb-6">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                            You are <strong>not required</strong> to revise your feedback.
                            Only do so if the seller has genuinely resolved the issue.
                        </AlertDescription>
                    </Alert>

                    {requests.length === 0 ? (
                        <div className="text-center py-12">
                            <AlertCircle className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                            <p className="text-muted-foreground">No revision requests</p>
                        </div>
                    ) : (
                        <div className="rounded-lg border">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-gray-50/50">
                                        <TableHead>Seller</TableHead>
                                        <TableHead>Reason</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Requested</TableHead>
                                        <TableHead>Expires</TableHead>
                                        <TableHead>Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {requests.map((request) => (
                                        <TableRow key={request._id}>
                                            <TableCell>
                                                {request.seller?.username || 'Unknown'}
                                            </TableCell>
                                            <TableCell className="capitalize">
                                                {request.reason?.replace('_', ' ') ?? '-'}
                                            </TableCell>
                                            <TableCell>
                                                {getStatusBadge(request.status)}
                                            </TableCell>
                                            <TableCell className="text-sm text-gray-600">
                                                {formatDateTime(request.createdAt)}
                                            </TableCell>
                                            <TableCell className="text-sm text-gray-600">
                                                {request.expiresAt && new Date(request.expiresAt) > new Date() ? (
                                                    formatDateTime(request.expiresAt)
                                                ) : request.expiresAt ? (
                                                    <span className="text-red-600">Expired</span>
                                                ) : (
                                                    <span className="text-muted-foreground">-</span>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex gap-2">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => handleViewRequest(request)}
                                                    >
                                                        View
                                                    </Button>
                                                    {request.status === 'accepted' && (
                                                        <Button
                                                            size="sm"
                                                            className="bg-yellow-500 hover:bg-yellow-600 text-white"
                                                            onClick={() => openEditDialog(request)}
                                                        >
                                                            <Star className="w-3 h-3 mr-1" />
                                                            Revise
                                                        </Button>
                                                    )}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* View Request Dialog */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Feedback Revision Request</DialogTitle>
                        <DialogDescription>
                            From: {selectedRequest?.seller?.username}
                        </DialogDescription>
                    </DialogHeader>

                    {selectedRequest && (
                        <div className="space-y-4">
                            <div>
                                <Label>Reason</Label>
                                <p className="text-sm capitalize">{selectedRequest.reason?.replace('_', ' ') ?? '-'}</p>
                            </div>

                            <div>
                                <Label>Message from Seller</Label>
                                <p className="text-sm bg-muted p-3 rounded">{selectedRequest.message}</p>
                            </div>

                            {selectedRequest.resolutionType && (
                                <div>
                                    <Label>Resolution</Label>
                                    <p className="text-sm capitalize">{selectedRequest.resolutionType.replace('_', ' ')}</p>
                                    {selectedRequest.resolutionProof && (
                                        <p className="text-xs text-muted-foreground mt-1">{selectedRequest.resolutionProof}</p>
                                    )}
                                </div>
                            )}

                            {selectedRequest.status === 'pending' && (
                                <div className="flex gap-3 pt-4">
                                    <Button
                                        onClick={handleAccept}
                                        disabled={responding}
                                        className="flex-1 bg-green-600 hover:bg-green-700"
                                    >
                                        <CheckCircle className="w-4 h-4 mr-2" />
                                        Accept & Revise Feedback
                                    </Button>
                                    <Button
                                        onClick={handleDecline}
                                        disabled={responding}
                                        variant="outline"
                                        className="flex-1"
                                    >
                                        <XCircle className="w-4 h-4 mr-2" />
                                        Decline
                                    </Button>
                                </div>
                            )}
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Edit Feedback Dialog */}
            <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Revise Your Feedback</DialogTitle>
                        <DialogDescription>
                            Update your rating and comment
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        <div>
                            <Label>Rating</Label>
                            <div className="flex gap-2 mt-2">
                                {[1, 2, 3, 4, 5].map((rating) => (
                                    <button
                                        key={rating}
                                        onClick={() => setNewRating(rating)}
                                        className={`p-2 ${newRating >= rating ? 'text-yellow-500' : 'text-gray-300'}`}
                                    >
                                        <Star className="w-8 h-8 fill-current" />
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <Label>Comment</Label>
                            <Textarea
                                value={newComment}
                                onChange={(e) => setNewComment(e.target.value)}
                                rows={4}
                                placeholder="Update your feedback..."
                            />
                        </div>

                        <Button onClick={handleSubmitRevision} className="w-full">
                            Submit Revised Feedback
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
