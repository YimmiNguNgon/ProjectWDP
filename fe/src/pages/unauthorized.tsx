// src/pages/unauthorized.tsx
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { ShieldAlert, Home, ArrowLeft } from 'lucide-react';

export default function UnauthorizedPage() {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-white rounded-lg shadow-xl p-8 text-center">
                <div className="mb-6">
                    <div className="mx-auto w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mb-4">
                        <ShieldAlert className="w-10 h-10 text-red-600" />
                    </div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">
                        Không có quyền truy cập
                    </h1>
                    <p className="text-gray-600">
                        Bạn không có quyền truy cập vào trang này
                    </p>
                </div>

                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                    <p className="text-sm text-red-800">
                        Trang này yêu cầu quyền đặc biệt mà tài khoản của bạn không có.
                        Vui lòng liên hệ quản trị viên nếu bạn cho rằng đây là lỗi.
                    </p>
                </div>

                <div className="space-y-3">
                    <Button
                        onClick={() => navigate(-1)}
                        variant="outline"
                        className="w-full"
                    >
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Quay lại
                    </Button>
                    <Button
                        onClick={() => navigate('/')}
                        className="w-full"
                    >
                        <Home className="w-4 h-4 mr-2" />
                        Về trang chủ
                    </Button>
                </div>

                <div className="mt-6 pt-6 border-t border-gray-200">
                    <p className="text-xs text-gray-500">
                        Mã lỗi: 403 - Forbidden
                    </p>
                </div>
            </div>
        </div>
    );
}
