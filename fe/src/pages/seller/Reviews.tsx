import { useEffect, useState } from 'react';
import {
  Star,
  Search,
  ThumbsUp,
  MessageSquare,
  CheckCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import api from '@/lib/axios';

interface Review {
  _id: string;
  reviewer: { _id: string; username: string } | null;
  product: { _id: string; title: string } | null;
  rating: number;
  comment: string;
  createdAt: string;
  sellerResponse?: string;
  sellerResponseAt?: string;
  flagged: boolean;
  deletedAt?: string;
}

export default function SellerReviews() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRating, setSelectedRating] = useState('all');
  const [replyText, setReplyText] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [submittingReply, setSubmittingReply] = useState(false);

  useEffect(() => {
    fetchReviews();
  }, []);

  const fetchReviews = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/reviews/seller/my-reviews');
      setReviews(res.data?.data ?? []);
    } catch (err: any) {
      // Nếu API chưa có → fallback empty
      console.warn('[Reviews] API error, showing empty state:', err?.response?.status);
      setReviews([]);
    } finally {
      setLoading(false);
    }
  };

  const handleReply = async (reviewId: string) => {
    if (!replyText.trim()) {
      toast.error('Vui lòng nhập nội dung phản hồi');
      return;
    }
    setSubmittingReply(true);
    try {
      await api.post(`/api/reviews/${reviewId}/seller-response`, { response: replyText });
      toast.success('Đã gửi phản hồi');
      setReplyText('');
      setReplyingTo(null);
      fetchReviews();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Gửi phản hồi thất bại');
    } finally {
      setSubmittingReply(false);
    }
  };

  // Filter
  const filtered = reviews.filter(r => {
    if (r.deletedAt) return false;
    const q = searchTerm.toLowerCase();
    const matchSearch =
      !q ||
      (r.reviewer?.username ?? '').toLowerCase().includes(q) ||
      (r.product?.title ?? '').toLowerCase().includes(q) ||
      (r.comment ?? '').toLowerCase().includes(q);
    const matchRating =
      selectedRating === 'all' || String(r.rating) === selectedRating;
    return matchSearch && matchRating;
  });

  const avgRating =
    reviews.length > 0
      ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
      : '--';

  const fiveStar = reviews.filter(r => r.rating === 5).length;
  const withResponse = reviews.filter(r => r.sellerResponse).length;

  const starLabel = (s: number) => `${s} sao`;

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Phản hồi của khách hàng</h1>
          <p className="text-gray-600">Quản lý và phản hồi đánh giá từ khách hàng</p>
        </div>
        <div className="text-right">
          <div className="text-3xl font-bold flex items-center gap-2">
            <Star className="h-8 w-8 text-yellow-500 fill-yellow-500" />
            {avgRating}
            <span className="text-lg text-gray-500">/5</span>
          </div>
          <div className="text-sm text-gray-600">Từ {reviews.length} đánh giá</div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: '5 sao', value: fiveStar, color: 'text-green-600' },
          { label: 'Tổng đánh giá', value: reviews.length, color: '' },
          { label: 'Chưa phản hồi', value: reviews.length - withResponse, color: 'text-blue-600' },
          { label: 'Đã phản hồi', value: withResponse, color: 'text-purple-600' },
        ].map(s => (
          <Card key={s.label}>
            <CardContent className="p-4 text-center">
              <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
              <div className="text-sm text-gray-600">{s.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Tìm kiếm theo tên khách hàng, sản phẩm..."
                className="pl-10"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
            <select
              className="rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={selectedRating}
              onChange={e => setSelectedRating(e.target.value)}
            >
              <option value="all">Tất cả sao</option>
              {[5, 4, 3, 2, 1].map(s => (
                <option key={s} value={String(s)}>{starLabel(s)}</option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      {/* List */}
      {loading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-32 bg-muted animate-pulse rounded-xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Star className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <h3 className="text-lg font-medium text-foreground mb-1">
            {reviews.length === 0 ? 'Chưa có đánh giá nào' : 'Không tìm thấy kết quả'}
          </h3>
          <p className="text-sm">
            {reviews.length === 0
              ? 'Đánh giá từ khách hàng sẽ xuất hiện tại đây sau khi giao hàng thành công.'
              : 'Thử thay đổi bộ lọc hoặc từ khoá tìm kiếm.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map(review => (
            <Card key={review._id}>
              <CardContent className="p-5">
                <div className="flex flex-col md:flex-row gap-4">
                  {/* Customer Info */}
                  <div className="md:w-1/4 flex-shrink-0">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-9 h-9 bg-muted rounded-full flex items-center justify-center text-sm font-semibold">
                        {(review.reviewer?.username ?? '?').charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-semibold text-sm">
                          {review.reviewer?.username ?? 'Ẩn danh'}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(review.createdAt).toLocaleDateString('vi-VN')}
                        </div>
                      </div>
                    </div>

                    {/* Stars */}
                    <div className="flex items-center mb-1">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`h-4 w-4 ${i < review.rating ? 'text-yellow-500 fill-yellow-500' : 'text-gray-200'}`}
                        />
                      ))}
                      <span className="ml-1.5 text-sm font-medium">{review.rating}/5</span>
                    </div>

                    <div className="text-xs text-muted-foreground">
                      SP: <span className="font-medium">{review.product?.title ?? 'Đã xoá'}</span>
                    </div>

                    {review.flagged && (
                      <Badge variant="destructive" className="mt-2 text-xs">Đã báo cáo</Badge>
                    )}
                  </div>

                  {/* Review content */}
                  <div className="flex-1">
                    <p className="text-gray-800 mb-3 text-sm leading-relaxed">{review.comment}</p>

                    {/* Seller response */}
                    {review.sellerResponse && (
                      <div className="bg-muted/50 rounded-lg p-3 mb-3 border-l-4 border-primary">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="w-5 h-5 bg-primary/10 rounded-full flex items-center justify-center">
                            <span className="text-primary text-xs font-bold">S</span>
                          </div>
                          <span className="text-xs font-semibold">Phản hồi từ người bán</span>
                          {review.sellerResponseAt && (
                            <span className="text-xs text-muted-foreground">
                              · {new Date(review.sellerResponseAt).toLocaleDateString('vi-VN')}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-700">{review.sellerResponse}</p>
                      </div>
                    )}

                    {/* Reply form / button */}
                    {replyingTo === review._id ? (
                      <div className="space-y-2">
                        <Textarea
                          placeholder="Nhập phản hồi của bạn..."
                          value={replyText}
                          onChange={e => setReplyText(e.target.value)}
                          rows={3}
                        />
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            disabled={submittingReply}
                            onClick={() => handleReply(review._id)}
                          >
                            {submittingReply ? 'Đang gửi...' : (
                              <><CheckCircle className="h-4 w-4 mr-1" />Gửi phản hồi</>
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => { setReplyingTo(null); setReplyText(''); }}
                          >
                            Hủy
                          </Button>
                        </div>
                      </div>
                    ) : (
                      !review.sellerResponse && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setReplyingTo(review._id)}
                        >
                          <MessageSquare className="h-4 w-4 mr-1" />
                          Phản hồi
                        </Button>
                      )
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}