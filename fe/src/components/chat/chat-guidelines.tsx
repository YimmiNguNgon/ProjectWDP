import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Info, CheckCircle2, XCircle } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';

export function ChatGuidelines() {
    const [isExpanded, setIsExpanded] = useState(false);

    return (
        <div className="px-4 pb-2">
            <Alert variant="default" className="border-blue-200 bg-blue-50">
                <Info className="h-4 w-4 text-blue-600" />
                <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                        <AlertTitle className="text-sm font-semibold text-blue-900">
                            Quy định tin nhắn eBay
                        </AlertTitle>
                        {isExpanded && (
                            <AlertDescription className="mt-2 text-sm text-blue-800">
                                <div className="space-y-3">
                                    {/* Allowed Content */}
                                    <div>
                                        <div className="flex items-center gap-2 font-medium mb-1">
                                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                                            <span>Được phép:</span>
                                        </div>
                                        <ul className="ml-6 space-y-1 text-xs">
                                            <li>✓ Câu hỏi về sản phẩm (kích thước, tình trạng, màu sắc)</li>
                                            <li>✓ Thảo luận về vận chuyển và giao hàng</li>
                                            <li>✓ Hình ảnh sản phẩm và hóa đơn</li>
                                            <li>✓ Liên kết eBay</li>
                                            <li>✓ Yêu cầu hoàn trả và khiếu nại</li>
                                        </ul>
                                    </div>

                                    {/* Prohibited Content */}
                                    <div>
                                        <div className="flex items-center gap-2 font-medium mb-1">
                                            <XCircle className="h-4 w-4 text-red-600" />
                                            <span>Không được phép:</span>
                                        </div>
                                        <ul className="ml-6 space-y-1 text-xs">
                                            <li>✗ Số điện thoại (mọi định dạng)</li>
                                            <li>✗ Liên kết mạng xã hội (Facebook, Zalo, Instagram, v.v.)</li>
                                            <li>✗ Địa chỉ email</li>
                                            <li>✗ Yêu cầu giao dịch bên ngoài eBay</li>
                                            <li>✗ Liên kết thanh toán bên ngoài</li>
                                        </ul>
                                    </div>

                                    <p className="text-xs italic text-blue-700 mt-2">
                                        ⚠️ Vi phạm có thể dẫn đến khóa tài khoản
                                    </p>
                                </div>
                            </AlertDescription>
                        )}
                    </div>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="text-blue-600 hover:text-blue-800 hover:bg-blue-100"
                    >
                        {isExpanded ? 'Thu gọn' : 'Xem thêm'}
                    </Button>
                </div>
            </Alert>
        </div>
    );
}
