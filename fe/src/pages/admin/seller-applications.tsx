import { useEffect, useState } from "react";
import api from "@/lib/axios";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

interface Application {
    _id: string;
    shopName: string;
    phoneNumber: string;
    bankAccountNumber: string;
    bankName: string;
    productDescription: string;
    status: "pending" | "approved" | "rejected";
    adminNote: string;
    createdAt: string;
    user: { _id: string; username: string; email: string };
    reviewedBy?: { username: string };
    reviewedAt?: string;
}

const STATUS_BADGE: Record<
    string,
    "default" | "secondary" | "destructive" | "outline"
> = {
    pending: "secondary",
    approved: "default",
    rejected: "destructive",
};

const STATUS_LABEL: Record<string, string> = {
    pending: "Cho duyet",
    approved: "Da duyet",
    rejected: "Tu choi",
};

const FILTER_TABS = [
    { value: "", label: "Tat ca" },
    { value: "pending", label: "Cho duyet" },
    { value: "approved", label: "Da duyet" },
    { value: "rejected", label: "Tu choi" },
];

export default function AdminSellerApplicationsPage() {
    const [applications, setApplications] = useState<Application[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState("pending");
    const [total, setTotal] = useState(0);
    const [actionLoading, setActionLoading] = useState(false);

    const [selectedApp, setSelectedApp] = useState<Application | null>(null);
    const [actionType, setActionType] = useState<"approve" | "reject" | null>(
        null
    );
    const [adminNote, setAdminNote] = useState("");

    const fetchApplications = async () => {
        setLoading(true);
        try {
            const res = await api.get("/api/admin/seller-applications", {
                params: { status: statusFilter || undefined },
            });
            setApplications(res.data.data);
            setTotal(res.data.total);
        } catch {
            toast.error("Khong the tai danh sach don");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchApplications();
    }, [statusFilter]);

    const openAction = (app: Application, type: "approve" | "reject") => {
        setSelectedApp(app);
        setActionType(type);
        setAdminNote("");
    };

    const closeModal = () => {
        setSelectedApp(null);
        setActionType(null);
        setAdminNote("");
    };

    const handleAction = async () => {
        if (!selectedApp || !actionType) return;
        setActionLoading(true);
        try {
            await api.post(
                `/api/admin/seller-applications/${selectedApp._id}/${actionType}`,
                { adminNote }
            );
            toast.success(
                actionType === "approve" ? "Da duyet don thanh cong" : "Da tu choi don"
            );
            closeModal();
            fetchApplications();
        } catch (err: any) {
            toast.error(err.response?.data?.message || "Co loi xay ra");
        } finally {
            setActionLoading(false);
        }
    };

    return (
        <div className="container mx-auto py-8">
            {/* Header */}
            <div className="mb-6">
                <h1 className="text-3xl font-bold mb-1">Don dang ky Seller</h1>
                <p className="text-muted-foreground text-sm">
                    Xem xet va phe duyet don dang ky tro thanh Seller tu nguoi dung
                </p>
            </div>

            {/* Filter tabs */}
            <div className="flex gap-2 items-center mb-4">
                {FILTER_TABS.map((tab) => (
                    <Button
                        key={tab.value}
                        id={`filter-tab-${tab.value || "all"}`}
                        variant={statusFilter === tab.value ? "default" : "outline"}
                        size="sm"
                        onClick={() => setStatusFilter(tab.value)}
                        className="cursor-pointer"
                    >
                        {tab.label}
                    </Button>
                ))}
                <span className="ml-auto text-sm text-muted-foreground">
                    {total} don
                </span>
            </div>

            {/* Table */}
            <div className="border rounded-lg overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Nguoi dung</TableHead>
                            <TableHead>Ten shop</TableHead>
                            <TableHead>SDT</TableHead>
                            <TableHead>Ngan hang</TableHead>
                            <TableHead>San pham dinh ban</TableHead>
                            <TableHead>Trang thai</TableHead>
                            <TableHead>Ngay gui</TableHead>
                            <TableHead className="text-right">Hanh dong</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={8} className="text-center py-10">
                                    Dang tai...
                                </TableCell>
                            </TableRow>
                        ) : applications.length === 0 ? (
                            <TableRow>
                                <TableCell
                                    colSpan={8}
                                    className="text-center py-10 text-muted-foreground"
                                >
                                    Khong co don nao
                                </TableCell>
                            </TableRow>
                        ) : (
                            applications.map((app) => (
                                <TableRow key={app._id}>
                                    <TableCell>
                                        <div className="font-medium">{app.user?.username}</div>
                                        <div className="text-xs text-muted-foreground">
                                            {app.user?.email}
                                        </div>
                                    </TableCell>
                                    <TableCell className="font-medium">{app.shopName}</TableCell>
                                    <TableCell>{app.phoneNumber}</TableCell>
                                    <TableCell>
                                        <div>{app.bankName}</div>
                                        <div className="text-xs text-muted-foreground">
                                            {app.bankAccountNumber}
                                        </div>
                                    </TableCell>
                                    <TableCell className="max-w-[180px]">
                                        <p className="text-sm line-clamp-2">
                                            {app.productDescription}
                                        </p>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col gap-1">
                                            <Badge variant={STATUS_BADGE[app.status]}>
                                                {STATUS_LABEL[app.status]}
                                            </Badge>
                                            {app.adminNote && (
                                                <span
                                                    className="text-xs text-muted-foreground line-clamp-1 max-w-[120px]"
                                                    title={app.adminNote}
                                                >
                                                    {app.adminNote}
                                                </span>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="text-sm">
                                            {new Date(app.createdAt).toLocaleDateString("vi-VN")}
                                        </div>
                                        {app.reviewedAt && (
                                            <div className="text-xs text-muted-foreground">
                                                {new Date(app.reviewedAt).toLocaleDateString("vi-VN")}
                                            </div>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        {app.status === "pending" ? (
                                            <div className="flex gap-2 justify-end">
                                                <Button
                                                    id={`approve-btn-${app._id}`}
                                                    size="sm"
                                                    onClick={() => openAction(app, "approve")}
                                                    className="cursor-pointer"
                                                >
                                                    Duyet
                                                </Button>
                                                <Button
                                                    id={`reject-btn-${app._id}`}
                                                    size="sm"
                                                    variant="destructive"
                                                    onClick={() => openAction(app, "reject")}
                                                    className="cursor-pointer"
                                                >
                                                    Tu choi
                                                </Button>
                                            </div>
                                        ) : (
                                            <span className="text-xs text-muted-foreground">
                                                {app.reviewedBy?.username
                                                    ? `@${app.reviewedBy.username}`
                                                    : ""}
                                            </span>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Confirm Dialog */}
            <Dialog open={!!selectedApp && !!actionType} onOpenChange={closeModal}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            {actionType === "approve"
                                ? "Phe duyet don dang ky"
                                : "Tu choi don dang ky"}
                        </DialogTitle>
                        <DialogDescription>
                            {actionType === "approve"
                                ? `Ban dang duyet don cua "${selectedApp?.shopName}". Nguoi dung se duoc nang cap len role Seller.`
                                : `Ban dang tu choi don cua "${selectedApp?.shopName}".`}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-2">
                        <Label htmlFor="admin-note-textarea" className="mb-2 block">
                            Ghi chu (se gui qua email cho nguoi dung):
                        </Label>
                        <Textarea
                            id="admin-note-textarea"
                            value={adminNote}
                            onChange={(e) => setAdminNote(e.target.value)}
                            placeholder={
                                actionType === "approve"
                                    ? "Vi du: Chuc mung! Don dang ky da duoc phe duyet."
                                    : "Vi du: Thong tin chua day du, vui long cap nhat va gui lai."
                            }
                            rows={3}
                        />
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={closeModal}
                            className="cursor-pointer"
                        >
                            Huy
                        </Button>
                        <Button
                            id="confirm-action-btn"
                            variant={actionType === "approve" ? "default" : "destructive"}
                            onClick={handleAction}
                            disabled={actionLoading}
                            className="cursor-pointer"
                        >
                            {actionLoading
                                ? "Dang xu ly..."
                                : actionType === "approve"
                                    ? "Xac nhan duyet"
                                    : "Xac nhan tu choi"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
