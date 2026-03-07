import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { Send, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  adminGetDisputes,
  adminNotifyBuyer,
  type AdminDisputeItem,
} from "@/api/deliveryDispute";

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  PENDING_SHIPPER: { label: "Pending Shipper", className: "bg-orange-100 text-orange-700" },
  SHIPPER_RESPONDED: { label: "Shipper Responded", className: "bg-blue-100 text-blue-700" },
  REPORTED_TO_ADMIN: { label: "Reported to Admin", className: "bg-red-100 text-red-700" },
  CONFIRMED: { label: "Confirmed", className: "bg-green-100 text-green-700" },
};

export default function AdminDeliveryReports() {
  const [disputes, setDisputes] = useState<AdminDisputeItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  // Per-dispute expand + notify state
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [notifyNote, setNotifyNote] = useState<Record<string, string>>({});
  const [notifyLoading, setNotifyLoading] = useState<string | null>(null);

  const fetchDisputes = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, any> = { page };
      if (statusFilter !== "all") params.status = statusFilter;
      const res = await adminGetDisputes(params);
      setDisputes(res.data.disputes);
      setTotal(res.data.total);
      setPages(res.data.pages);
    } catch {
      toast.error("Failed to load reports");
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => {
    fetchDisputes();
  }, [fetchDisputes]);

  const handleNotify = async (dispute: AdminDisputeItem) => {
    const note = notifyNote[dispute._id]?.trim();
    if (!note) {
      toast.error("Please enter a message for the buyer");
      return;
    }
    setNotifyLoading(dispute._id);
    try {
      await adminNotifyBuyer(dispute._id, note);
      toast.success("Notification sent to buyer");
      setDisputes((prev) =>
        prev.map((d) =>
          d._id === dispute._id
            ? { ...d, adminNote: note, adminNotifiedAt: new Date().toISOString() }
            : d,
        ),
      );
      setNotifyNote((prev) => ({ ...prev, [dispute._id]: "" }));
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to send notification");
    } finally {
      setNotifyLoading(null);
    }
  };

  const toggleExpand = (id: string) =>
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Delivery Reports</h1>
          <p className="text-sm text-gray-500 mt-1">{total} total reports</p>
        </div>
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
          <SelectTrigger className="w-52">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="PENDING_SHIPPER">Pending Shipper</SelectItem>
            <SelectItem value="SHIPPER_RESPONDED">Shipper Responded</SelectItem>
            <SelectItem value="REPORTED_TO_ADMIN">Reported to Admin</SelectItem>
            <SelectItem value="CONFIRMED">Confirmed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-400">Loading...</div>
      ) : disputes.length === 0 ? (
        <div className="text-center py-16 text-gray-400">No delivery reports found.</div>
      ) : (
        <div className="space-y-3">
          {disputes.map((dispute) => {
            const cfg = STATUS_CONFIG[dispute.status] || { label: dispute.status, className: "" };
            const isExpanded = expanded[dispute._id];
            const addr = dispute.order?.shippingAddress;

            return (
              <div key={dispute._id} className="bg-white border rounded-xl overflow-hidden shadow-sm">
                {/* Header row */}
                <div
                  className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-gray-50"
                  onClick={() => toggleExpand(dispute._id)}
                >
                  <div className="flex items-center gap-4">
                    <span className="font-mono text-xs text-gray-500">
                      #{(dispute.order?._id || "").slice(-8).toUpperCase()}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cfg.className}`}>
                      {cfg.label}
                    </span>
                    {dispute.adminNotifiedAt && (
                      <span className="text-xs text-green-600 font-medium">✓ Admin notified</span>
                    )}
                  </div>
                  <div className="flex items-center gap-6 text-sm text-gray-600">
                    <span>Buyer: <b>{dispute.buyer?.username}</b></span>
                    <span>Shipper: <b>{dispute.shipper?.username}</b></span>
                    <span>${dispute.order?.totalAmount?.toFixed(2)}</span>
                    <span className="text-xs text-gray-400">
                      {new Date(dispute.createdAt).toLocaleDateString()}
                    </span>
                    {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </div>
                </div>

                {/* Expanded detail */}
                {isExpanded && (
                  <div className="border-t px-5 py-4 space-y-4 bg-gray-50">
                    {/* Thông tin giao hàng */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                      <div>
                        <p className="text-xs text-gray-400 mb-0.5">Buyer Email</p>
                        <p className="font-medium">{dispute.buyer?.email}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 mb-0.5">Shipper Email</p>
                        <p className="font-medium">{dispute.shipper?.email}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 mb-0.5">Delivery Address</p>
                        <p className="font-medium">
                          {[addr?.district, addr?.city].filter(Boolean).join(", ") || "—"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 mb-0.5">Order Status</p>
                        <p className="font-medium">{dispute.order?.status}</p>
                      </div>
                    </div>

                    {/* Buyer note */}
                    {dispute.buyerNote && (
                      <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                        <p className="text-xs font-semibold text-red-600 mb-1">Buyer's report:</p>
                        <p className="text-sm text-red-800">{dispute.buyerNote}</p>
                      </div>
                    )}

                    {/* Shipper response */}
                    {dispute.shipperNote && (
                      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <p className="text-xs font-semibold text-blue-600 mb-1">Shipper's response:</p>
                        <p className="text-sm text-blue-800">{dispute.shipperNote}</p>
                        {dispute.shipperImages?.length > 0 && (
                          <div className="flex gap-2 mt-2 flex-wrap">
                            {dispute.shipperImages.map((url, i) => (
                              <a key={i} href={url} target="_blank" rel="noreferrer">
                                <img
                                  src={url}
                                  alt={`Evidence ${i + 1}`}
                                  className="h-20 w-20 object-cover rounded-md border border-blue-200 hover:opacity-80"
                                />
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Admin note đã gửi */}
                    {dispute.adminNote && (
                      <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
                        <p className="text-xs font-semibold text-purple-600 mb-1">
                          Your previous message to buyer
                          {dispute.adminNotifiedAt && (
                            <span className="font-normal ml-2">
                              — sent {new Date(dispute.adminNotifiedAt).toLocaleString()}
                            </span>
                          )}
                          :
                        </p>
                        <p className="text-sm text-purple-800">{dispute.adminNote}</p>
                      </div>
                    )}

                    {/* Admin notify form — chỉ hiện khi status REPORTED_TO_ADMIN */}
                    {dispute.status === "REPORTED_TO_ADMIN" && (
                      <div className="space-y-2">
                        <p className="text-sm font-semibold text-gray-700">
                          Send message to buyer:
                        </p>
                        <Textarea
                          placeholder="Write your message to the buyer (e.g. investigation result, instructions)..."
                          value={notifyNote[dispute._id] || ""}
                          onChange={(e) =>
                            setNotifyNote((prev) => ({ ...prev, [dispute._id]: e.target.value }))
                          }
                          rows={3}
                        />
                        <Button
                          size="sm"
                          className="bg-purple-600 hover:bg-purple-700 text-white"
                          disabled={notifyLoading === dispute._id}
                          onClick={() => handleNotify(dispute)}
                        >
                          <Send className="h-3.5 w-3.5 mr-1.5" />
                          {notifyLoading === dispute._id ? "Sending..." : "Send Notification to Buyer"}
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex justify-center gap-2 mt-6">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Previous
          </Button>
          <span className="px-3 py-1 text-sm text-gray-600">{page} / {pages}</span>
          <Button variant="outline" size="sm" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
