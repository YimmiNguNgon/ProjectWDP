import { useEffect, useState } from "react";
import {
  approveVoucherRequest,
  getAdminVoucherRequests,
  rejectVoucherRequest,
  type VoucherRequest,
} from "@/api/vouchers";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const statusBadge = (status: string) => {
  if (status === "approved") return <Badge className="bg-green-600">Approved</Badge>;
  if (status === "rejected") return <Badge variant="destructive">Rejected</Badge>;
  if (status === "cancelled") return <Badge variant="outline">Cancelled</Badge>;
  return <Badge variant="secondary">Pending</Badge>;
};

export default function AdminVoucherRequestsPage() {
  const [requests, setRequests] = useState<VoucherRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("pending");
  const [selected, setSelected] = useState<VoucherRequest | null>(null);
  const [action, setAction] = useState<"approve" | "reject" | null>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const loadRequests = async () => {
    try {
      setLoading(true);
      const response = await getAdminVoucherRequests({ status });
      setRequests(response.data);
    } catch (error) {
      toast.error("Failed to load voucher requests");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, [status]);

  const openDialog = (request: VoucherRequest, type: "approve" | "reject") => {
    setSelected(request);
    setAction(type);
    setAdminNotes("");
    setRejectionReason("");
  };

  const closeDialog = () => {
    setSelected(null);
    setAction(null);
    setAdminNotes("");
    setRejectionReason("");
  };

  const handleApprove = async () => {
    if (!selected) return;
    setSubmitting(true);
    try {
      await approveVoucherRequest(selected._id, adminNotes || undefined);
      toast.success("Voucher request approved");
      closeDialog();
      await loadRequests();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to approve request");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!selected) return;
    if (!rejectionReason.trim()) {
      toast.error("Rejection reason is required");
      return;
    }
    setSubmitting(true);
    try {
      await rejectVoucherRequest(
        selected._id,
        rejectionReason.trim(),
        adminNotes || undefined,
      );
      toast.success("Voucher request rejected");
      closeDialog();
      await loadRequests();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to reject request");
    } finally {
      setSubmitting(false);
    }
  };

  const renderSeller = (seller: VoucherRequest["seller"]) => {
    if (typeof seller === "string") return seller;
    return `${seller.username} (${seller.email})`;
  };

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Voucher Requests</h1>
        <p className="text-gray-600 mt-1">
          Approve or reject seller voucher requests.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Requests</CardTitle>
          <CardDescription>Filter and review voucher requests</CardDescription>
          <div className="pt-2">
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="cancelled">Cancelled</option>
              <option value="all">All</option>
            </select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="text-center py-10 text-gray-500">Loading requests...</div>
          ) : requests.length === 0 ? (
            <div className="text-center py-10 text-gray-500">No requests</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Seller</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map((request) => (
                  <TableRow key={request._id}>
                    <TableCell>{renderSeller(request.seller)}</TableCell>
                    <TableCell className="font-medium">{request.code}</TableCell>
                    <TableCell>{request.type}</TableCell>
                    <TableCell>
                      {request.type === "percentage"
                        ? `${request.value}%`
                        : `$${request.value}`}
                    </TableCell>
                    <TableCell>
                      {new Date(request.startDate).toLocaleDateString()} -{" "}
                      {new Date(request.endDate).toLocaleDateString()}
                    </TableCell>
                    <TableCell>{statusBadge(request.status)}</TableCell>
                    <TableCell className="text-right">
                      {request.status === "pending" ? (
                        <div className="flex justify-end gap-2">
                          <Button size="sm" onClick={() => openDialog(request, "approve")}>
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => openDialog(request, "reject")}
                          >
                            Reject
                          </Button>
                        </div>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!action} onOpenChange={closeDialog}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>
              {action === "approve" ? "Approve Voucher Request" : "Reject Voucher Request"}
            </DialogTitle>
            <DialogDescription>
              {selected ? `${selected.code} - ${selected.type}` : ""}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-gray-500">Value:</span>{" "}
                <strong>
                  {selected?.type === "percentage"
                    ? `${selected?.value}%`
                    : `$${selected?.value}`}
                </strong>
              </div>
              <div>
                <span className="text-gray-500">Min order:</span>{" "}
                <strong>${selected?.minOrderValue || 0}</strong>
              </div>
              <div>
                <span className="text-gray-500">Per-user limit:</span>{" "}
                <strong>{selected?.perUserLimit || 1}</strong>
              </div>
              <div>
                <span className="text-gray-500">Usage limit:</span>{" "}
                <strong>{selected?.usageLimit ?? "unlimited"}</strong>
              </div>
            </div>

            <div>
              <Label htmlFor="admin-notes">Admin notes (optional)</Label>
              <Textarea
                id="admin-notes"
                rows={3}
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
              />
            </div>

            {action === "reject" && (
              <div>
                <Label htmlFor="rejection-reason">Rejection reason *</Label>
                <Textarea
                  id="rejection-reason"
                  rows={3}
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                />
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={closeDialog}>
                Cancel
              </Button>
              {action === "approve" ? (
                <Button onClick={handleApprove} disabled={submitting}>
                  {submitting ? "Approving..." : "Confirm Approval"}
                </Button>
              ) : (
                <Button
                  variant="destructive"
                  onClick={handleReject}
                  disabled={submitting || !rejectionReason.trim()}
                >
                  {submitting ? "Rejecting..." : "Confirm Rejection"}
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
