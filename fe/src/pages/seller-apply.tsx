import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/use-auth";
import api from "@/lib/axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
    ChevronLeft,
    CheckCircle2,
    Zap,
    ShieldAlert,
    TrendingUp,
    Star,
    Package,
    Clock,
    MailCheck,
} from "lucide-react";

const PROBATION_LIMITS = [
    { icon: Package, label: "Tối đa 5 sản phẩm/ngày" },
    { icon: Clock, label: "Tối đa 10 đơn hàng/ngày" },
    { icon: ShieldAlert, label: "Không được đăng danh mục rủi ro cao" },
];

const UPGRADE_CONDITIONS = [
    { label: "≥ 20 đơn hàng thành công" },
    { label: "Rating trung bình ≥ 4.5 ⭐" },
    { label: "Tỷ lệ hoàn trả < 5%" },
    { label: "Tài khoản > 30 ngày" },
    { label: "Không có báo cáo nghiêm trọng" },
];

export default function SellerApplyPage() {
    const navigate = useNavigate();
    const { user, fetchMe } = useAuth();

    const [form, setForm] = useState({
        shopName: "",
        productDescription: "",
    });
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [checkingStatus, setCheckingStatus] = useState(true);

    useEffect(() => {
        if (!user) {
            navigate("/auth/sign-in");
            return;
        }
        if (user.role === "seller") {
            navigate("/seller");
            return;
        }
        if (user.role === "admin") {
            navigate("/");
            return;
        }

        // Kiểm tra đã có đơn chưa
        api.get("/api/seller-applications/my")
            .then((res) => {
                if (res.data.data) {
                    // Đã đăng ký rồi → redirect luôn về seller panel
                    navigate("/seller");
                }
            })
            .catch(() => { })
            .finally(() => setCheckingStatus(false));
    }, [user, navigate]);

    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
    ) => {
        setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!user?.isEmailVerified) {
            toast.error("Vui lòng xác thực email trước khi đăng ký seller");
            return;
        }

        if (form.productDescription.length < 20) {
            toast.error("Mô tả sản phẩm cần ít nhất 20 ký tự");
            return;
        }

        setLoading(true);
        try {
            await api.post("/api/seller-applications", form);
            // Refresh user data để cập nhật role mới
            await fetchMe();
            setSuccess(true);
        } catch (err: any) {
            toast.error(err.response?.data?.message || "Đăng ký thất bại, vui lòng thử lại.");
        } finally {
            setLoading(false);
        }
    };

    if (checkingStatus) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <p className="text-muted-foreground">Đang kiểm tra trạng thái...</p>
            </div>
        );
    }

    // ─── Màn hình thành công ────────────────────────────────────────────────────
    if (success) {
        return (
            <div className="max-w-lg mx-auto mt-12 flex flex-col items-center gap-6 text-center px-4">
                <div className="relative">
                    <div className="h-20 w-20 rounded-full bg-green-100 flex items-center justify-center">
                        <CheckCircle2 className="h-10 w-10 text-green-600" />
                    </div>
                    <div className="absolute -top-1 -right-1 h-6 w-6 rounded-full bg-blue-500 flex items-center justify-center">
                        <Zap className="h-3.5 w-3.5 text-white" />
                    </div>
                </div>

                <div>
                    <Badge className="mb-3 bg-blue-100 text-blue-700 hover:bg-blue-100">
                        Tự động phê duyệt
                    </Badge>
                    <h2 className="text-2xl font-bold text-foreground mb-2">
                        🎉 Chúc mừng! Bạn đã là Seller
                    </h2>
                    <p className="text-muted-foreground text-sm leading-relaxed">
                        Tài khoản của bạn đã được nâng cấp thành công.{" "}
                        <strong>Email xác nhận</strong> đã được gửi tới hòm thư của bạn.
                    </p>
                </div>

                <div className="w-full rounded-xl border border-amber-200 bg-amber-50 p-4 text-left">
                    <div className="flex items-center gap-2 mb-3">
                        <ShieldAlert className="h-4 w-4 text-amber-600" />
                        <span className="text-sm font-semibold text-amber-800">
                            Giai đoạn PROBATION – Giới hạn đang áp dụng
                        </span>
                    </div>
                    <div className="flex flex-col gap-2">
                        {PROBATION_LIMITS.map((item) => {
                            const Icon = item.icon;
                            return (
                                <div key={item.label} className="flex items-center gap-2 text-sm text-amber-700">
                                    <Icon className="h-3.5 w-3.5 flex-shrink-0" />
                                    <span>{item.label}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="w-full rounded-xl border border-green-200 bg-green-50 p-4 text-left">
                    <div className="flex items-center gap-2 mb-3">
                        <TrendingUp className="h-4 w-4 text-green-700" />
                        <span className="text-sm font-semibold text-green-800">
                            Điều kiện nâng cấp lên NORMAL (bỏ giới hạn)
                        </span>
                    </div>
                    <div className="flex flex-col gap-1.5">
                        {UPGRADE_CONDITIONS.map((c) => (
                            <div key={c.label} className="flex items-center gap-2 text-sm text-green-700">
                                <Star className="h-3 w-3 flex-shrink-0" />
                                <span>{c.label}</span>
                            </div>
                        ))}
                    </div>
                    <p className="text-xs text-green-600 mt-3">
                        Hệ thống tự động kiểm tra và nâng cấp hàng ngày.
                    </p>
                </div>

                <Button
                    id="go-to-seller-panel-btn"
                    size="lg"
                    className="w-full cursor-pointer"
                    onClick={() => navigate("/seller")}
                >
                    Đi đến Seller Panel
                </Button>
            </div>
        );
    }

    // ─── Form đăng ký ───────────────────────────────────────────────────────────
    return (
        <div className="max-w-2xl mx-auto py-10 px-4">
            {/* Back */}
            <button
                onClick={() => navigate("/become-seller")}
                className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6 cursor-pointer transition-colors"
            >
                <ChevronLeft className="h-4 w-4" />
                Quay lại
            </button>

            {/* Header */}
            <div className="mb-6">
                <div className="flex items-center gap-2 mb-1">
                    <h1 className="text-2xl font-bold text-foreground">
                        Đăng ký trở thành Seller
                    </h1>
                    <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">
                        <Zap className="h-3 w-3 mr-1" />
                        Tự động duyệt
                    </Badge>
                </div>
                <p className="text-muted-foreground text-sm">
                    Điền thông tin bên dưới. Tài khoản của bạn sẽ được nâng cấp{" "}
                    <strong>ngay lập tức</strong> sau khi gửi.
                </p>
            </div>

            {/* Email warning */}
            {user && !user.isEmailVerified && (
                <div className="mb-5 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                    <MailCheck className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-amber-700">
                        Vui lòng{" "}
                        <strong>xác thực email</strong> trước khi đăng ký seller.
                        Kiểm tra hộp thư của bạn.
                    </p>
                </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                {/* Shop name */}
                <div className="flex flex-col gap-1.5">
                    <Label htmlFor="shopName">
                        Tên shop <span className="text-destructive">*</span>
                    </Label>
                    <Input
                        id="shopName"
                        name="shopName"
                        placeholder="Ví dụ: Shop Thời Trang ABC"
                        value={form.shopName}
                        onChange={handleChange}
                        required
                        disabled={!user?.isEmailVerified}
                    />
                </div>

                {/* Product description */}
                <div className="flex flex-col gap-1.5">
                    <Label htmlFor="productDescription">
                        Mô tả sản phẩm dự định bán <span className="text-destructive">*</span>
                    </Label>
                    <Textarea
                        id="productDescription"
                        name="productDescription"
                        placeholder="Mô tả ngắn gọn các loại sản phẩm bạn định kinh doanh. Ví dụ: Thời trang nữ cao cấp, túi xách hàng hiệu..."
                        value={form.productDescription}
                        onChange={handleChange}
                        required
                        rows={4}
                        disabled={!user?.isEmailVerified}
                    />
                    <p className="text-xs text-muted-foreground">
                        Tối thiểu 20 ký tự. Hiện tại: {form.productDescription.length} ký tự.
                    </p>
                </div>

                <Separator />

                {/* PROBATION info */}
                <div className="rounded-xl border border-border bg-muted/30 p-4">
                    <p className="text-xs font-semibold text-foreground mb-2">
                        ℹ️ Sau khi đăng ký, bạn sẽ ở giai đoạn <strong>PROBATION</strong>:
                    </p>
                    <ul className="text-xs text-muted-foreground space-y-1 pl-4 list-disc">
                        <li>Tối đa 5 sản phẩm/ngày và 10 đơn/ngày</li>
                        <li>Không đăng danh mục rủi ro cao</li>
                        <li>Sản phẩm cũ (nếu có) vẫn hiển thị bình thường</li>
                    </ul>
                    <p className="text-xs text-muted-foreground mt-2">
                        Hệ thống tự động nâng cấp lên <strong>NORMAL</strong> khi đạt đủ điều kiện.
                    </p>
                </div>

                {/* Submit */}
                <Button
                    type="submit"
                    id="submit-seller-application-btn"
                    size="lg"
                    disabled={loading || !user?.isEmailVerified}
                    className="w-full cursor-pointer"
                >
                    {loading ? "Đang xử lý..." : "Đăng ký Seller ngay"}
                </Button>
            </form>
        </div>
    );
}
