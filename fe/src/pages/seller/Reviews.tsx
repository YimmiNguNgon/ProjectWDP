import { useState } from 'react';
import { 
  Star, 
  Search, 
  Filter, 
  ThumbsUp, 
  MessageSquare, 
  Flag,
  CheckCircle,
  XCircle,
  MoreVertical
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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

  // Mock reviews data
  const reviews: Review[] = [
    { id: '#REV001', customer: 'Nguyễn Văn A', rating: 5, comment: 'Sản phẩm tốt, giao hàng nhanh, đúng như mô tả. Rất hài lòng với chất lượng!', product: 'Áo thun cotton', date: '15/12/2023', helpful: 12, status: 'approved', hasResponse: true, response: 'Cảm ơn bạn đã đánh giá! Chúng tôi rất vui vì bạn hài lòng với sản phẩm.' },
    { id: '#REV002', customer: 'Trần Thị B', rating: 4, comment: 'Chất lượng tốt nhưng giao hàng hơi chậm. Sẽ tiếp tục ủng hộ shop.', product: 'Tai nghe Bluetooth', date: '14/12/2023', helpful: 5, status: 'approved', hasResponse: false },
    { id: '#REV003', customer: 'Lê Văn C', rating: 1, comment: 'Sản phẩm không đúng như hình, chất lượng kém. Rất thất vọng!', product: 'Bình nước thể thao', date: '13/12/2023', helpful: 0, status: 'pending', hasResponse: false },
    { id: '#REV004', customer: 'Phạm Thị D', rating: 3, comment: 'Sản phẩm tạm được, giá hơi cao so với chất lượng.', product: 'Đèn ngủ LED', date: '12/12/2023', helpful: 3, status: 'approved', hasResponse: true, response: 'Cảm ơn phản hồi của bạn. Chúng tôi sẽ xem xét điều chỉnh giá cho phù hợp hơn.' },
    { id: '#REV005', customer: 'Hoàng Văn E', rating: 5, comment: 'Tuyệt vời! Đã mua lần thứ 3 và sẽ tiếp tục ủng hộ shop.', product: 'Sách lập trình', date: '11/12/2023', helpful: 8, status: 'approved', hasResponse: true, response: 'Cảm ơn bạn đã tin tưởng và ủng hộ shop nhiều lần!' },
    { id: '#REV006', customer: 'Đỗ Thị F', rating: 2, comment: 'Nhận hàng bị trầy xước, không hài lòng.', product: 'Balo laptop', date: '10/12/2023', helpful: 2, status: 'rejected', hasResponse: true, response: 'Rất tiếc về trải nghiệm của bạn. Chúng tôi đã liên hệ để hỗ trợ đổi trả.' },
  ];

  const ratings = ['Tất cả', '5 sao', '4 sao', '3 sao', '2 sao', '1 sao'];
  const statuses = ['Tất cả', 'Chờ duyệt', 'Đã duyệt', 'Đã từ chối'];

  const filteredReviews = reviews.filter(review => {
    const matchesSearch = 
      review.customer.toLowerCase().includes(searchTerm.toLowerCase()) ||
      review.product.toLowerCase().includes(searchTerm.toLowerCase()) ||
      review.comment.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRating = selectedRating === 'all' || 
      (selectedRating === '5 sao' && review.rating === 5) ||
      (selectedRating === '4 sao' && review.rating === 4) ||
      (selectedRating === '3 sao' && review.rating === 3) ||
      (selectedRating === '2 sao' && review.rating === 2) ||
      (selectedRating === '1 sao' && review.rating === 1);
    
    const matchesStatus = selectedStatus === 'all' || 
      (selectedStatus === 'Chờ duyệt' && review.status === 'pending') ||
      (selectedStatus === 'Đã duyệt' && review.status === 'approved') ||
      (selectedStatus === 'Đã từ chối' && review.status === 'rejected');
    
    return matchesSearch && matchesRating && matchesStatus;
  });

  const stats = {
    total: reviews.length,
    average: (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1),
    pending: reviews.filter(r => r.status === 'pending').length,
    fiveStar: reviews.filter(r => r.rating === 5).length,
  };

  const getStatusBadge = (status: Review['status']) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="border-yellow-300 text-yellow-800 bg-yellow-50">Chờ duyệt</Badge>;
      case 'approved':
        return <Badge variant="outline" className="border-green-300 text-green-800 bg-green-50">Đã duyệt</Badge>;
      case 'rejected':
        return <Badge variant="outline" className="border-red-300 text-red-800 bg-red-50">Đã từ chối</Badge>;
    }
  };

  const handleApprove = (reviewId: string) => {
    toast.success('Đã duyệt đánh giá');
    // Add API call here
  };

  const handleReject = (reviewId: string) => {
    toast.success('Đã từ chối đánh giá');
    // Add API call here
  };

  const handleReply = (reviewId: string) => {
    if (!replyText.trim()) {
      toast.error('Vui lòng nhập nội dung phản hồi');
      return;
    }
    toast.success('Đã gửi phản hồi');
    setReplyText('');
    setReplyingTo(null);
    // Add API call here
  };

  const handleMarkHelpful = (reviewId: string) => {
    toast.success('Đã đánh dấu hữu ích');
    // Add API call here
  };

  const handleReport = (reviewId: string) => {
    toast.info('Đã báo cáo đánh giá cho quản trị viên');
    // Add API call here
  };

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
            {stats.average}
            <span className="text-lg text-gray-500">/5</span>
          </div>
          <div className="text-sm text-gray-600">Từ {stats.total} đánh giá</div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{stats.fiveStar}</div>
            <div className="text-sm text-gray-600">5 sao</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold">{stats.total}</div>
            <div className="text-sm text-gray-600">Tổng đánh giá</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{stats.pending}</div>
            <div className="text-sm text-gray-600">Chờ duyệt</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-purple-600">
              {reviews.filter(r => r.hasResponse).length}
            </div>
            <div className="text-sm text-gray-600">Đã phản hồi</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Tìm kiếm theo tên khách hàng, sản phẩm..."
                  className="pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            {/* Rating Filter */}
            <div className="w-full md:w-auto">
              <select
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={selectedRating}
                onChange={(e) => setSelectedRating(e.target.value)}
              >
                {ratings.map(rating => (
                  <option key={rating} value={rating === 'Tất cả' ? 'all' : rating}>
                    {rating}
                  </option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div className="w-full md:w-auto">
              <select
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
              >
                {statuses.map(status => (
                  <option key={status} value={status === 'Tất cả' ? 'all' : status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Reviews List */}
      <div className="space-y-6">
        {filteredReviews.map((review) => (
          <Card key={review.id}>
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row gap-4">
                {/* Customer Info */}
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
                      <Star 
                        key={i} 
                        className={`h-5 w-5 ${i < review.rating ? 'text-yellow-500 fill-yellow-500' : 'text-gray-300'}`}
                      />
                    ))}
                    <span className="ml-2 font-medium">{review.rating}/5</span>
                  </div>
                  
                  <div className="text-sm text-gray-600 mb-3">
                    Sản phẩm: <span className="font-medium">{review.product}</span>
                  </div>
                  
                  {getStatusBadge(review.status)}
                </div>

                {/* Review Content */}
                <div className="md:w-3/4">
                  <p className="text-gray-700 mb-4">{review.comment}</p>
                  
                  {/* Helpful Count */}
                  <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
                    <button 
                      className="flex items-center gap-1 hover:text-blue-600"
                      onClick={() => handleMarkHelpful(review.id)}
                    >
                      <ThumbsUp className="h-4 w-4" />
                      Hữu ích ({review.helpful})
                    </button>
                    <button 
                      className="flex items-center gap-1 hover:text-red-600"
                      onClick={() => handleReport(review.id)}
                    >
                      <Flag className="h-4 w-4" />
                      Báo cáo
                    </button>
                  </div>

                  {/* Seller Response */}
                  {review.hasResponse && review.response && (
                    <div className="bg-gray-50 rounded-lg p-4 mb-4 border-l-4 border-green-500">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                          <span className="text-green-600 text-sm font-bold">S</span>
                        </div>
                        <span className="font-semibold">Phản hồi từ người bán</span>
                      </div>
                      <p className="text-gray-700">{review.response}</p>
                    </div>
                  )}

                  {/* Reply Form */}
                  {replyingTo === review.id ? (
                    <div className="space-y-3">
                      <Textarea
                        placeholder="Nhập phản hồi của bạn..."
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        rows={3}
                      />
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          className="bg-green-600 hover:bg-green-700"
                          onClick={() => handleReply(review.id)}
                        >
                          Gửi phản hồi
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => setReplyingTo(null)}
                        >
                          Hủy
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      {!review.hasResponse && (
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => setReplyingTo(review.id)}
                        >
                          <MessageSquare className="h-4 w-4 mr-2" />
                          Phản hồi
                        </Button>
                      )}
                      
                      {review.status === 'pending' && (
                        <>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="text-green-600 border-green-200 hover:bg-green-50"
                            onClick={() => handleApprove(review.id)}
                          >
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Duyệt
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="text-red-600 border-red-200 hover:bg-red-50"
                            onClick={() => handleReject(review.id)}
                          >
                            <XCircle className="h-4 w-4 mr-2" />
                            Từ chối
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

      {/* Empty State */}
      {filteredReviews.length === 0 && (
        <div className="text-center py-12">
          <Star className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Không tìm thấy đánh giá</h3>
          <p className="text-gray-600">Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm</p>
        </div>
      )}
    </div>
  );
}