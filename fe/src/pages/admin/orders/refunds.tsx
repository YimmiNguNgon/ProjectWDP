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
import { Eye } from "lucide-react";

type RefundRequest = {
  _id: string;
  order: { _id: string; totalAmount?: number } | null;
  buyer: { _id: string; username?: string; email?: string } | null;
  seller: { _id: string; username?: string; email?: string } | null;
  reason: string;
  description: string;
  faultType: "SELLER_FAULT" | "BUYER_FAULT" | "LOGISTICS_FAULT" | "PENDING_REVIEW";
  status:
    | "PENDING"
    | "APPROVED"
    | "REJECTED"
    | "AUTO_APPROVED"
    | "DISPUTED"
    | "ADMIN_APPROVED"
    | "ADMIN_REJECTED"
    | "CANCELLED";
  requestedAt: string;
  sellerNote?: string;
  adminNote?: string;
};

const STATUSES = ["DISPUTED", "PENDING", "REJECTED", "APPROVED", "ALL"];

export default function AdminRefunds() {
  const [refunds, setRefunds] = useState<RefundRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("DISPUTED");

  const [selectedRefund, setSelectedRefund] = useState<RefundRequest | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [resolutionStatus, setResolutionStatus] = useState<
    "ADMIN_APPROVED" | "ADMIN_REJECTED"
  >("ADMIN_APPROVED");
  const [faultType, setFaultType] = useState<
    "SELLER_FAULT" | "BUYER_FAULT" | "LOGISTICS_FAULT"
  >("SELLER_FAULT");
  const [adminNote, setAdminNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchRefunds = async () => {
    try {
      setLoading(true);
      const res = await api.get("/api/refund/admin", {
        params: { status, page: 1, limit: 50 },
      });
      setRefunds(res.data?.data || []);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to load refund disputes");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRefunds();
  }, [status]);

  const openDialog = (refund: RefundRequest) => {
    setSelectedRefund(refund);
    setDialogOpen(true);
    setAdminNote(refund.adminNote || "");
    setResolutionStatus("ADMIN_APPROVED");
    setFaultType("SELLER_FAULT");
  };

  const handleReview = async () => {
    if (!selectedRefund) return;
    if (!adminNote.trim()) {
      toast.error("Please provide an admin note before submitting.");
      return;
    }

    try {
      setSubmitting(true);
      await api.post(`/api/refund/${selectedRefund._id}/admin-review`, {
        resolutionStatus,
        faultType,
        adminNote,
      });
      toast.success("Refund dispute reviewed successfully");
      setDialogOpen(false);
      setSelectedRefund(null);
      fetchRefunds();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to review dispute");
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusVariant = (value: string) => {
    if (["APPROVED", "AUTO_APPROVED", "ADMIN_APPROVED"].includes(value)) {
      return "default";
    }
    if (["REJECTED", "ADMIN_REJECTED"].includes(value)) {
      return "destructive";
    }
    return "secondary";
  };

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Refund Disputes</h1>
        <div>
          <label className="mr-2 text-sm text-muted-foreground">Status</label>
          <select
            className="rounded-md border px-3 py-2 text-sm"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="py-12 text-center text-muted-foreground">Loading...</div>
      ) : refunds.length === 0 ? (
        <Card className="py-12 text-center text-muted-foreground">No refund requests found.</Card>
      ) : (
        <div className="grid gap-4">
          {refunds.map((refund) => (
            <Card key={refund._id} className="p-4">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge variant={getStatusVariant(refund.status) as any}>{refund.status}</Badge>
                    <span className="text-sm font-medium">
                      Order: #{refund.order?._id?.slice(-8)?.toUpperCase() || "N/A"}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(refund.requestedAt).toLocaleString()}
                    </span>
                  </div>
                  <div className="text-sm">
                    Buyer: <b>{refund.buyer?.username || "N/A"}</b> | Seller: <b>{refund.seller?.username || "N/A"}</b>
                  </div>
                  <div className="text-sm text-muted-foreground">Reason: {refund.reason}</div>
                </div>
                <div>
                  <Button variant="outline" size="sm" onClick={() => openDialog(refund)}>
                    <Eye className="mr-2 h-4 w-4" />
                    View / Review
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Refund Request Review</DialogTitle>
          </DialogHeader>

          {selectedRefund && (
            <div className="space-y-4">
              <div className="rounded-md border bg-muted/40 p-4 text-sm">
                <p><b>Order:</b> {selectedRefund.order?._id || "N/A"}</p>
                <p><b>Buyer:</b> {selectedRefund.buyer?.username || "N/A"}</p>
                <p><b>Seller:</b> {selectedRefund.seller?.username || "N/A"}</p>
                <p><b>Reason:</b> {selectedRefund.reason}</p>
                <p className="mt-2"><b>Buyer Description:</b></p>
                <p>{selectedRefund.description || "No details"}</p>
                {selectedRefund.sellerNote ? (
                  <>
                    <p className="mt-2"><b>Seller Note:</b></p>
                    <p>{selectedRefund.sellerNote}</p>
                  </>
                ) : null}
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium">Resolution</label>
                  <select
                    className="w-full rounded-md border px-3 py-2 text-sm"
                    value={resolutionStatus}
                    onChange={(e) =>
                      setResolutionStatus(e.target.value as "ADMIN_APPROVED" | "ADMIN_REJECTED")
                    }
                    disabled={selectedRefund.status !== "DISPUTED"}
                  >
                    <option value="ADMIN_APPROVED">ADMIN_APPROVED</option>
                    <option value="ADMIN_REJECTED">ADMIN_REJECTED</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Fault Type</label>
                  <select
                    className="w-full rounded-md border px-3 py-2 text-sm"
                    value={faultType}
                    onChange={(e) =>
                      setFaultType(
                        e.target.value as "SELLER_FAULT" | "BUYER_FAULT" | "LOGISTICS_FAULT",
                      )
                    }
                    disabled={selectedRefund.status !== "DISPUTED"}
                  >
                    <option value="SELLER_FAULT">SELLER_FAULT</option>
                    <option value="BUYER_FAULT">BUYER_FAULT</option>
                    <option value="LOGISTICS_FAULT">LOGISTICS_FAULT</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">Admin Note</label>
                <Textarea
                  rows={4}
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                  placeholder="Explain your final decision"
                  disabled={selectedRefund.status !== "DISPUTED"}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Close
                </Button>
                {selectedRefund.status === "DISPUTED" ? (
                  <Button onClick={handleReview} disabled={submitting}>
                    {submitting ? "Submitting..." : "Submit Review"}
                  </Button>
                ) : null}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
