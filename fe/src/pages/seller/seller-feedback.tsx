import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Star, MessageSquare, AlertCircle, MessageCircle } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/axios';
import { formatDateTime } from '@/lib/utils';
import SellerReplyDialog from '@/components/seller-reply-dialog';

export default function SellerFeedbackPage() {
    const navigate = useNavigate();
    const [reviews, setReviews] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [replyDialogOpen, setReplyDialogOpen] = useState(false);
    const [selectedReview, setSelectedReview] = useState<any>(null);

    useEffect(() => {
        loadReviews();
    }, []);

    const loadReviews = async () => {
        try {
            // Get all reviews where current user is the seller
            const res = await api.get('/api/reviews/seller/received');
            setReviews(res.data.data || []);
        } catch (err: any) {
            console.error(err);
            toast.error('Failed to load feedback');
        } finally {
            setLoading(false);
        }
    };

    const handleRequestRevision = (reviewId: string) => {
        navigate(`/seller/feedback-revision-request/${reviewId}`);
    };

    const handleReply = (review: any) => {
        setSelectedReview(review);
        setReplyDialogOpen(true);
    };

    const handleReplySuccess = () => {
        loadReviews(); // Reload to show updated response
    };

    const getTypeColor = (type: string) => {
        switch (type) {
            case 'positive':
                return 'bg-green-50 text-green-700 border-green-200';
            case 'neutral':
                return 'bg-yellow-50 text-yellow-700 border-yellow-200';
            case 'negative':
                return 'bg-red-50 text-red-700 border-red-200';
            default:
                return 'bg-gray-50 text-gray-700 border-gray-200';
        }
    };

    const renderStars = (rating: number) => {
        return (
            <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                        key={star}
                        className={`w-4 h-4 ${star <= rating
                            ? 'fill-yellow-400 text-yellow-400'
                            : 'text-gray-300'
                            }`}
                    />
                ))}
                <span className="ml-2 text-sm text-muted-foreground">({rating}/5)</span>
            </div>
        );
    };

    const positiveReviews = reviews.filter(r => r.type === 'positive');
    const neutralReviews = reviews.filter(r => r.type === 'neutral');
    const negativeReviews = reviews.filter(r => r.type === 'negative');

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
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-2xl font-bold flex items-center gap-2">
                            <MessageSquare className="w-6 h-6" />
                            Feedback Received
                            <Badge variant="secondary" className="ml-2">
                                {reviews.length}
                            </Badge>
                        </CardTitle>
                        <Button
                            variant="outline"
                            onClick={() => navigate('/seller/feedback-requests')}
                        >
                            View Revision Requests
                        </Button>
                    </div>
                </CardHeader>

                <CardContent>
                    {reviews.length === 0 ? (
                        <div className="text-center py-12">
                            <AlertCircle className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                            <p className="text-muted-foreground">No feedback received yet</p>
                        </div>
                    ) : (
                        <Tabs defaultValue="all">
                            <TabsList>
                                <TabsTrigger value="all">
                                    All ({reviews.length})
                                </TabsTrigger>
                                <TabsTrigger value="positive">
                                    Positive ({positiveReviews.length})
                                </TabsTrigger>
                                <TabsTrigger value="neutral">
                                    Neutral ({neutralReviews.length})
                                </TabsTrigger>
                                <TabsTrigger value="negative">
                                    Negative ({negativeReviews.length})
                                </TabsTrigger>
                            </TabsList>

                            <TabsContent value="all" className="mt-6">
                                {renderReviewsTable(reviews)}
                            </TabsContent>

                            <TabsContent value="positive" className="mt-6">
                                {renderReviewsTable(positiveReviews)}
                            </TabsContent>

                            <TabsContent value="neutral" className="mt-6">
                                {renderReviewsTable(neutralReviews)}
                            </TabsContent>

                            <TabsContent value="negative" className="mt-6">
                                {renderReviewsTable(negativeReviews)}
                            </TabsContent>
                        </Tabs>
                    )}
                </CardContent>
            </Card>

            {/* Seller Reply Dialog */}
            {selectedReview && (
                <SellerReplyDialog
                    review={selectedReview}
                    open={replyDialogOpen}
                    onOpenChange={setReplyDialogOpen}
                    onSuccess={handleReplySuccess}
                />
            )}
        </div>
    );

    function renderReviewsTable(reviewList: any[]) {
        if (reviewList.length === 0) {
            return (
                <div className="text-center py-8 text-muted-foreground">
                    No feedback in this category
                </div>
            );
        }

        return (
            <div className="rounded-lg border">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-gray-50/50">
                            <TableHead>Buyer</TableHead>
                            <TableHead>Rating</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Comment</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {reviewList.map((review) => (
                            <TableRow key={review._id}>
                                <TableCell>
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                                            <span className="text-xs font-medium text-primary">
                                                {review.reviewer?.username?.charAt(0).toUpperCase() || 'B'}
                                            </span>
                                        </div>
                                        <span className="font-medium">
                                            {review.reviewer?.username || 'Unknown'}
                                        </span>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    {renderStars(review.rating)}
                                </TableCell>
                                <TableCell>
                                    <Badge variant="outline" className={getTypeColor(review.type)}>
                                        {review.type}
                                    </Badge>
                                </TableCell>
                                <TableCell className="max-w-md">
                                    <div className="truncate" title={review.comment}>
                                        {review.comment || 'No comment'}
                                    </div>
                                    {review.revisedAt && (
                                        <Badge variant="outline" className="mt-1 text-xs">
                                            Revised
                                        </Badge>
                                    )}
                                </TableCell>
                                <TableCell className="text-sm text-gray-600">
                                    {formatDateTime(review.createdAt)}
                                </TableCell>
                                <TableCell>
                                    {review.revisionRequested ? (
                                        <Badge variant="secondary">
                                            Revision Requested
                                        </Badge>
                                    ) : (
                                        <Badge variant="outline">Active</Badge>
                                    )}
                                </TableCell>
                                <TableCell>
                                    <div className="flex gap-2">
                                        {/* Reply Button - Always show for neutral/negative */}
                                        {(review.type === 'neutral' || review.type === 'negative') && (
                                            <Button
                                                size="sm"
                                                variant={review.sellerResponse ? "secondary" : "default"}
                                                onClick={() => handleReply(review)}
                                                className="gap-1"
                                            >
                                                <MessageCircle className="w-3 h-3" />
                                                {review.sellerResponse ? 'Edit Reply' : 'Reply'}
                                            </Button>
                                        )}

                                        {/* Request Revision Button */}
                                        {!review.revisionRequested && (
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => handleRequestRevision(review._id)}
                                                className="text-primary hover:text-primary/80"
                                            >
                                                Request Revision
                                            </Button>
                                        )}
                                        {review.revisionRequested && (
                                            <span className="text-xs text-muted-foreground">
                                                Revision requested
                                            </span>
                                        )}
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        );
    }
}
