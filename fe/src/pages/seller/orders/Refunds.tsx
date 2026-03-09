import { useEffect, useState } from "react";
import api from "@/lib/axios";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Eye, CheckCircle2, AlertTriangle } from "lucide-react";

type RefundRequest = {
    _id: string;
    order: { _id: string; totalAmount: number };
    buyer: { _id: string; username: string };
    reason: string;
    description: string;
    faultType: string;
    status: string;
    requestedAt: string;
    sellerNote?: string;
    adminNote?: string;
};

export default function SellerRefunds() {
    const [refunds, setRefunds] = useState<RefundRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [page] = useState(1);

    // Dialog state
    const [selectedRefund, setSelectedRefund] = useState<RefundRequest | null>(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [sellerNote, setSellerNote] = useState("");
    const [pendingAction, setPendingAction] = useState<"APPROVE" | "REJECT" | null>(null);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        fetchRefunds();
    }, [page]);

    const fetchRefunds = async () => {
        try {
            setLoading(true);
            const res = await api.get(`/api/refund/seller?page=${page}&limit=20`);
            setRefunds(res.data.data || []);
        } catch (err: any) {
            toast.error("Failed to load refund requests");
        } finally {
            setLoading(false);
        }
    };

    const handleAction = async (actionType: "APPROVE" | "REJECT") => {
        if (!selectedRefund) return;
        if (actionType === "REJECT" && !sellerNote.trim()) {
            toast.error("Please provide a reason for rejection.");
            return;
        }

        try {
            setSubmitting(true);
            setPendingAction(actionType);
            const endpoint = actionType === "APPROVE" ? "approve" : "reject";
            await api.post(`/api/refund/${selectedRefund._id}/${endpoint}`, {
                sellerNote,
            });

            toast.success(`Refund ${actionType.toLowerCase()}d successfully`);
            setIsDialogOpen(false);
            fetchRefunds();
        } catch (err: any) {
            toast.error(err.response?.data?.message || `Failed to ${actionType.toLowerCase()} refund`);
        } finally {
            setSubmitting(false);
            setPendingAction(null);
        }
    };

    const getStatusTheme = (status: string) => {
        switch (status) {
            case "PENDING":
                return { badge: "secondary", text: "Pending Review" };
            case "APPROVED":
            case "AUTO_APPROVED":
            case "ADMIN_APPROVED":
                return { badge: "default", text: "Approved" };
            case "REJECTED":
            case "ADMIN_REJECTED":
                return { badge: "destructive", text: "Rejected" };
            case "DISPUTED":
                return { badge: "warning", text: "Under Dispute" };
            default:
                return { badge: "outline", text: status };
        }
    };

    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold mb-6">Refund Requests</h1>

            {loading ? (
                <div className="flex h-40 items-center justify-center">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                </div>
            ) : refunds.length === 0 ? (
                <Card className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                    <CheckCircle2 className="mb-4 h-12 w-12 text-muted-foreground/50" />
                    <h3 className="text-xl font-medium">All clear!</h3>
                    <p>No refund requests to review.</p>
                </Card>
            ) : (
                <div className="grid gap-4">
                    {refunds.map((refund) => {
                        const theme = getStatusTheme(refund.status);
                        return (
                            <Card key={refund._id}>
                                <div className="p-4 flex flex-col md:flex-row justify-between md:items-center gap-4">
                                    <div className="flex-1 space-y-2">
                                        <div className="flex items-center gap-2">
                                            <Badge variant={theme.badge as any} className={theme.badge === 'warning' ? 'bg-amber-500 hover:bg-amber-600' : ''}>
                                                {theme.text}
                                            </Badge>
                                            <span className="text-sm font-medium">
                                                Order ID: {refund.order?._id?.slice(-8)?.toUpperCase() || "N/A"}
                                            </span>
                                            <span className="text-sm text-muted-foreground whitespace-nowrap">
                                                {new Date(refund.requestedAt).toLocaleDateString()}
                                            </span>
                                        </div>
                                        <div className="text-sm">
                                            <span className="font-semibold">{refund.buyer.username}</span> requested a return due to <span className="font-semibold">{refund.reason}</span>
                                        </div>
                                        {refund.status === "PENDING" && (
                                            <div className="flex items-center text-xs text-amber-600 font-medium bg-amber-50 w-fit px-2 py-1 rounded">
                                                <AlertTriangle className="w-3 h-3 justify-center mr-1" />
                                                Please respond within 48h to avoid auto-approval impacting trust score.
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex gap-2 min-w-max">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => {
                                                setSelectedRefund(refund);
                                                setIsDialogOpen(true);
                                                setSellerNote(refund.sellerNote || "");
                                            }}
                                        >
                                            <Eye className="w-4 h-4 mr-2" />
                                            View Details
                                        </Button>
                                    </div>
                                </div>
                            </Card>
                        )
                    })}
                </div>
            )}

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Refund Request Details</DialogTitle>
                    </DialogHeader>
                    {selectedRefund && (
                        <div className="space-y-6">
                            <div className="grid grid-cols-2 gap-4 text-sm bg-muted p-4 rounded-lg">
                                <div>
                                    <p className="text-muted-foreground">Order ID</p>
                                    <p className="font-medium flex items-center gap-2">
                                        {selectedRefund.order._id}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground">Reason</p>
                                    <p className="font-medium">{selectedRefund.reason}</p>
                                </div>
                                <div className="col-span-2 mt-2">
                                    <p className="text-muted-foreground">Buyer's Comment</p>
                                    <p className="p-3 bg-background rounded border mt-1 font-medium">{selectedRefund.description}</p>
                                </div>
                            </div>

                            {selectedRefund.status !== "PENDING" && (
                                <div className="text-sm bg-muted/50 p-4 rounded-lg border">
                                    <p className="text-muted-foreground">Your Response</p>
                                    <p className="font-medium">{selectedRefund.sellerNote || "No message provided."}</p>
                                </div>
                            )}

                            {selectedRefund.adminNote && (
                                <div className="text-sm bg-primary/10 p-4 rounded-lg border border-primary/20">
                                    <p className="font-semibold text-primary pb-1">Admin Verdict</p>
                                    <p>{selectedRefund.adminNote}</p>
                                </div>
                            )}

                            {selectedRefund.status === "PENDING" && (
                                <div className="space-y-4 pt-4 border-t">
                                    <div>
                                        <h4 className="font-medium mb-2">Reply to buyer</h4>
                                        <Textarea
                                            placeholder="Provide instructions for return or a reason for rejection..."
                                            value={sellerNote}
                                            onChange={(e) => setSellerNote(e.target.value)}
                                            rows={3}
                                            className="resize-none"
                                        />
                                    </div>
                                    <div className="flex justify-end gap-3 pt-4">
                                        <Button
                                            variant="destructive"
                                            onClick={() => handleAction("REJECT")}
                                            disabled={submitting}
                                        >
                                            {submitting && pendingAction === "REJECT" ? "Processing..." : "Reject Request"}
                                        </Button>
                                        <Button
                                            className="bg-green-600 hover:bg-green-700"
                                            onClick={() => handleAction("APPROVE")}
                                            disabled={submitting}
                                        >
                                            {submitting && pendingAction === "APPROVE" ? "Processing..." : "Approve Return"}
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Pagination would go here */}
        </div>
    );
}
