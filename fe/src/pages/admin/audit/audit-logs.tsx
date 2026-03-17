import { useEffect, useState } from "react";
import {
  getAuditLogDetail,
  getAuditLogs,
  type AuditLogDetail,
  type AuditLogRow,
  type GetAuditLogsParams,
} from "@/api/admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";

const DEFAULT_FILTERS: GetAuditLogsParams = {
  actorRole: "",
  resourceType: "",
  action: "",
  statusCode: undefined,
  dateFrom: "",
  dateTo: "",
  search: "",
};

const formatTime = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
};

const shortId = (id: string) => (id ? id.slice(-8).toUpperCase() : "");

const RESOURCE_LABELS: Record<string, string> = {
  order: "order",
  user: "user",
  product: "product",
  category: "category",
  ban_appeal: "ban appeal",
  seller_application: "seller application",
  refund_request: "refund request",
  voucher: "voucher",
  voucher_request: "voucher request",
  notification: "notification",
};

const FIELD_LABELS: Record<string, string> = {
  status: "Status",
  totalAmount: "Total Amount",
  subtotalAmount: "Subtotal",
  shippingPrice: "Shipping Fee",
  paymentStatus: "Payment Status",
  shipper: "Shipper",
  seller: "Seller",
  buyer: "Buyer",
  note: "Note",
  trackingNumber: "Tracking Number",
  paymentMethod: "Payment Method",
  title: "Title",
  price: "Price",
  stock: "Stock",
  isActive: "Active",
  role: "Role",
  username: "Username",
  email: "Email",
  name: "Name",
};

function describeLog(row: AuditLogRow): string {
  const res = RESOURCE_LABELS[row.resourceType] ?? row.resourceType;
  const id = row.resourceId ? ` #${shortId(row.resourceId)}` : "";
  switch (row.action) {
    case "ban":           return `Banned ${res}${id}`;
    case "unban":         return `Unbanned ${res}${id}`;
    case "approve":       return `Approved ${res}${id}`;
    case "reject":        return `Rejected ${res}${id}`;
    case "review":        return `Reviewed ${res}${id}`;
    case "status_change": return `Changed status of ${res}${id}`;
    case "create":        return `Created ${res}${id}`;
    case "delete":        return `Deleted ${res}${id}`;
    case "update":        return `Updated ${res}${id}`;
    default:              return `${row.action} on ${res}${id}`;
  }
}

function formatFieldValue(field: string, value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (field === "totalAmount" || field === "subtotalAmount" || field === "shippingPrice" || field === "price") {
    return `$${Number(value).toFixed(2)}`;
  }
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

// Lấy thông tin có thể đọc được từ snapshot order
function OrderSnapshot({ data, title }: { data: unknown; title: string }) {
  if (!data || typeof data !== "object") return null;
  const o = data as Record<string, unknown>;

  const items = Array.isArray(o.items) ? o.items : [];

  return (
    <div className="rounded-md border p-3 space-y-3">
      <div className="font-semibold text-sm">{title}</div>

      {/* Basic fields */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
        {o.status !== undefined && (
          <>
            <span className="text-muted-foreground">Status</span>
            <span className="font-medium">{String(o.status)}</span>
          </>
        )}
        {o.totalAmount !== undefined && (
          <>
            <span className="text-muted-foreground">Total Amount</span>
            <span className="font-medium">${Number(o.totalAmount).toFixed(2)}</span>
          </>
        )}
        {o.shippingPrice !== undefined && (
          <>
            <span className="text-muted-foreground">Shipping Fee</span>
            <span className="font-medium">${Number(o.shippingPrice).toFixed(2)}</span>
          </>
        )}
        {o.paymentStatus !== undefined && (
          <>
            <span className="text-muted-foreground">Payment</span>
            <span className="font-medium">{String(o.paymentStatus)}</span>
          </>
        )}
        {o.paymentMethod !== undefined && (
          <>
            <span className="text-muted-foreground">Payment Method</span>
            <span className="font-medium">{String(o.paymentMethod)}</span>
          </>
        )}
        {o.note && (
          <>
            <span className="text-muted-foreground">Note</span>
            <span>{String(o.note)}</span>
          </>
        )}
        {o.trackingNumber && (
          <>
            <span className="text-muted-foreground">Tracking</span>
            <span>{String(o.trackingNumber)}</span>
          </>
        )}
      </div>

      {/* Items */}
      {items.length > 0 && (
        <div>
          <div className="text-xs font-semibold text-muted-foreground mb-1">Items ({items.length})</div>
          <div className="space-y-1">
            {(items as Record<string, unknown>[]).map((item, idx) => (
              <div key={idx} className="flex justify-between text-sm border rounded px-2 py-1">
                <span>{String(item.title ?? item.productId ?? "Product")}</span>
                <span className="text-muted-foreground">
                  ×{item.quantity ?? 1} · ${Number(item.unitPrice ?? 0).toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Shipping address */}
      {o.shippingAddress && typeof o.shippingAddress === "object" && (
        <div>
          <div className="text-xs font-semibold text-muted-foreground mb-1">Shipping Address</div>
          {(() => {
            const addr = o.shippingAddress as Record<string, unknown>;
            const parts = [addr.fullName, addr.phone, addr.street, addr.ward, addr.district, addr.city, addr.country]
              .filter(Boolean).map(String);
            return <div className="text-sm">{parts.join(", ")}</div>;
          })()}
        </div>
      )}
    </div>
  );
}

export default function AdminAuditLogsPage() {
  const [rows, setRows] = useState<AuditLogRow[]>([]);
  const [filters, setFilters] = useState<GetAuditLogsParams>(DEFAULT_FILTERS);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedLog, setSelectedLog] = useState<AuditLogDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const fetchLogs = async (nextPage = page, nextFilters = filters) => {
    try {
      setLoading(true);
      const res = await getAuditLogs({ page: nextPage, limit: 20, ...nextFilters });
      setRows(res.data || []);
      setPage(res.pagination?.page || 1);
      setTotalPages(res.pagination?.totalPages || 1);
      setTotal(res.pagination?.total || 0);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to load audit logs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs(1, DEFAULT_FILTERS);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onApplyFilters = () => fetchLogs(1, filters);
  const onResetFilters = () => { setFilters(DEFAULT_FILTERS); fetchLogs(1, DEFAULT_FILTERS); };

  const onOpenDetail = async (logId: string) => {
    setDetailOpen(true);
    setDetailLoading(true);
    setSelectedLog(null);
    try {
      const res = await getAuditLogDetail(logId);
      setSelectedLog(res.data);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to load audit log detail");
    } finally {
      setDetailLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-8 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Audit Logs</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Track critical write actions from admin and seller accounts.
          </p>
        </div>
        <Button variant="outline" onClick={() => fetchLogs(page, filters)}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <Input
              placeholder="Actor role"
              value={filters.actorRole || ""}
              onChange={(e) => setFilters((prev) => ({ ...prev, actorRole: e.target.value }))}
            />
            <Input
              placeholder="Resource type"
              value={filters.resourceType || ""}
              onChange={(e) => setFilters((prev) => ({ ...prev, resourceType: e.target.value }))}
            />
            <Input
              placeholder="Action"
              value={filters.action || ""}
              onChange={(e) => setFilters((prev) => ({ ...prev, action: e.target.value }))}
            />
            <Input
              placeholder="Status code"
              value={filters.statusCode || ""}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, statusCode: e.target.value ? Number(e.target.value) : undefined }))
              }
            />
            <Input
              type="date"
              value={filters.dateFrom || ""}
              onChange={(e) => setFilters((prev) => ({ ...prev, dateFrom: e.target.value }))}
            />
            <Input
              type="date"
              value={filters.dateTo || ""}
              onChange={(e) => setFilters((prev) => ({ ...prev, dateTo: e.target.value }))}
            />
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="Search actor/resource..."
              value={filters.search || ""}
              onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
              onKeyDown={(e) => { if (e.key === "Enter") onApplyFilters(); }}
            />
            <Button onClick={onApplyFilters}>Apply</Button>
            <Button variant="outline" onClick={onResetFilters}>Reset</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Log Entries ({total})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading audit logs...</p>
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No audit logs found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="py-2 pr-3 whitespace-nowrap">Time</th>
                    <th className="py-2 pr-3">Actor</th>
                    <th className="py-2 pr-3">Role</th>
                    <th className="py-2 pr-3">Description</th>
                    <th className="py-2 pr-3">Detail</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row._id} className="border-b align-top hover:bg-muted/30">
                      <td className="py-2 pr-3 whitespace-nowrap text-xs text-muted-foreground">
                        {formatTime(row.createdAt)}
                      </td>
                      <td className="py-2 pr-3 font-medium">
                        {row.actorUsername || "N/A"}
                      </td>
                      <td className="py-2 pr-3">
                        <Badge variant="outline" className="text-xs">{row.actorRole}</Badge>
                      </td>
                      <td className="py-2 pr-3">
                        <div className="flex items-center gap-2">
                          <span className={`inline-block w-2 h-2 rounded-full flex-shrink-0 ${row.success ? "bg-emerald-500" : "bg-red-500"}`} />
                          <span>{describeLog(row)}</span>
                        </div>
                        {row.resourceId && (
                          <div className="text-xs text-muted-foreground mt-0.5 pl-4">
                            ID: {row.resourceId}
                          </div>
                        )}
                      </td>
                      <td className="py-2 pr-3">
                        <Button variant="outline" size="sm" onClick={() => onOpenDetail(row._id)}>
                          View
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="mt-4 flex items-center justify-between">
            <div className="text-xs text-muted-foreground">Page {page} / {totalPages}</div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => fetchLogs(page - 1, filters)}>
                Previous
              </Button>
              <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => fetchLogs(page + 1, filters)}>
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Audit Log Detail</DialogTitle>
          </DialogHeader>

          {detailLoading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : !selectedLog ? (
            <p className="text-sm text-muted-foreground">No detail data</p>
          ) : (
            <div className="space-y-4 text-sm">
              {/* Summary */}
              <div className="rounded-md border p-3 grid grid-cols-2 gap-x-6 gap-y-2">
                <div>
                  <div className="text-xs text-muted-foreground">Actor</div>
                  <div className="font-medium">{selectedLog.actorUsername || "—"}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Role</div>
                  <Badge variant="outline">{selectedLog.actorRole}</Badge>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Action</div>
                  <div className="font-medium">{describeLog(selectedLog)}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Result</div>
                  <span className={`inline-flex items-center gap-1 font-medium ${selectedLog.success ? "text-emerald-600" : "text-red-600"}`}>
                    <span className={`w-2 h-2 rounded-full ${selectedLog.success ? "bg-emerald-500" : "bg-red-500"}`} />
                    {selectedLog.success ? "Success" : "Failed"}
                  </span>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Time</div>
                  <div>{formatTime(selectedLog.createdAt)}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Resource ID</div>
                  <div className="font-mono text-xs break-all">{selectedLog.resourceId || "—"}</div>
                </div>
              </div>

              {/* Error */}
              {selectedLog.errorMessage && (
                <div className="rounded-md border border-red-200 bg-red-50 p-3 text-red-700">
                  <div className="font-semibold text-xs mb-1">Error</div>
                  <div>{selectedLog.errorMessage}</div>
                </div>
              )}

              {/* Order detail: before → after */}
              {selectedLog.resourceType === "order" && (
                <div className="space-y-3">
                  {selectedLog.before && <OrderSnapshot data={selectedLog.before} title="Before" />}
                  {selectedLog.after && <OrderSnapshot data={selectedLog.after} title="After" />}
                </div>
              )}

              {/* Non-order resources: show after snapshot in readable form */}
              {selectedLog.resourceType !== "order" && selectedLog.after && typeof selectedLog.after === "object" && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Current State</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                      {Object.entries(selectedLog.after as Record<string, unknown>)
                        .filter(([k]) => !["__v", "createdAt", "updatedAt", "_id", "passwordHash", "statusHistory"].includes(k))
                        .map(([k, v]) => (
                          <div key={k} className="contents">
                            <span className="text-muted-foreground">{FIELD_LABELS[k] ?? k}</span>
                            <span className="font-medium truncate">{formatFieldValue(k, v)}</span>
                          </div>
                        ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border p-2">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-medium break-all">{value || "-"}</div>
    </div>
  );
}
