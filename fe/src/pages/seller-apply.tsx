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
    "Other",
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
            toast.error("Product description must be at least 20 characters");
            return;
        }
        setLoading(true);
        try {
            await api.post("/api/seller-applications", form);
            setSuccess(true);
        } catch (err: any) {
            toast.error(
                err.response?.data?.message || "Application submission failed, please try again."
            );
        } finally {
            setLoading(false);
        }
    };

    if (checkingStatus) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <p className="text-muted-foreground">Checking application status...</p>
            </div>
        );
    }

    // Existing application status screen
    if (existingApp && !success) {
        const statusConfig = {
            pending: {
                icon: Clock,
                label: "Pending review",
                badgeVariant: "secondary" as const,
                iconClass: "text-amber-500",
            },
            approved: {
                icon: CheckCircle2,
                label: "Approved",
                badgeVariant: "default" as const,
                iconClass: "text-green-600",
            },
            rejected: {
                icon: XCircle,
                label: "Rejected",
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
                        Application status
                    </h2>
                    <p className="text-muted-foreground text-sm">
                        Shop name: <strong>{existingApp.shopName}</strong>
                    </p>
                </div>

                <div className="w-full border border-border rounded-xl p-5 bg-muted/30 flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Status</span>
                        <Badge variant={sc.badgeVariant}>{sc.label}</Badge>
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Submitted date</span>
                        <span className="text-sm font-medium">
                            {new Date(existingApp.createdAt).toLocaleDateString("en-US")}
                        </span>
                    </div>
                    {existingApp.adminNote && (
                        <>
                            <Separator />
                            <div className="text-left">
                                <p className="text-sm text-muted-foreground mb-1">
                                    Admin note:
                                </p>
                                <p className="text-sm text-foreground">{existingApp.adminNote}</p>
                            </div>
                        </>
                    )}
                </div>

                <div className="flex flex-col gap-2 w-full">
                    {existingApp.status === "approved" && (
                        <Button onClick={() => navigate("/seller")} className="w-full cursor-pointer">
                            Go to Seller Panel
                        </Button>
                    )}
                    {existingApp.status === "rejected" && (
                        <Button
                            onClick={() => setExistingApp(null)}
                            className="w-full cursor-pointer"
                        >
                            Submit a new application
                        </Button>
                    )}
                    <Button
                        variant="ghost"
                        onClick={() => navigate("/")}
                        className="w-full cursor-pointer"
                    >
                        Back to Home
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
                        Application submitted successfully!
                    </h2>
                    <p className="text-muted-foreground text-sm leading-relaxed">
                        We will review your application within{" "}
                        <strong>1-3 business days</strong>. The result will be sent via email.
                    </p>
                </div>
                <Button onClick={() => navigate("/")} className="cursor-pointer">
                    Back to Home
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
                Back
            </button>

            {/* Header */}
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-foreground mb-1">
                    Apply to become a seller
                </h1>
                <p className="text-muted-foreground text-sm">
                    Complete the form below. Admin will review and approve your application.
                </p>
            </div>

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
                        placeholder="Example: ABC Fashion Store"
                        value={form.shopName}
                        onChange={handleChange}
                        required
                    />
                </div>

                {/* Phone */}
                <div className="flex flex-col gap-1.5">
                    <Label htmlFor="phoneNumber">
                        Phone number <span className="text-destructive">*</span>
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
                            Bank <span className="text-destructive">*</span>
                        </Label>
                        <Select
                            value={form.bankName}
                            onValueChange={(val) =>
                                setForm((prev) => ({ ...prev, bankName: val }))
                            }
                            required
                        >
                            <SelectTrigger id="bankName">
                                <SelectValue placeholder="Select bank" />
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
                            Bank account number <span className="text-destructive">*</span>
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
                        Product description <span className="text-destructive">*</span>
                    </Label>
                    <Textarea
                        id="productDescription"
                        name="productDescription"
                        placeholder="Describe the products you plan to sell. Example: premium women fashion, branded handbags..."
                        value={form.productDescription}
                        onChange={handleChange}
                        required
                        rows={5}
                    />
                    <p className="text-xs text-muted-foreground">
                        Minimum 20 characters. Current: {form.productDescription.length} characters.
                    </p>
                </div>

                <Separator />

                {/* Note */}
                <p className="text-xs text-muted-foreground bg-muted/50 border border-border rounded-lg px-4 py-3">
                    <strong>Note:</strong> Your bank information will be used for seller payouts.
                    Please make sure all details are accurate. Applications are processed
                    within 1-3 business days.
                </p>

                {/* Submit */}
                <Button
                    type="submit"
                    id="submit-seller-application-btn"
                    size="lg"
                    disabled={loading}
                    className="w-full cursor-pointer"
                >
                    {loading ? "Submitting application..." : "Submit application"}
                </Button>
            </form>
        </div>
    );
}

