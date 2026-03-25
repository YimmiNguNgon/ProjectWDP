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
    { icon: Package, label: "Max 5 products/day" },
    { icon: Clock, label: "Max 10 orders/day" },
    { icon: ShieldAlert, label: "Cannot list high-risk categories" },
];

const UPGRADE_CONDITIONS = [
    { label: "≥ 20 successful orders" },
    { label: "Average rating ≥ 4.5 ⭐" },
    { label: "Return rate < 5%" },
    { label: "Account age > 30 days" },
    { label: "No serious reports" },
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

        api.get("/api/seller-applications/my")
            .then((res) => {
                if (res.data.data) {
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
            toast.error("Please verify your email before registering as a seller");
            return;
        }

        if (form.productDescription.length < 20) {
            toast.error("Product description must be at least 20 characters");
            return;
        }

        setLoading(true);
        try {
            await api.post("/api/seller-applications", form);
            await fetchMe();
            setSuccess(true);
        } catch (err: any) {
            toast.error(err.response?.data?.message || "Registration failed, please try again.");
        } finally {
            setLoading(false);
        }
    };

    if (checkingStatus) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <p className="text-muted-foreground">Checking status...</p>
            </div>
        );
    }

    // ─── Success screen ──────────────────────────────────────────────────────────
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
                        Auto-approved
                    </Badge>
                    <h2 className="text-2xl font-bold text-foreground mb-2">
                        🎉 Congratulations! You are now a Seller
                    </h2>
                    <p className="text-muted-foreground text-sm leading-relaxed">
                        Your account has been successfully upgraded.{" "}
                        <strong>A confirmation email</strong> has been sent to your inbox.
                    </p>
                </div>

                <div className="w-full rounded-xl border border-amber-200 bg-amber-50 p-4 text-left">
                    <div className="flex items-center gap-2 mb-3">
                        <ShieldAlert className="h-4 w-4 text-amber-600" />
                        <span className="text-sm font-semibold text-amber-800">
                            PROBATION Stage – Limits currently applied
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
                            Conditions to upgrade to NORMAL (remove limits)
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
                        The system automatically checks and upgrades daily.
                    </p>
                </div>

                <Button
                    id="go-to-seller-panel-btn"
                    size="lg"
                    className="w-full cursor-pointer"
                    onClick={() => navigate("/seller")}
                >
                    Go to Seller Panel
                </Button>
            </div>
        );
    }

    // ─── Registration form ───────────────────────────────────────────────────────
    return (
        <div className="max-w-2xl mx-auto py-10 px-4">
            {/* Back */}
            <button
                onClick={() => navigate("/become-seller")}
                className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6 cursor-pointer transition-colors"
            >
                <ChevronLeft className="h-4 w-4" />
                Go back
            </button>

            {/* Header */}
            <div className="mb-6">
                <div className="flex items-center gap-2 mb-1">
                    <h1 className="text-2xl font-bold text-foreground">
                        Register to become a Seller
                    </h1>
                    <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">
                        <Zap className="h-3 w-3 mr-1" />
                        Auto-approved
                    </Badge>
                </div>
                <p className="text-muted-foreground text-sm">
                    Fill in the information below. Your account will be upgraded{" "}
                    <strong>instantly</strong> upon submission.
                </p>
            </div>

            {/* Email warning */}
            {user && !user.isEmailVerified && (
                <div className="mb-5 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                    <MailCheck className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-amber-700">
                        Please{" "}
                        <strong>verify your email</strong> before registering as a seller.
                        Check your inbox.
                    </p>
                </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                {/* Shop name */}
                <div className="flex flex-col gap-1.5">
                    <Label htmlFor="shopName">
                        Shop name <span className="text-destructive">*</span>
                    </Label>
                    <Input
                        id="shopName"
                        name="shopName"
                        placeholder="e.g. ABC Fashion Store"
                        value={form.shopName}
                        onChange={handleChange}
                        required
                        disabled={!user?.isEmailVerified}
                    />
                </div>

                {/* Product description */}
                <div className="flex flex-col gap-1.5">
                    <Label htmlFor="productDescription">
                        Shop description <span className="text-destructive">*</span>
                    </Label>
                    <Textarea
                        id="productDescription"
                        name="productDescription"
                        placeholder="Describe your shop and what you sell. e.g. Premium women's fashion, luxury handbags..."
                        value={form.productDescription}
                        onChange={handleChange}
                        required
                        rows={4}
                        disabled={!user?.isEmailVerified}
                    />
                    <p className="text-xs text-muted-foreground">
                        This will be displayed as your shop's public description. Minimum 20 characters. Current: {form.productDescription.length} characters.
                    </p>
                </div>

                <Separator />

                {/* PROBATION info */}
                <div className="rounded-xl border border-border bg-muted/30 p-4">
                    <p className="text-xs font-semibold text-foreground mb-2">
                        ℹ️ After registration, you will be in the <strong>PROBATION</strong> stage:
                    </p>
                    <ul className="text-xs text-muted-foreground space-y-1 pl-4 list-disc">
                        <li>Cannot list high-risk categories</li>
                        <li>Existing products (if any) remain visible as normal</li>
                    </ul>
                    <p className="text-xs text-muted-foreground mt-2">
                        The system automatically upgrades to <strong>NORMAL</strong> when conditions are met.
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
                    {loading ? "Processing..." : "Register as Seller now"}
                </Button>
            </form>
        </div>
    );
}
