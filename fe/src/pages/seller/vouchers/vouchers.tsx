import { useEffect, useMemo, useState } from "react";
import {
  cancelVoucherRequest,
  getMyVoucherRequests,
  getMyVouchers,
  requestVoucher,
  setMyVoucherStatus,
  type Voucher,
  type VoucherRequest,
  type VoucherType,
} from "@/api/vouchers";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const defaultForm = {
  code: "",
  type: "percentage" as VoucherType,
  value: "",
  minOrderValue: "0",
  maxDiscountAmount: "",
  usageLimit: "",
  perUserLimit: "1",
  startDate: "",
  endDate: "",
};

const statusBadge = (status: string) => {
  if (status === "approved") return <Badge className="bg-green-600">Approved</Badge>;
  if (status === "rejected") return <Badge variant="destructive">Rejected</Badge>;
  if (status === "cancelled") return <Badge variant="outline">Cancelled</Badge>;
  return <Badge variant="secondary">Pending</Badge>;
};

export default function SellerVouchersPage() {
  const [form, setForm] = useState(defaultForm);
  const [submitting, setSubmitting] = useState(false);
  const [requests, setRequests] = useState<VoucherRequest[]>([]);
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [loadingVouchers, setLoadingVouchers] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");

  const loadRequests = async () => {
    try {
      setLoadingRequests(true);
      const params = statusFilter !== "all" ? { status: statusFilter } : undefined;
      const response = await getMyVoucherRequests(params);
      setRequests(response.data);
    } catch (error) {
      toast.error("Failed to load voucher requests");
    } finally {
      setLoadingRequests(false);
    }
  };

  const loadVouchers = async () => {
    try {
      setLoadingVouchers(true);
      const response = await getMyVouchers();
      setVouchers(response.data);
    } catch (error) {
      toast.error("Failed to load vouchers");
    } finally {
      setLoadingVouchers(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, [statusFilter]);

  useEffect(() => {
    loadVouchers();
  }, []);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!form.code.trim() || !form.endDate) {
      toast.error("Code and end date are required");
      return;
    }

    setSubmitting(true);
    try {
      await requestVoucher({
        code: form.code.trim().toUpperCase(),
        type: form.type,
        value: Number(form.value),
        minOrderValue: Number(form.minOrderValue) || 0,
        maxDiscountAmount: form.maxDiscountAmount ? Number(form.maxDiscountAmount) : null,
        usageLimit: form.usageLimit ? Number(form.usageLimit) : null,
        perUserLimit: Number(form.perUserLimit) || 1,
        startDate: form.startDate || undefined,
        endDate: form.endDate,
      });
      toast.success("Voucher request submitted");
      setForm(defaultForm);
      await loadRequests();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to submit request");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelRequest = async (requestId: string) => {
    if (!window.confirm("Cancel this voucher request?")) return;
    try {
      await cancelVoucherRequest(requestId);
      toast.success("Voucher request cancelled");
      await loadRequests();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to cancel request");
    }
  };

  const handleToggleVoucher = async (voucher: Voucher) => {
    try {
      await setMyVoucherStatus(voucher._id, !voucher.isActive);
      toast.success("Voucher status updated");
      await loadVouchers();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to update voucher");
    }
  };

  const approvedCount = useMemo(
    () => requests.filter((request) => request.status === "approved").length,
    [requests],
  );

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Voucher Management</h1>
        <p className="text-gray-600 mt-1">
          Create voucher requests, wait for admin approval, then manage your active vouchers.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Create Voucher Request</CardTitle>
          <CardDescription>
            Seller can only activate vouchers after admin approval.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="code">Code</Label>
              <Input
                id="code"
                value={form.code}
                placeholder="WELCOME10"
                onChange={(e) => setForm((prev) => ({ ...prev, code: e.target.value.toUpperCase() }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="type">Type</Label>
              <select
                id="type"
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                value={form.type}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, type: e.target.value as VoucherType }))
                }
              >
                <option value="percentage">Percentage</option>
                <option value="fixed">Fixed amount</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="value">Value</Label>
              <Input
                id="value"
                type="number"
                min={1}
                value={form.value}
                onChange={(e) => setForm((prev) => ({ ...prev, value: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="minOrderValue">Minimum order value</Label>
              <Input
                id="minOrderValue"
                type="number"
                min={0}
                value={form.minOrderValue}
                onChange={(e) => setForm((prev) => ({ ...prev, minOrderValue: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="maxDiscountAmount">Max discount amount (optional)</Label>
              <Input
                id="maxDiscountAmount"
                type="number"
                min={0}
                value={form.maxDiscountAmount}
                onChange={(e) => setForm((prev) => ({ ...prev, maxDiscountAmount: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="usageLimit">Total usage limit (optional)</Label>
              <Input
                id="usageLimit"
                type="number"
                min={1}
                value={form.usageLimit}
                onChange={(e) => setForm((prev) => ({ ...prev, usageLimit: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="perUserLimit">Per-user limit</Label>
              <Input
                id="perUserLimit"
                type="number"
                min={1}
                value={form.perUserLimit}
                onChange={(e) => setForm((prev) => ({ ...prev, perUserLimit: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="startDate">Start date (optional)</Label>
              <Input
                id="startDate"
                type="datetime-local"
                value={form.startDate}
                onChange={(e) => setForm((prev) => ({ ...prev, startDate: e.target.value }))}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="endDate">End date</Label>
              <Input
                id="endDate"
                type="datetime-local"
                value={form.endDate}
                onChange={(e) => setForm((prev) => ({ ...prev, endDate: e.target.value }))}
                required
              />
            </div>
            <div className="md:col-span-2">
              <Button type="submit" disabled={submitting}>
                {submitting ? "Submitting..." : "Submit Voucher Request"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Tabs defaultValue="requests" className="space-y-4">
        <TabsList>
          <TabsTrigger value="requests">Requests ({requests.length})</TabsTrigger>
          <TabsTrigger value="vouchers">My Vouchers ({vouchers.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="requests">
          <Card>
            <CardHeader>
              <CardTitle>Voucher Requests</CardTitle>
              <CardDescription>
                Approved requests: {approvedCount}
              </CardDescription>
              <div className="pt-2">
                <select
                  className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="all">All</option>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {loadingRequests ? (
                <div className="text-center py-10 text-gray-500">Loading requests...</div>
              ) : requests.length === 0 ? (
                <div className="text-center py-10 text-gray-500">No voucher requests</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Code</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Value</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Admin Notes</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {requests.map((request) => (
                      <TableRow key={request._id}>
                        <TableCell className="font-medium">{request.code}</TableCell>
                        <TableCell>{request.type}</TableCell>
                        <TableCell>
                          {request.type === "percentage" ? `${request.value}%` : `$${request.value}`}
                        </TableCell>
                        <TableCell>{statusBadge(request.status)}</TableCell>
                        <TableCell className="max-w-[280px] truncate">
                          {request.rejectionReason || request.adminNotes || "-"}
                        </TableCell>
                        <TableCell>{new Date(request.createdAt).toLocaleDateString()}</TableCell>
                        <TableCell className="text-right">
                          {request.status === "pending" ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleCancelRequest(request._id)}
                            >
                              Cancel
                            </Button>
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
        </TabsContent>

        <TabsContent value="vouchers">
          <Card>
            <CardHeader>
              <CardTitle>Approved Vouchers</CardTitle>
              <CardDescription>
                Enable or disable vouchers that are already approved by admin.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {loadingVouchers ? (
                <div className="text-center py-10 text-gray-500">Loading vouchers...</div>
              ) : vouchers.length === 0 ? (
                <div className="text-center py-10 text-gray-500">No vouchers yet</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Code</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Usage</TableHead>
                      <TableHead>Period</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {vouchers.map((voucher) => (
                      <TableRow key={voucher._id}>
                        <TableCell className="font-medium">{voucher.code}</TableCell>
                        <TableCell>
                          {voucher.type === "percentage"
                            ? `${voucher.value}%`
                            : `$${voucher.value}`}
                        </TableCell>
                        <TableCell>
                          {voucher.usedCount}
                          {voucher.usageLimit ? ` / ${voucher.usageLimit}` : " / unlimited"}
                        </TableCell>
                        <TableCell>
                          {new Date(voucher.startDate).toLocaleDateString()} -{" "}
                          {new Date(voucher.endDate).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          {voucher.isActive ? (
                            <Badge className="bg-green-600">Active</Badge>
                          ) : (
                            <Badge variant="outline">Inactive</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant={voucher.isActive ? "outline" : "default"}
                            onClick={() => handleToggleVoucher(voucher)}
                          >
                            {voucher.isActive ? "Disable" : "Enable"}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
