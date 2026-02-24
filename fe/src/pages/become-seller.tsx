import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
    TrendingUp,
    ShieldCheck,
    BarChart2,
    Users,
    CreditCard,
    Tag,
    CheckCircle,
} from "lucide-react";

const BENEFITS = [
    {
        icon: TrendingUp,
        title: "Thu nhap khong gioi han",
        desc: "Ban hang cho hang trieu khach hang tren nen tang. Khong co muc tran doanh thu.",
    },
    {
        icon: ShieldCheck,
        title: "Bao ve nguoi ban",
        desc: "Chinh sach bao ve nguoi ban toan dien giup ban yen tam kinh doanh ma khong lo rui ro.",
    },
    {
        icon: BarChart2,
        title: "Dashboard phan tich",
        desc: "Cong cu phan tich thong minh giup ban theo doi doanh thu, don hang va xu huong mua sam.",
    },
    {
        icon: Users,
        title: "Tiep can hang trieu khach",
        desc: "San pham cua ban hien thi toi hang trieu nguoi mua dang tim kiem moi ngay.",
    },
    {
        icon: CreditCard,
        title: "Thanh toan nhanh chong",
        desc: "Nhan tien ve tai khoan nhanh chong, minh bach voi lich su giao dich chi tiet.",
    },
    {
        icon: Tag,
        title: "Cong cu Marketing",
        desc: "Tao chuong trinh khuyen mai, Deal cua ngay, va Outlet de tang doanh so ban hang.",
    },
];

const STEPS = [
    {
        step: "01",
        title: "Dang ky tai khoan",
        desc: "Dien thong tin shop va tai khoan ngan hang cua ban.",
    },
    {
        step: "02",
        title: "Cho xet duyet",
        desc: "Admin xem xet va phe duyet don dang ky trong vong 1-3 ngay lam viec.",
    },
    {
        step: "03",
        title: "Bat dau ban hang",
        desc: "Tai khoan duoc nang cap, dang san pham dau tien ngay!",
    },
];

const STATS = [
    { value: "10M+", label: "Khach hang hoat dong" },
    { value: "500K+", label: "Nguoi ban thanh cong" },
    { value: "98%", label: "Ti le hai long" },
    { value: "24/7", label: "Ho tro nguoi ban" },
];

export default function BecomeSellerPage() {
    const navigate = useNavigate();
    const { user } = useAuth();

    const handleBecomeSeller = () => {
        if (!user) {
            navigate("/auth/sign-in");
            return;
        }
        if (user.role === "seller") {
            navigate("/seller");
            return;
        }
        navigate("/become-seller/apply");
    };

    const ctaLabel =
        user?.role === "seller" ? "Di toi Seller Panel" : "Tro thanh Seller ngay";

    return (
        <div className="flex flex-col gap-0 -mx-4 md:-mx-8">
            {/* Hero */}
            <section className="bg-primary text-primary-foreground py-20 px-6 text-center">
                <div className="max-w-2xl mx-auto flex flex-col items-center gap-6">
                    <Badge variant="secondary" className="text-sm px-4 py-1 rounded-full">
                        Cong dong nguoi ban hon 500.000 thanh vien
                    </Badge>
                    <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight leading-tight">
                        Bien dam me thanh thu nhap thuc su
                    </h1>
                    <p className="text-primary-foreground/80 text-lg max-w-xl leading-relaxed">
                        Hang tram nghin nguoi ban dang kiem them thu nhap moi ngay. Bat dau
                        hanh trinh kinh doanh cua ban ngay hom nay.
                    </p>
                    <Button
                        id="hero-become-seller-btn"
                        size="lg"
                        variant="secondary"
                        className="font-bold text-base px-8 cursor-pointer"
                        onClick={handleBecomeSeller}
                    >
                        {ctaLabel}
                    </Button>
                    {!user && (
                        <p className="text-primary-foreground/60 text-sm -mt-2">
                            Can dang nhap de dang ky
                        </p>
                    )}
                </div>
            </section>

            {/* Stats */}
            <section className="bg-muted py-10 px-6 border-y border-border">
                <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
                    {STATS.map((s) => (
                        <div key={s.label}>
                            <div className="text-3xl font-extrabold text-foreground">
                                {s.value}
                            </div>
                            <div className="text-sm text-muted-foreground mt-1">{s.label}</div>
                        </div>
                    ))}
                </div>
            </section>

            {/* Benefits */}
            <section className="py-16 px-6 bg-muted/40">
                <div className="max-w-5xl mx-auto">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl font-bold text-foreground mb-3">
                            Tai sao chon ban hang cung chung toi?
                        </h2>
                        <p className="text-muted-foreground text-base">
                            Chung toi cung cap moi cong cu ban can de kinh doanh thanh cong
                        </p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {BENEFITS.map((b) => {
                            const Icon = b.icon;
                            return (
                                <div
                                    key={b.title}
                                    className="bg-background rounded-xl p-6 border border-border shadow-sm hover:shadow-md transition-shadow"
                                >
                                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                                        <Icon className="h-5 w-5 text-primary" />
                                    </div>
                                    <h3 className="font-semibold text-foreground mb-2">
                                        {b.title}
                                    </h3>
                                    <p className="text-sm text-muted-foreground leading-relaxed">
                                        {b.desc}
                                    </p>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* How it works */}
            <section className="py-16 px-6 bg-background">
                <div className="max-w-2xl mx-auto">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl font-bold text-foreground mb-3">
                            Bat dau chi trong 3 buoc
                        </h2>
                        <p className="text-muted-foreground text-base">
                            Quy trinh don gian, nhanh chong
                        </p>
                    </div>
                    <div className="flex flex-col gap-0">
                        {STEPS.map((s, idx) => (
                            <div key={s.step}>
                                <div className="flex items-start gap-5 py-6">
                                    <div className="h-12 w-12 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm flex-shrink-0">
                                        {s.step}
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-foreground text-lg mb-1">
                                            {s.title}
                                        </h3>
                                        <p className="text-muted-foreground text-sm leading-relaxed">
                                            {s.desc}
                                        </p>
                                    </div>
                                </div>
                                {idx < STEPS.length - 1 && <Separator />}
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* What you get checklist */}
            <section className="py-16 px-6 bg-muted/40">
                <div className="max-w-2xl mx-auto text-center">
                    <h2 className="text-3xl font-bold text-foreground mb-8">
                        Ban se nhan duoc gi?
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left mb-10">
                        {[
                            "Seller Dashboard day du tinh nang",
                            "Quan ly don hang & van chuyen",
                            "Cong cu tao chuong trinh khuyen mai",
                            "Bao cao doanh thu chi tiet",
                            "Ho tro truc tiep tu doi ngu",
                            "Bao ve nguoi ban toan han",
                        ].map((item) => (
                            <div
                                key={item}
                                className="flex items-center gap-3 bg-background rounded-lg px-4 py-3 border border-border"
                            >
                                <CheckCircle className="h-4 w-4 text-primary flex-shrink-0" />
                                <span className="text-sm text-foreground">{item}</span>
                            </div>
                        ))}
                    </div>
                    <Button
                        id="cta-become-seller-btn"
                        size="lg"
                        className="font-bold text-base px-10 cursor-pointer"
                        onClick={handleBecomeSeller}
                    >
                        {ctaLabel}
                    </Button>
                    {!user && (
                        <p className="text-muted-foreground text-sm mt-3">
                            Can dang nhap de dang ky
                        </p>
                    )}
                </div>
            </section>
        </div>
    );
}
