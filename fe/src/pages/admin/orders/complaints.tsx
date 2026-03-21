import { useState, useEffect, useCallback } from "react";
import api from "@/lib/axios";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  AlertTriangle, CheckCircle, XCircle, RefreshCw,
  ChevronDown, ChevronUp, Send,
  Flag, Eye, Clock, ShieldAlert, Search, Users, BarChart3,
} from "lucide-react";
import {
  adminGetDisputes, adminNotifyBuyer, type AdminDisputeItem,
} from "@/api/deliveryDispute";
import {
  adminGetAllReports, adminVerifyReport, adminGetBuyerStats, adminClearBuyerMonitoring,
  REPORT_REASONS, type Report, type ReportStatus,
} from "@/api/reportApi";

// ─── Shared constants ─────────────────────────────────────────────────────────
const COMPLAINT_BADGE: Record<string, { label: string; className: string }> = {
  OPEN: { label: "Open", className: "bg-yellow-100 text-yellow-800" },
  SENT_TO_ADMIN: { label: "Sent to Admin", className: "bg-red-100 text-red-800" },
  RESOLVED: { label: "Resolved", className: "bg-green-100 text-green-800" },
  CLOSED: { label: "Closed", className: "bg-gray-100 text-gray-600" },
  open: { label: "Open", className: "bg-yellow-100 text-yellow-800" },
  sent_to_admin: { label: "Sent to Admin", className: "bg-red-100 text-red-800" },
  resolved: { label: "Resolved", className: "bg-green-100 text-green-800" },
  closed: { label: "Closed", className: "bg-gray-100 text-gray-600" },
};

const DISPUTE_STATUS: Record<string, { label: string; className: string }> = {
  PENDING_SHIPPER: { label: "Pending Shipper", className: "bg-orange-100 text-orange-700" },
  SHIPPER_RESPONDED: { label: "Shipper Responded", className: "bg-blue-100 text-blue-700" },
  REPORTED_TO_ADMIN: { label: "Reported to Admin", className: "bg-red-100 text-red-700" },
  CONFIRMED: { label: "Confirmed", className: "bg-green-100 text-green-700" },
};

const REPORT_STATUS_OPTIONS: ReportStatus[] = ["PENDING", "VALID", "REJECTED"];
const REPORT_STATUS_VARIANT: Record<ReportStatus, "default" | "secondary" | "destructive"> = {
  PENDING: "secondary", VALID: "default", REJECTED: "destructive",
};
const REPORT_STATUS_ICON: Record<ReportStatus, React.ReactNode> = {
  PENDING: <Clock className="h-3.5 w-3.5" />,
  VALID: <CheckCircle className="h-3.5 w-3.5" />,
  REJECTED: <XCircle className="h-3.5 w-3.5" />,
};

// ════════════════════════════════════════════════════════════════════════════
// Tab 1: Complaints
// ════════════════════════════════════════════════════════════════════════════
function ComplaintsTab() {
  const [complaints, setComplaints] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<any>(null);
  const [resolutionNote, setResolutionNote] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => { fetchComplaints(); }, [statusFilter]);

  const fetchComplaints = async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (statusFilter !== "all") params.status = statusFilter;
      const { data } = await api.get("/api/complaints/admin/sent", { params });
      setComplaints(data.data || []);
    } catch {
      toast.error("Failed to fetch complaints");
    } finally {
      setLoading(false);
    }
  };

  const handleResolve = async (resolution: "APPROVED" | "REJECTED") => {
    if (!resolutionNote.trim()) { toast.error("Resolution note is required."); return; }
    try {
      await api.post(`/api/complaints/admin/${selected._id || selected.id}/resolve`, { resolution, note: resolutionNote });
      toast.success(`Complaint marked as ${resolution}`);
      setDialogOpen(false);
      setResolutionNote("");
      fetchComplaints();
    } catch {
      toast.error("Failed to resolve complaint");
    }
  };

  const canAdjudicate = (status: string) => status?.toUpperCase() === "SENT_TO_ADMIN";

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">{complaints.length} complaints</p>
        <div className="flex gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-44"><SelectValue placeholder="Filter by status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="OPEN">Open</SelectItem>
              <SelectItem value="SENT_TO_ADMIN">Sent to Admin</SelectItem>
              <SelectItem value="RESOLVED">Resolved</SelectItem>
              <SelectItem value="CLOSED">Closed</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={fetchComplaints}><RefreshCw className="h-4 w-4" /></Button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading...</div>
      ) : complaints.length === 0 ? (
        <div className="text-center py-12 text-gray-500 border rounded-lg bg-white">
          <CheckCircle className="mx-auto h-8 w-8 mb-2 text-green-400" />No complaints found.
        </div>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order ID</TableHead><TableHead>Buyer</TableHead><TableHead>Seller</TableHead>
                <TableHead>Reason</TableHead><TableHead>Status</TableHead><TableHead>Created</TableHead><TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {complaints.map((c) => {
                const orderId = c.order?._id?.toString() || c.order?.toString() || "";
                const badge = COMPLAINT_BADGE[c.status] ?? { label: c.status, className: "bg-gray-100 text-gray-700" };
                return (
                  <TableRow key={c.id || c._id}>
                    <TableCell className="font-mono text-xs">{orderId ? `#${orderId.slice(-8).toUpperCase()}` : "N/A"}</TableCell>
                    <TableCell className="font-medium text-blue-600">{c.buyer?.username || "Unknown"}</TableCell>
                    <TableCell className="font-medium text-amber-600">{c.seller?.username || "Unknown"}</TableCell>
                    <TableCell className="capitalize">{c.reason?.replace(/_/g, " ")}</TableCell>
                    <TableCell><Badge className={badge.className}>{badge.label}</Badge></TableCell>
                    <TableCell className="text-xs text-muted-foreground">{c.createdAt}</TableCell>
                    <TableCell>
                      <Button size="sm" variant={canAdjudicate(c.status) ? "default" : "outline"}
                        onClick={() => { setSelected(c); setResolutionNote(""); setDialogOpen(true); }}>
                        <AlertTriangle className="h-4 w-4 mr-2" />
                        {canAdjudicate(c.status) ? "Adjudicate" : "View"}
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{selected && canAdjudicate(selected.status) ? "Admin Review Action" : "Complaint Detail"}</DialogTitle>
            <DialogDescription>
              {selected && canAdjudicate(selected.status)
                ? "Approving will penalize the seller's Trust Score."
                : "Details of this complaint."}
            </DialogDescription>
          </DialogHeader>
          {selected && (
            <div className="space-y-4 my-2">
              <div className="bg-gray-50 p-4 rounded-md text-sm space-y-1">
                <p><strong>Buyer:</strong> {selected.buyer?.username}</p>
                <p><strong>Seller:</strong> {selected.seller?.username}</p>
                <p><strong>Reason:</strong> <span className="capitalize">{selected.reason?.replace(/_/g, " ")}</span></p>
                <p><strong>Status:</strong> {COMPLAINT_BADGE[selected.status]?.label || selected.status}</p>
                <p className="mt-2"><strong>Complaint:</strong></p>
                <p className="text-gray-700 italic border-l-2 pl-2 mt-1">{selected.content}</p>
                {selected.images?.length > 0 && (
                  <div className="mt-3">
                    <p className="font-semibold mb-2">Evidence ({selected.images.length} photo{selected.images.length > 1 ? "s" : ""})</p>
                    <div className="flex flex-wrap gap-2">
                      {selected.images.map((img: { url: string }, idx: number) => (
                        <a key={idx} href={img.url} target="_blank" rel="noopener noreferrer"
                          className="block w-20 h-20 rounded border overflow-hidden hover:opacity-80 hover:ring-2 hover:ring-blue-400 transition-all">
                          <img src={img.url} alt={`Evidence ${idx + 1}`} className="w-full h-full object-cover" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}
                {selected.resolutionNote && (
                  <><p className="mt-2"><strong>Resolution Note:</strong></p>
                  <p className="text-gray-700 italic border-l-2 pl-2 mt-1">{selected.resolutionNote}</p></>
                )}
              </div>
              {canAdjudicate(selected.status) && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Resolution Note (Required)</label>
                  <Textarea placeholder="Explain the reason for this decision..." value={resolutionNote} onChange={(e) => setResolutionNote(e.target.value)} />
                </div>
              )}
            </div>
          )}
          <DialogFooter className="gap-2 sm:gap-0 mt-4">
            {selected && canAdjudicate(selected.status) ? (
              <>
                <Button variant="outline" onClick={() => handleResolve("REJECTED")} className="border-red-200 text-red-600 hover:bg-red-50">
                  <XCircle className="w-4 h-4 mr-2" /> Reject
                </Button>
                <Button onClick={() => handleResolve("APPROVED")} className="bg-green-600 hover:bg-green-700">
                  <CheckCircle className="w-4 h-4 mr-2" /> Approve & Penalize Seller
                </Button>
              </>
            ) : (
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Close</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// Tab 2: Delivery Disputes
// ════════════════════════════════════════════════════════════════════════════
function DeliveryDisputesTab() {
  const [disputes, setDisputes] = useState<AdminDisputeItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);
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

  useEffect(() => { fetchDisputes(); }, [fetchDisputes]);

  const handleNotify = async (dispute: AdminDisputeItem) => {
    const note = notifyNote[dispute._id]?.trim();
    if (!note) { toast.error("Please enter a message for the buyer"); return; }
    setNotifyLoading(dispute._id);
    try {
      await adminNotifyBuyer(dispute._id, note);
      toast.success("Notification sent to buyer");
      setDisputes((prev) => prev.map((d) => d._id === dispute._id ? { ...d, adminNote: note, adminNotifiedAt: new Date().toISOString() } : d));
      setNotifyNote((prev) => ({ ...prev, [dispute._id]: "" }));
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to send notification");
    } finally {
      setNotifyLoading(null);
    }
  };

  const toggleExpand = (id: string) => setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">{total} reports</p>
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
          <SelectTrigger className="w-52"><SelectValue placeholder="Filter by status" /></SelectTrigger>
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
            const cfg = DISPUTE_STATUS[dispute.status] || { label: dispute.status, className: "" };
            const isExpanded = expanded[dispute._id];
            const addr = dispute.order?.shippingAddress;
            return (
              <div key={dispute._id} className="bg-white border rounded-xl overflow-hidden shadow-sm">
                <div className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-gray-50" onClick={() => toggleExpand(dispute._id)}>
                  <div className="flex items-center gap-4">
                    <span className="font-mono text-xs text-gray-500">#{(dispute.order?._id || "").slice(-8).toUpperCase()}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cfg.className}`}>{cfg.label}</span>
                    {dispute.adminNotifiedAt && <span className="text-xs text-green-600 font-medium">✓ Notified</span>}
                  </div>
                  <div className="flex items-center gap-6 text-sm text-gray-600">
                    <span>Buyer: <b>{dispute.buyer?.username}</b></span>
                    <span>Shipper: <b>{dispute.shipper?.username}</b></span>
                    <span>${dispute.order?.totalAmount?.toFixed(2)}</span>
                    <span className="text-xs text-gray-400">{new Date(dispute.createdAt).toLocaleDateString()}</span>
                    {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </div>
                </div>
                {isExpanded && (
                  <div className="border-t px-5 py-4 space-y-4 bg-gray-50">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                      <div><p className="text-xs text-gray-400 mb-0.5">Buyer Email</p><p className="font-medium">{dispute.buyer?.email}</p></div>
                      <div><p className="text-xs text-gray-400 mb-0.5">Shipper Email</p><p className="font-medium">{dispute.shipper?.email}</p></div>
                      <div><p className="text-xs text-gray-400 mb-0.5">Delivery Address</p><p className="font-medium">{[addr?.district, addr?.city].filter(Boolean).join(", ") || "—"}</p></div>
                      <div><p className="text-xs text-gray-400 mb-0.5">Order Status</p><p className="font-medium">{dispute.order?.status}</p></div>
                    </div>
                    {dispute.buyerNote && (
                      <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                        <p className="text-xs font-semibold text-red-600 mb-1">Buyer's report:</p>
                        <p className="text-sm text-red-800">{dispute.buyerNote}</p>
                      </div>
                    )}
                    {dispute.shipperNote && (
                      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <p className="text-xs font-semibold text-blue-600 mb-1">Shipper's response:</p>
                        <p className="text-sm text-blue-800">{dispute.shipperNote}</p>
                        {dispute.shipperImages?.length > 0 && (
                          <div className="flex gap-2 mt-2 flex-wrap">
                            {dispute.shipperImages.map((url, i) => (
                              <a key={i} href={url} target="_blank" rel="noreferrer">
                                <img src={url} alt={`Evidence ${i + 1}`} className="h-20 w-20 object-cover rounded-md border border-blue-200 hover:opacity-80" />
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                    {dispute.adminNote && (
                      <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
                        <p className="text-xs font-semibold text-purple-600 mb-1">
                          Your previous message{dispute.adminNotifiedAt && <span className="font-normal ml-2">— {new Date(dispute.adminNotifiedAt).toLocaleString()}</span>}:
                        </p>
                        <p className="text-sm text-purple-800">{dispute.adminNote}</p>
                      </div>
                    )}
                    {dispute.status === "REPORTED_TO_ADMIN" && (
                      <div className="space-y-2">
                        <p className="text-sm font-semibold text-gray-700">Send message to buyer:</p>
                        <Textarea placeholder="Write your message to the buyer..." value={notifyNote[dispute._id] || ""}
                          onChange={(e) => setNotifyNote((prev) => ({ ...prev, [dispute._id]: e.target.value }))} rows={3} />
                        <Button size="sm" className="bg-purple-600 hover:bg-purple-700 text-white"
                          disabled={notifyLoading === dispute._id} onClick={() => handleNotify(dispute)}>
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
      {pages > 1 && (
        <div className="flex justify-center gap-2 mt-6">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
          <span className="px-3 py-1 text-sm text-gray-600">{page} / {pages}</span>
          <Button variant="outline" size="sm" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>Next</Button>
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// Tab 3: Buyer Reports
// ════════════════════════════════════════════════════════════════════════════
function BuyerReportsTab() {
  const [subTab, setSubTab] = useState<"reports" | "buyers">("reports");

  const [reports, setReports] = useState<Report[]>([]);
  const [totalReports, setTotalReports] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<ReportStatus | "">("");
  const [sellerSearch, setSellerSearch] = useState("");
  const [loadingReports, setLoadingReports] = useState(true);

  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [verifyStatus, setVerifyStatus] = useState<"VALID" | "REJECTED">("VALID");
  const [adminNote, setAdminNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  const [buyerStats, setBuyerStats] = useState<any[]>([]);
  const [loadingBuyers, setLoadingBuyers] = useState(false);
  const [clearingId, setClearingId] = useState<string | null>(null);

  useEffect(() => { fetchReports(); }, [page, statusFilter]);
  useEffect(() => { if (subTab === "buyers") fetchBuyerStats(); }, [subTab]);

  const fetchReports = async () => {
    setLoadingReports(true);
    try {
      const result = await adminGetAllReports({ status: statusFilter || undefined, page, limit: 15 });
      setReports(result.reports);
      setTotalReports(result.total);
    } catch { toast.error("Failed to load reports"); }
    finally { setLoadingReports(false); }
  };

  const fetchBuyerStats = async () => {
    setLoadingBuyers(true);
    try {
      const result = await adminGetBuyerStats({ limit: 30 });
      setBuyerStats(result.stats);
      setTotalBuyers(result.total);
    } catch { toast.error("Failed to load buyer stats"); }
    finally { setLoadingBuyers(false); }
  };

  const handleVerify = async () => {
    if (!selectedReport) return;
    if (!adminNote.trim()) return toast.error("Admin note is required");
    setSubmitting(true);
    try {
      await adminVerifyReport(selectedReport._id, { status: verifyStatus, adminNote });
      toast.success(`Report marked as ${verifyStatus}`);
      setDialogOpen(false);
      fetchReports();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to verify report");
    } finally { setSubmitting(false); }
  };

  const handleClearMonitoring = async (buyerId: string) => {
    setClearingId(buyerId);
    try {
      await adminClearBuyerMonitoring(buyerId);
      toast.success("Monitoring mode cleared");
      fetchBuyerStats();
    } catch { toast.error("Failed to clear monitoring"); }
    finally { setClearingId(null); }
  };

  const filteredReports = sellerSearch
    ? reports.filter((r) => r.seller?.username?.toLowerCase().includes(sellerSearch.toLowerCase()) || r.seller?._id?.includes(sellerSearch))
    : reports;

  return (
    <div>
      {/* Sub-tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-5 w-fit">
        {(["reports", "buyers"] as const).map((t) => (
          <button key={t} onClick={() => setSubTab(t)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              subTab === t ? "bg-white shadow-sm text-gray-900" : "text-gray-600 hover:text-gray-800"
            }`}>
            {t === "reports" ? <><Flag className="h-4 w-4" /> Reports</> : <><Users className="h-4 w-4" /> Buyer Accuracy</>}
          </button>
        ))}
      </div>

      {subTab === "reports" && (
        <>
          <div className="mb-5 flex flex-wrap gap-3 items-center">
            <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
              <button onClick={() => { setStatusFilter(""); setPage(1); }}
                className={`px-3 py-1.5 rounded-md text-sm transition-all ${!statusFilter ? "bg-white shadow-sm font-medium" : "text-gray-600"}`}>All</button>
              {REPORT_STATUS_OPTIONS.map((s) => (
                <button key={s} onClick={() => { setStatusFilter(s); setPage(1); }}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-sm transition-all ${statusFilter === s ? "bg-white shadow-sm font-medium" : "text-gray-600"}`}>
                  {REPORT_STATUS_ICON[s]} {s}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 bg-white border rounded-lg px-3 py-1.5">
              <Search className="h-4 w-4 text-gray-400" />
              <input className="text-sm outline-none w-40" placeholder="Search seller..." value={sellerSearch} onChange={(e) => setSellerSearch(e.target.value)} />
            </div>
            <button onClick={fetchReports} className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 bg-white border rounded-lg">
              <RefreshCw className="h-4 w-4" /> Refresh
            </button>
          </div>

          {loadingReports ? (
            <div className="py-16 text-center text-gray-400">Loading reports...</div>
          ) : filteredReports.length === 0 ? (
            <Card className="py-16 text-center border-0 shadow-sm">
              <Flag className="h-10 w-10 mx-auto mb-3 text-gray-300" />
              <p className="text-gray-500">No reports found</p>
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredReports.map((report) => (
                <Card key={report._id} className="p-4 border-0 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant={REPORT_STATUS_VARIANT[report.status]} className="flex items-center gap-1">
                          {REPORT_STATUS_ICON[report.status]} {report.status}
                        </Badge>
                        <span className="text-sm font-semibold text-gray-900">
                          {REPORT_REASONS.find((r) => r.value === report.reason)?.icon}{" "}
                          {REPORT_REASONS.find((r) => r.value === report.reason)?.label}
                        </span>
                        <span className="text-xs text-gray-400">{new Date(report.createdAt).toLocaleString()}</span>
                      </div>
                      <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-gray-700">
                        <span>Buyer: <b>{report.buyer?.username || "N/A"}</b></span>
                        <span>Seller: <b>{report.seller?.username || "N/A"}</b></span>
                        {report.product && <span className="text-gray-500">Product: {report.product.title}</span>}
                      </div>
                      <p className="text-sm text-gray-600 line-clamp-2">{report.description}</p>
                      {report.evidenceUrl && (
                        <a href={report.evidenceUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline">🔗 View Evidence</a>
                      )}
                      {report.adminNote && (
                        <p className="text-xs text-gray-500 bg-gray-50 rounded px-2 py-1">Admin note: {report.adminNote}</p>
                      )}
                    </div>
                    <div className="shrink-0">
                      {report.status === "PENDING" ? (
                        <Button size="sm" onClick={() => { setSelectedReport(report); setVerifyStatus("VALID"); setAdminNote(report.adminNote || ""); setDialogOpen(true); }}>
                          <Eye className="h-4 w-4 mr-1" /> Review
                        </Button>
                      ) : (
                        <Button size="sm" variant="outline" onClick={() => { setSelectedReport(report); setVerifyStatus("VALID"); setAdminNote(report.adminNote || ""); setDialogOpen(true); }}>
                          <Eye className="h-4 w-4 mr-1" /> View
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}

          {totalReports > 15 && (
            <div className="mt-6 flex items-center justify-center gap-2">
              <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
              <span className="text-sm text-gray-600">Page {page} / {Math.ceil(totalReports / 15)}</span>
              <Button variant="outline" size="sm" disabled={page >= Math.ceil(totalReports / 15)} onClick={() => setPage((p) => p + 1)}>Next</Button>
            </div>
          )}
        </>
      )}

      {subTab === "buyers" && (
        <>
          {loadingBuyers ? (
            <div className="py-16 text-center text-gray-400">Loading buyer stats...</div>
          ) : buyerStats.length === 0 ? (
            <Card className="py-16 text-center border-0 shadow-sm">
              <BarChart3 className="h-10 w-10 mx-auto mb-3 text-gray-300" /><p className="text-gray-500">No buyer statistics found</p>
            </Card>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {buyerStats.map((stat: any) => (
                <Card key={stat._id} className={`p-4 border-0 shadow-sm ${stat.underMonitoring ? "ring-2 ring-red-300" : ""}`}>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div>
                      <p className="font-semibold text-sm text-gray-900">{stat.buyer?.username || "Unknown"}</p>
                      <p className="text-xs text-gray-400">{stat.buyer?.email}</p>
                    </div>
                    {stat.underMonitoring && (
                      <Badge variant="destructive" className="flex items-center gap-1 shrink-0">
                        <ShieldAlert className="h-3 w-3" /> Monitoring
                      </Badge>
                    )}
                  </div>
                  <div className="grid grid-cols-4 gap-2 text-center mb-3">
                    {[
                      { label: "Total", value: stat.totalReports, color: "text-gray-700" },
                      { label: "Valid", value: stat.validReports, color: "text-emerald-600" },
                      { label: "Rejected", value: stat.rejectedReports, color: "text-red-600" },
                      { label: "Accuracy", value: `${(stat.accuracyScore * 100).toFixed(0)}%`, color: stat.accuracyScore >= 0.6 ? "text-emerald-600" : stat.accuracyScore >= 0.3 ? "text-amber-600" : "text-red-600" },
                    ].map((item) => (
                      <div key={item.label}>
                        <p className={`text-lg font-bold ${item.color}`}>{item.value}</p>
                        <p className="text-xs text-gray-500">{item.label}</p>
                      </div>
                    ))}
                  </div>
                  <div className="mb-3">
                    <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                      <div className={`h-full rounded-full transition-all ${stat.accuracyScore >= 0.6 ? "bg-emerald-500" : stat.accuracyScore >= 0.3 ? "bg-amber-400" : "bg-red-500"}`}
                        style={{ width: `${Math.min(stat.accuracyScore * 100, 100)}%` }} />
                    </div>
                  </div>
                  {stat.underMonitoring && (
                    <Button size="sm" variant="outline" className="w-full text-xs" disabled={clearingId === stat.buyer?._id} onClick={() => handleClearMonitoring(stat.buyer?._id)}>
                      {clearingId === stat.buyer?._id ? "Clearing..." : "Clear Monitoring Mode"}
                    </Button>
                  )}
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {/* Verify Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Flag className="h-5 w-5 text-red-500" />
              {selectedReport?.status === "PENDING" ? "Review Report" : "Report Detail"}
            </DialogTitle>
          </DialogHeader>
          {selectedReport && (
            <div className="space-y-4">
              <div className="rounded-lg bg-gray-50 p-4 text-sm space-y-1.5">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant={REPORT_STATUS_VARIANT[selectedReport.status]}>{selectedReport.status}</Badge>
                  <span className="font-medium">
                    {REPORT_REASONS.find((r) => r.value === selectedReport.reason)?.icon}{" "}
                    {REPORT_REASONS.find((r) => r.value === selectedReport.reason)?.label}
                  </span>
                </div>
                <p><b>Buyer:</b> {selectedReport.buyer?.username} ({selectedReport.buyer?.email})</p>
                <p><b>Seller:</b> {selectedReport.seller?.username} ({selectedReport.seller?.email})</p>
                {selectedReport.product && <p><b>Product:</b> {selectedReport.product.title}</p>}
                {selectedReport.order && <p><b>Order:</b> #{selectedReport.order._id?.slice(-8)?.toUpperCase()}</p>}
                <p className="mt-2"><b>Description:</b></p>
                <p className="text-gray-700 bg-white p-2 rounded border">{selectedReport.description}</p>
                {selectedReport.evidenceUrl && (
                  <a href={selectedReport.evidenceUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-xs">🔗 View Evidence</a>
                )}
                <p className="text-xs text-gray-400">Submitted: {new Date(selectedReport.createdAt).toLocaleString()}</p>
              </div>
              {selectedReport.status === "PENDING" && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    {(["VALID", "REJECTED"] as const).map((s) => (
                      <button key={s} onClick={() => setVerifyStatus(s)}
                        className={`p-3 rounded-lg border-2 flex items-center gap-2 text-sm font-medium transition-all ${
                          verifyStatus === s
                            ? s === "VALID" ? "border-emerald-500 bg-emerald-50 text-emerald-800" : "border-red-500 bg-red-50 text-red-800"
                            : "border-gray-200 text-gray-600"
                        }`}>
                        {s === "VALID" ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                        Mark as {s}
                      </button>
                    ))}
                  </div>
                  {verifyStatus === "VALID" && (
                    <div className="text-xs text-amber-700 bg-amber-50 rounded-lg p-3 border border-amber-200">
                      ⚠️ <b>Marking as VALID</b> will increase the seller's complaint count and affect their Trust Score.
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Admin Note <span className="text-red-500">*</span></label>
                    <Textarea rows={3} value={adminNote} onChange={(e) => setAdminNote(e.target.value)} placeholder="Explain your decision..." />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                    <Button onClick={handleVerify} disabled={submitting}
                      className={verifyStatus === "VALID" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-red-600 hover:bg-red-700"}>
                      {submitting ? "Submitting..." : `Confirm ${verifyStatus}`}
                    </Button>
                  </div>
                </>
              )}
              {selectedReport.status !== "PENDING" && (
                <div className="flex justify-end">
                  <Button variant="outline" onClick={() => setDialogOpen(false)}>Close</Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// Combined page
// ════════════════════════════════════════════════════════════════════════════
type Tab = "complaints" | "disputes" | "buyer-reports";

export default function AdminReportsPage() {
  const [tab, setTab] = useState<Tab>("complaints");

  const TABS: { key: Tab; label: string }[] = [
    { key: "complaints", label: "Complaints" },
    { key: "disputes", label: "Delivery Disputes" },
    { key: "buyer-reports", label: "Buyer Reports" },
  ];

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Reports Management</h1>

      <div className="flex border-b mb-6">
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-5 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              tab === t.key ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === "complaints" && <ComplaintsTab />}
      {tab === "disputes" && <DeliveryDisputesTab />}
      {tab === "buyer-reports" && <BuyerReportsTab />}
    </div>
  );
}
