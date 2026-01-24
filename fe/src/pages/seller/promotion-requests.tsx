import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
    getMyPromotionRequests,
    cancelPromotionRequest,
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
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from '@/components/ui/tabs';
import { Package, Tag, TrendingUp, AlertCircle } from 'lucide-react';

export default function PromotionRequestsPage() {
    const [requests, setRequests] = useState<PromotionRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState('all');

    const fetchRequests = async () => {
        try {
            setLoading(true);
            const params = statusFilter !== 'all' ? { status: statusFilter } : {};
            const response = await getMyPromotionRequests(params);
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
    }, [statusFilter]);

    const handleCancel = async (requestId: string) => {
        if (!confirm('Are you sure you want to cancel this request?')) return;

        try {
            await cancelPromotionRequest(requestId);
            toast.success('Promotion request cancelled');
            fetchRequests();
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to cancel request');
        }
    };

    const getStatusBadge = (status: string) => {
        const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
            pending: 'secondary',
            approved: 'default',
            rejected: 'destructive',
            expired: 'outline',
            cancelled: 'outline',
        };
        return (
            <Badge variant={variants[status] || 'default'}>
                {status.charAt(0).toUpperCase() + status.slice(1)}
            </Badge>
        );
    };

    const getTypeBadge = (type: string) => {
        return type === 'outlet' ? (
            <Badge className="bg-orange-600">
                <Package className="w-3 h-3 mr-1" />
                Brand Outlet
            </Badge>
        ) : (
            <Badge className="bg-red-600">
                <Tag className="w-3 h-3 mr-1" />
                Daily Deal
            </Badge>
        );
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    };

    return (
        <div className="container mx-auto py-8">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-3xl font-bold">Promotion Requests</h1>
                    <p className="text-gray-600 mt-1">
                        Manage your Brand Outlet and Daily Deal requests
                    </p>
                </div>
                <Link to="/seller/my-listings">
                    <Button>
                        <TrendingUp className="w-4 h-4 mr-2" />
                        Request New Promotion
                    </Button>
                </Link>
            </div>

            {/* Instructions Card */}
            <Card className="mb-6 border-blue-200 bg-blue-50">
                <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                        <AlertCircle className="w-5 h-5 text-blue-600" />
                        How It Works
                    </CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-2">
                    <p>
                        <strong>Brand Outlet:</strong> For products that are NEW, listed
                        for 60+ days, with 30%+ discount, and verified seller.
                    </p>
                    <p>
                        <strong>Daily Deal:</strong> Time-limited promotions with quantity
                        limits. Requires admin approval.
                    </p>
                    <p className="text-gray-600">
                        All requests are reviewed by our admin team before approval.
                    </p>
                </CardContent>
            </Card>

            {/* Tabs for filtering */}
            <Tabs value={statusFilter} onValueChange={setStatusFilter} className="mb-6">
                <TabsList>
                    <TabsTrigger value="all">All</TabsTrigger>
                    <TabsTrigger value="pending">Pending</TabsTrigger>
                    <TabsTrigger value="approved">Approved</TabsTrigger>
                    <TabsTrigger value="rejected">Rejected</TabsTrigger>
                </TabsList>
            </Tabs>

            {/* Requests Table */}
            <Card>
                <CardContent className="p-0">
                    {loading ? (
                        <div className="text-center py-12">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
                            <p className="mt-4 text-gray-600">Loading requests...</p>
                        </div>
                    ) : requests.length === 0 ? (
                        <div className="text-center py-12">
                            <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                            <p className="text-gray-600">No promotion requests found</p>
                            <Link to="/seller/my-listings">
                                <Button className="mt-4" variant="outline">
                                    Go to My Listings
                                </Button>
                            </Link>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Product</TableHead>
                                    <TableHead>Type</TableHead>
                                    <TableHead>Pricing</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Eligible</TableHead>
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
                                                    <p className="text-sm text-gray-500">
                                                        {request.product.condition}
                                                    </p>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>{getTypeBadge(request.requestType)}</TableCell>
                                        <TableCell>
                                            <div className="space-y-1">
                                                <p className="line-through text-gray-500 text-sm">
                                                    ${request.originalPrice.toFixed(2)}
                                                </p>
                                                <p className="font-bold text-red-600">
                                                    ${request.discountedPrice.toFixed(2)}
                                                </p>
                                                <Badge variant="outline" className="text-xs">
                                                    {request.discountPercent}% off
                                                </Badge>
                                            </div>
                                        </TableCell>
                                        <TableCell>{getStatusBadge(request.status)}</TableCell>
                                        <TableCell>
                                            {request.eligibilityChecks.allPassed ? (
                                                <Badge variant="default" className="bg-green-600">
                                                    ✓ Eligible
                                                </Badge>
                                            ) : (
                                                <Badge variant="destructive">✗ Not Eligible</Badge>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-sm text-gray-600">
                                            {formatDate(request.createdAt)}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {request.status === 'pending' && (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handleCancel(request._id)}
                                                >
                                                    Cancel
                                                </Button>
                                            )}
                                            {request.status === 'rejected' && request.rejectionReason && (
                                                <Badge variant="destructive" className="text-xs">
                                                    {request.rejectionReason}
                                                </Badge>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
