import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { getSellerRequests, cancelRevisionRequest } from '@/api/feedbackRevision';
import { formatDateTime } from '@/lib/utils';

export default function SellerFeedbackRequestsPage() {
    const navigate = useNavigate();
    const [requests, setRequests] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadRequests();
    }, []);

    const loadRequests = async () => {
        try {
            const res = await getSellerRequests();
            setRequests(res.data.data || []);
        } catch (err: any) {
            console.error(err);
            toast.error('Failed to load requests');
        } finally {
            setLoading(false);
        }
    };

    const handleCancel = async (requestId: string) => {
        if (!confirm('Are you sure you want to cancel this request?')) return;

        try {
            await cancelRevisionRequest(requestId);
            toast.success('Request cancelled');
            loadRequests();
        } catch (err: any) {
            console.error(err);
            toast.error(err.response?.data?.message || 'Failed to cancel request');
        }
    };

    const getStatusBadge = (status: string, flagged: boolean) => {
        if (flagged) {
            return <Badge variant="destructive">Flagged</Badge>;
        }

        switch (status) {
            case 'pending':
                return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
            case 'accepted':
                return <Badge className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" />Accepted</Badge>;
            case 'declined':
                return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Declined</Badge>;
            case 'expired':
                return <Badge variant="outline">Expired</Badge>;
            case 'cancelled':
                return <Badge variant="outline">Cancelled</Badge>;
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
                        My Feedback Revision Requests
                        <Badge variant="secondary" className="ml-2">
                            {requests.length}
                        </Badge>
                    </CardTitle>
                </CardHeader>

                <CardContent>
                    {requests.length === 0 ? (
                        <div className="text-center py-12">
                            <AlertCircle className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                            <p className="text-muted-foreground">No revision requests yet</p>
                        </div>
                    ) : (
                        <div className="rounded-lg border">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-gray-50/50">
                                        <TableHead>Buyer</TableHead>
                                        <TableHead>Reason</TableHead>
                                        <TableHead>Message</TableHead>
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
                                                {request.buyer?.username || 'Unknown'}
                                            </TableCell>
                                            <TableCell className="capitalize">
                                                {request.reason.replace('_', ' ')}
                                            </TableCell>
                                            <TableCell className="max-w-xs">
                                                <div className="truncate" title={request.message}>
                                                    {request.message}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                {getStatusBadge(request.status, request.flaggedForReview)}
                                            </TableCell>
                                            <TableCell className="text-sm text-gray-600">
                                                {formatDateTime(request.createdAt)}
                                            </TableCell>
                                            <TableCell className="text-sm text-gray-600">
                                                {new Date(request.expiresAt) > new Date() ? (
                                                    formatDateTime(request.expiresAt)
                                                ) : (
                                                    <span className="text-red-600">Expired</span>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                {request.status === 'pending' && (
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => handleCancel(request._id)}
                                                    >
                                                        Cancel
                                                    </Button>
                                                )}
                                                {request.flaggedForReview && (
                                                    <Badge variant="destructive" className="text-xs">
                                                        Under Review
                                                    </Badge>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
