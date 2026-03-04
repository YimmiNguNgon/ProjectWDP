import { useEffect, useState } from "react";
import {
  createAdminGlobalVoucher,
  getAdminGlobalVouchers,
  setAdminGlobalVoucherStatus,
  type Voucher,
  type VoucherType,
} from "@/api/vouchers";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

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

export default function AdminGlobalVouchersPage() {
  const [form, setForm] = useState(defaultForm);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [vouchers, setVouchers] = useState<Voucher[]>([]);

  const loadVouchers = async () => {
    try {
      setLoading(true);
      const response = await getAdminGlobalVouchers();
      setVouchers(response.data || []);
    } catch (error) {
      toast.error("Failed to load global vouchers");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVouchers();
  }, []);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!form.code.trim() || !form.endDate || !form.value) {
      toast.error("Code, value and end date are required");
      return;
    }

    try {
      setSubmitting(true);
      await createAdminGlobalVoucher({
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
      toast.success("Global voucher created");
      setForm(defaultForm);
      await loadVouchers();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to create voucher");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (voucher: Voucher) => {
    try {
      await setAdminGlobalVoucherStatus(voucher._id, !voucher.isActive);
      toast.success("Voucher status updated");
      await loadVouchers();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to update voucher");
    }
  };

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Global Voucher Management</h1>
        <p className="text-gray-600 mt-1">Create and manage vouchers that apply to all products.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Create Global Voucher</CardTitle>
          <CardDescription>Create voucher used globally across checkout.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="code">Code</Label>
              <Input
                id="code"
                value={form.code}
                onChange={(e) => setForm((prev) => ({ ...prev, code: e.target.value.toUpperCase() }))}
                placeholder="GLOBAL20"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">Type</Label>
              <select
                id="type"
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                value={form.type}
                onChange={(e) => setForm((prev) => ({ ...prev, type: e.target.value as VoucherType }))}
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
                {submitting ? "Creating..." : "Create Global Voucher"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Global Vouchers</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="text-center py-10 text-gray-500">Loading vouchers...</div>
          ) : vouchers.length === 0 ? (
            <div className="text-center py-10 text-gray-500">No global vouchers yet</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Discount</TableHead>
                  <TableHead>Usage</TableHead>
                  <TableHead>Per User</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vouchers.map((voucher) => (
                  <TableRow key={voucher._id}>
                    <TableCell className="font-medium">{voucher.code}</TableCell>
                    <TableCell>
                      {voucher.type === "percentage" ? `${voucher.value}%` : `$${voucher.value}`}
                    </TableCell>
                    <TableCell>
                      {voucher.usedCount}
                      {voucher.usageLimit ? ` / ${voucher.usageLimit}` : " / unlimited"}
                    </TableCell>
                    <TableCell>{voucher.perUserLimit}</TableCell>
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
                        onClick={() => handleToggleStatus(voucher)}
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
    </div>
  );
}
