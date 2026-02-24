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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { ChevronLeft, Clock, CheckCircle2, XCircle } from "lucide-react";

interface ApplicationStatus {
    _id: string;
    status: "pending" | "approved" | "rejected";
    shopName: string;
    adminNote: string;
    createdAt: string;
}

const BANKS = [
    "Vietcombank",
    "VietinBank",
    "BIDV",
    "Agribank",
    "Techcombank",
    "MBBank",
    "ACB",
    "VPBank",
    "TPBank",
    "SHB",
    "OCB",
    "MSB",
    "Sacombank",
    "HDBank",
    "NCB",
    "Khac",
];

export default function SellerApplyPage() {
    const navigate = useNavigate();
    const { user } = useAuth();

    const [form, setForm] = useState({
        shopName: "",
        phoneNumber: "",
        bankAccountNumber: "",
        bankName: "",
        productDescription: "",
    });
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [existingApp, setExistingApp] = useState<ApplicationStatus | null>(
        null
    );
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
        api
            .get("/api/seller-applications/my")
            .then((res) => {
                if (res.data.data) setExistingApp(res.data.data);
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
        if (form.productDescription.length < 20) {
            toast.error("Mo ta san pham can it nhat 20 ky tu");
            return;
        }
        setLoading(true);
        try {
            await api.post("/api/seller-applications", form);
            setSuccess(true);
        } catch (err: any) {
            toast.error(
                err.response?.data?.message || "Gui don that bai, vui long thu lai."
            );
        } finally {
            setLoading(false);
        }
    };

    if (checkingStatus) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <p className="text-muted-foreground">Dang kiem tra trang thai...</p>
            </div>
        );
    }

    // Existing application status screen
    if (existingApp && !success) {
        const statusConfig = {
            pending: {
                icon: Clock,
                label: "Dang cho xet duyet",
                badgeVariant: "secondary" as const,
                iconClass: "text-amber-500",
            },
            approved: {
                icon: CheckCircle2,
                label: "Da duoc duyet",
                badgeVariant: "default" as const,
                iconClass: "text-green-600",
            },
            rejected: {
                icon: XCircle,
                label: "Da bi tu choi",
                badgeVariant: "destructive" as const,
                iconClass: "text-destructive",
            },
        };
        const sc = statusConfig[existingApp.status];
        const Icon = sc.icon;

        return (
            <div className="max-w-md mx-auto mt-16 flex flex-col items-center gap-6 text-center px-4">
                <Icon className={`h-16 w-16 ${sc.iconClass}`} />
                <div>
                    <h2 className="text-2xl font-bold text-foreground mb-2">
                        Trang thai don dang ky
                    </h2>
                    <p className="text-muted-foreground text-sm">
                        Ten shop: <strong>{existingApp.shopName}</strong>
                    </p>
                </div>

                <div className="w-full border border-border rounded-xl p-5 bg-muted/30 flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Trang thai</span>
                        <Badge variant={sc.badgeVariant}>{sc.label}</Badge>
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Ngay gui</span>
                        <span className="text-sm font-medium">
                            {new Date(existingApp.createdAt).toLocaleDateString("vi-VN")}
                        </span>
                    </div>
                    {existingApp.adminNote && (
                        <>
                            <Separator />
                            <div className="text-left">
                                <p className="text-sm text-muted-foreground mb-1">
                                    Ghi chu tu Admin:
                                </p>
                                <p className="text-sm text-foreground">{existingApp.adminNote}</p>
                            </div>
                        </>
                    )}
                </div>

                <div className="flex flex-col gap-2 w-full">
                    {existingApp.status === "approved" && (
                        <Button onClick={() => navigate("/seller")} className="w-full cursor-pointer">
                            Di toi Seller Panel
                        </Button>
                    )}
                    {existingApp.status === "rejected" && (
                        <Button
                            onClick={() => setExistingApp(null)}
                            className="w-full cursor-pointer"
                        >
                            Gui don moi
                        </Button>
                    )}
                    <Button
                        variant="ghost"
                        onClick={() => navigate("/")}
                        className="w-full cursor-pointer"
                    >
                        Ve trang chu
                    </Button>
                </div>
            </div>
        );
    }

    // Success screen
    if (success) {
        return (
            <div className="max-w-md mx-auto mt-16 flex flex-col items-center gap-6 text-center px-4">
                <CheckCircle2 className="h-16 w-16 text-green-600" />
                <div>
                    <h2 className="text-2xl font-bold text-foreground mb-2">
                        Don dang ky da duoc gui!
                    </h2>
                    <p className="text-muted-foreground text-sm leading-relaxed">
                        Chung toi se xem xet don cua ban trong vong{" "}
                        <strong>1-3 ngay lam viec</strong>. Ket qua se duoc thong bao qua email.
                    </p>
                </div>
                <Button onClick={() => navigate("/")} className="cursor-pointer">
                    Ve trang chu
                </Button>
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto py-10 px-4">
            {/* Back */}
            <button
                onClick={() => navigate("/become-seller")}
                className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6 cursor-pointer transition-colors"
            >
                <ChevronLeft className="h-4 w-4" />
                Quay lai
            </button>

            {/* Header */}
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-foreground mb-1">
                    Dang ky tro thanh Seller
                </h1>
                <p className="text-muted-foreground text-sm">
                    Dien day du thong tin ben duoi. Admin se xem xet va phe duyet don cua ban.
                </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                {/* Shop name */}
                <div className="flex flex-col gap-1.5">
                    <Label htmlFor="shopName">
                        Ten shop <span className="text-destructive">*</span>
                    </Label>
                    <Input
                        id="shopName"
                        name="shopName"
                        placeholder="Vi du: Shop Thoi Trang ABC"
                        value={form.shopName}
                        onChange={handleChange}
                        required
                    />
                </div>

                {/* Phone */}
                <div className="flex flex-col gap-1.5">
                    <Label htmlFor="phoneNumber">
                        So dien thoai <span className="text-destructive">*</span>
                    </Label>
                    <Input
                        id="phoneNumber"
                        name="phoneNumber"
                        type="tel"
                        placeholder="0912 345 678"
                        value={form.phoneNumber}
                        onChange={handleChange}
                        required
                    />
                </div>

                {/* Bank */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                        <Label htmlFor="bankName">
                            Ngan hang <span className="text-destructive">*</span>
                        </Label>
                        <Select
                            value={form.bankName}
                            onValueChange={(val) =>
                                setForm((prev) => ({ ...prev, bankName: val }))
                            }
                            required
                        >
                            <SelectTrigger id="bankName">
                                <SelectValue placeholder="Chon ngan hang" />
                            </SelectTrigger>
                            <SelectContent>
                                {BANKS.map((b) => (
                                    <SelectItem key={b} value={b}>
                                        {b}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <Label htmlFor="bankAccountNumber">
                            So tai khoan <span className="text-destructive">*</span>
                        </Label>
                        <Input
                            id="bankAccountNumber"
                            name="bankAccountNumber"
                            placeholder="1234 5678 9012"
                            value={form.bankAccountNumber}
                            onChange={handleChange}
                            required
                        />
                    </div>
                </div>

                {/* Product description */}
                <div className="flex flex-col gap-1.5">
                    <Label htmlFor="productDescription">
                        Mo ta san pham dinh ban <span className="text-destructive">*</span>
                    </Label>
                    <Textarea
                        id="productDescription"
                        name="productDescription"
                        placeholder="Mo ta ngan gon cac loai san pham ban dinh kinh doanh. Vi du: Thoi trang nu cao cap, tui xach hang hieu..."
                        value={form.productDescription}
                        onChange={handleChange}
                        required
                        rows={5}
                    />
                    <p className="text-xs text-muted-foreground">
                        Toi thieu 20 ky tu. Hien tai: {form.productDescription.length} ky tu.
                    </p>
                </div>

                <Separator />

                {/* Note */}
                <p className="text-xs text-muted-foreground bg-muted/50 border border-border rounded-lg px-4 py-3">
                    <strong>Luu y:</strong> Thong tin ngan hang se duoc su dung de thanh
                    toan doanh thu ban hang. Vui long dam bao thong tin chinh xac. Don
                    dang ky se duoc xu ly trong vong 1-3 ngay lam viec.
                </p>

                {/* Submit */}
                <Button
                    type="submit"
                    id="submit-seller-application-btn"
                    size="lg"
                    disabled={loading}
                    className="w-full cursor-pointer"
                >
                    {loading ? "Dang gui don..." : "Gui don dang ky"}
                </Button>
            </form>
        </div>
    );
}
