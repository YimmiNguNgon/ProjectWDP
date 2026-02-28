import { useState } from 'react';
import {
  Star,
  Search,
  ThumbsUp,
  MessageSquare,
  Flag,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

interface Review {
  id: string;
  customer: string;
  rating: number;
  comment: string;
  product: string;
  date: string;
  helpful: number;
  status: 'pending' | 'approved' | 'rejected';
  hasResponse: boolean;
  response?: string;
}

export default function SellerReviews() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRating, setSelectedRating] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [replyText, setReplyText] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);

  const reviews: Review[] = [
    {
      id: '#REV001',
      customer: 'John Carter',
      rating: 5,
      comment: 'Great product, fast shipping, exactly as described. Very satisfied.',
      product: 'Cotton T-Shirt',
      date: '12/15/2023',
      helpful: 12,
      status: 'approved',
      hasResponse: true,
      response: 'Thanks for your review. We are happy that you liked the product.',
    },
    {
      id: '#REV002',
      customer: 'Emily Tran',
      rating: 4,
      comment: 'Good quality but shipping was slightly delayed. Will buy again.',
      product: 'Bluetooth Headphones',
      date: '12/14/2023',
      helpful: 5,
      status: 'approved',
      hasResponse: false,
    },
    {
      id: '#REV003',
      customer: 'David Lee',
      rating: 1,
      comment: 'Product does not match the photos and quality is poor.',
      product: 'Sports Water Bottle',
      date: '12/13/2023',
      helpful: 0,
      status: 'pending',
      hasResponse: false,
    },
    {
      id: '#REV004',
      customer: 'Sophia Nguyen',
      rating: 3,
      comment: 'Average quality, price is a bit high for the value.',
      product: 'LED Night Light',
      date: '12/12/2023',
      helpful: 3,
      status: 'approved',
      hasResponse: true,
      response: 'Thank you for the feedback. We are reviewing our pricing strategy.',
    },
    {
      id: '#REV005',
      customer: 'Michael Hoang',
      rating: 5,
      comment: 'Excellent. This is my third purchase from this store.',
      product: 'Programming Book',
      date: '12/11/2023',
      helpful: 8,
      status: 'approved',
      hasResponse: true,
      response: 'Thanks for your continued support.',
    },
    {
      id: '#REV006',
      customer: 'Ava Do',
      rating: 2,
      comment: 'Item arrived with scratches. Not satisfied.',
      product: 'Laptop Backpack',
      date: '12/10/2023',
      helpful: 2,
      status: 'rejected',
      hasResponse: true,
      response: 'Sorry for your experience. We already contacted you for a replacement.',
    },
  ];

  const ratings = ['All', '5 stars', '4 stars', '3 stars', '2 stars', '1 star'];
  const statuses = ['All', 'Pending', 'Approved', 'Rejected'];

  const filteredReviews = reviews.filter((review) => {
    const matchesSearch =
      review.customer.toLowerCase().includes(searchTerm.toLowerCase()) ||
      review.product.toLowerCase().includes(searchTerm.toLowerCase()) ||
      review.comment.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesRating =
      selectedRating === 'all' ||
      (selectedRating === '5 stars' && review.rating === 5) ||
      (selectedRating === '4 stars' && review.rating === 4) ||
      (selectedRating === '3 stars' && review.rating === 3) ||
      (selectedRating === '2 stars' && review.rating === 2) ||
      (selectedRating === '1 star' && review.rating === 1);

    const matchesStatus =
      selectedStatus === 'all' ||
      (selectedStatus === 'Pending' && review.status === 'pending') ||
      (selectedStatus === 'Approved' && review.status === 'approved') ||
      (selectedStatus === 'Rejected' && review.status === 'rejected');

    return matchesSearch && matchesRating && matchesStatus;
  });

  const stats = {
    total: reviews.length,
    average: (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1),
    pending: reviews.filter((r) => r.status === 'pending').length,
    fiveStar: reviews.filter((r) => r.rating === 5).length,
  };

  const getStatusBadge = (status: Review['status']) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="border-yellow-300 text-yellow-800 bg-yellow-50">Pending</Badge>;
      case 'approved':
        return <Badge variant="outline" className="border-green-300 text-green-800 bg-green-50">Approved</Badge>;
      case 'rejected':
        return <Badge variant="outline" className="border-red-300 text-red-800 bg-red-50">Rejected</Badge>;
    }
  };

  const handleApprove = () => {
    toast.success('Review approved');
  };

  const handleReject = () => {
    toast.success('Review rejected');
  };

  const handleReply = () => {
    if (!replyText.trim()) {
      toast.error('Please enter a reply');
      return;
    }
    toast.success('Reply sent');
    setReplyText('');
    setReplyingTo(null);
  };

  const handleMarkHelpful = () => {
    toast.success('Marked as helpful');
  };

  const handleReport = () => {
    toast.info('Review reported to admin');
  };

  return (
    <div className="p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Customer Reviews</h1>
          <p className="text-gray-600">Manage and respond to customer feedback</p>
        </div>
        <div className="text-right">
          <div className="text-3xl font-bold flex items-center gap-2">
            <Star className="h-8 w-8 text-yellow-500 fill-yellow-500" />
            {stats.average}
            <span className="text-lg text-gray-500">/5</span>
          </div>
          <div className="text-sm text-gray-600">From {stats.total} reviews</div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{stats.fiveStar}</div>
            <div className="text-sm text-gray-600">5-star reviews</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold">{stats.total}</div>
            <div className="text-sm text-gray-600">Total reviews</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{stats.pending}</div>
            <div className="text-sm text-gray-600">Pending</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-purple-600">{reviews.filter((r) => r.hasResponse).length}</div>
            <div className="text-sm text-gray-600">Replied</div>
          </CardContent>
        </Card>
      </div>

      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by customer or product..."
                  className="pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            <div className="w-full md:w-auto">
              <select
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={selectedRating}
                onChange={(e) => setSelectedRating(e.target.value)}
              >
                {ratings.map((rating) => (
                  <option key={rating} value={rating === 'All' ? 'all' : rating}>
                    {rating}
                  </option>
                ))}
              </select>
            </div>

            <div className="w-full md:w-auto">
              <select
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
              >
                {statuses.map((status) => (
                  <option key={status} value={status === 'All' ? 'all' : status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-6">
        {filteredReviews.map((review) => (
          <Card key={review.id}>
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="md:w-1/4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                      <span className="font-semibold">{review.customer.charAt(0)}</span>
                    </div>
                    <div>
                      <div className="font-semibold">{review.customer}</div>
                      <div className="text-sm text-gray-500">{review.date}</div>
                    </div>
                  </div>

                  <div className="flex items-center mb-2">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className={`h-5 w-5 ${i < review.rating ? 'text-yellow-500 fill-yellow-500' : 'text-gray-300'}`} />
                    ))}
                    <span className="ml-2 font-medium">{review.rating}/5</span>
                  </div>

                  <div className="text-sm text-gray-600 mb-3">
                    Product: <span className="font-medium">{review.product}</span>
                  </div>

                  {getStatusBadge(review.status)}
                </div>

                <div className="md:w-3/4">
                  <p className="text-gray-700 mb-4">{review.comment}</p>

                  <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
                    <button className="flex items-center gap-1 hover:text-blue-600" onClick={handleMarkHelpful}>
                      <ThumbsUp className="h-4 w-4" />
                      Helpful ({review.helpful})
                    </button>
                    <button className="flex items-center gap-1 hover:text-red-600" onClick={handleReport}>
                      <Flag className="h-4 w-4" />
                      Report
                    </button>
                  </div>

                  {review.hasResponse && review.response && (
                    <div className="bg-gray-50 rounded-lg p-4 mb-4 border-l-4 border-green-500">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                          <span className="text-green-600 text-sm font-bold">S</span>
                        </div>
                        <span className="font-semibold">Seller response</span>
                      </div>
                      <p className="text-gray-700">{review.response}</p>
                    </div>
                  )}

                  {replyingTo === review.id ? (
                    <div className="space-y-3">
                      <Textarea
                        placeholder="Enter your reply..."
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        rows={3}
                      />
                      <div className="flex gap-2">
                        <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={handleReply}>
                          Send reply
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setReplyingTo(null)}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      {!review.hasResponse && (
                        <Button size="sm" variant="outline" onClick={() => setReplyingTo(review.id)}>
                          <MessageSquare className="h-4 w-4 mr-2" />
                          Reply
                        </Button>
                      )}

                      {review.status === 'pending' && (
                        <>
                          <Button size="sm" variant="outline" className="text-green-600 border-green-200 hover:bg-green-50" onClick={handleApprove}>
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Approve
                          </Button>
                          <Button size="sm" variant="outline" className="text-red-600 border-red-200 hover:bg-red-50" onClick={handleReject}>
                            <XCircle className="h-4 w-4 mr-2" />
                            Reject
                          </Button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredReviews.length === 0 && (
        <div className="text-center py-12">
          <Star className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No reviews found</h3>
          <p className="text-gray-600">Try changing filters or search keywords</p>
        </div>
      )}
    </div>
  );
}
