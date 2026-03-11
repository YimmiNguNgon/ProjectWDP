import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  Flag,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  ShieldAlert,
  Search,
  Users,
  BarChart3,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  adminGetAllReports,
  adminVerifyReport,
  adminGetBuyerStats,
  adminClearBuyerMonitoring,
  REPORT_REASONS,
  type Report,
  type ReportStatus,
} from "@/api/reportApi";

const STATUS_OPTIONS: ReportStatus[] = ["PENDING", "VALID", "REJECTED"];

const STATUS_VARIANT: Record<ReportStatus, "default" | "secondary" | "destructive"> = {
  PENDING: "secondary",
  VALID: "default",
  REJECTED: "destructive",
};

const STATUS_ICON: Record<ReportStatus, React.ReactNode> = {
  PENDING: <Clock className="h-3.5 w-3.5" />,
  VALID: <CheckCircle className="h-3.5 w-3.5" />,
  REJECTED: <XCircle className="h-3.5 w-3.5" />,
};

export default function AdminReportManagement() {
  const [activeTab, setActiveTab] = useState<"reports" | "buyers">("reports");

  // Reports list
  const [reports, setReports] = useState<Report[]>([]);
  const [totalReports, setTotalReports] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<ReportStatus | "">("");
  const [sellerSearch, setSellerSearch] = useState("");
  const [loadingReports, setLoadingReports] = useState(true);

  // Detail dialog
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [verifyStatus, setVerifyStatus] = useState<"VALID" | "REJECTED">("VALID");
  const [adminNote, setAdminNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Buyer stats
  const [buyerStats, setBuyerStats] = useState<any[]>([]);
  const [totalBuyers, setTotalBuyers] = useState(0);
  const [monitoringOnly, setMonitoringOnly] = useState(false);
  const [loadingBuyers, setLoadingBuyers] = useState(false);
  const [clearingId, setClearingId] = useState<string | null>(null);

  useEffect(() => {
    fetchReports();
  }, [page, statusFilter]);

  useEffect(() => {
    if (activeTab === "buyers") fetchBuyerStats();
  }, [activeTab, monitoringOnly]);

  const fetchReports = async () => {
    try {
      setLoadingReports(true);
      const result = await adminGetAllReports({
        status: statusFilter || undefined,
        page,
        limit: 15,
      });
      setReports(result.reports);
      setTotalReports(result.total);
    } catch {
      toast.error("Failed to load reports");
    } finally {
      setLoadingReports(false);
    }
  };

  const fetchBuyerStats = async () => {
    try {
      setLoadingBuyers(true);
      const result = await adminGetBuyerStats({
        underMonitoring: monitoringOnly || undefined,
        limit: 30,
      });
      setBuyerStats(result.stats);
      setTotalBuyers(result.total);
    } catch {
      toast.error("Failed to load buyer stats");
    } finally {
      setLoadingBuyers(false);
    }
  };

  const openVerifyDialog = (report: Report) => {
    setSelectedReport(report);
    setVerifyStatus("VALID");
    setAdminNote(report.adminNote || "");
    setDialogOpen(true);
  };

  const handleVerify = async () => {
    if (!selectedReport) return;
    if (!adminNote.trim()) return toast.error("Admin note is required");
    try {
      setSubmitting(true);
      await adminVerifyReport(selectedReport._id, { status: verifyStatus, adminNote });
      toast.success(`Report marked as ${verifyStatus}`);
      setDialogOpen(false);
      fetchReports();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to verify report");
    } finally {
      setSubmitting(false);
    }
  };

  const handleClearMonitoring = async (buyerId: string) => {
    try {
      setClearingId(buyerId);
      await adminClearBuyerMonitoring(buyerId);
      toast.success("Monitoring mode cleared");
      fetchBuyerStats();
    } catch {
      toast.error("Failed to clear monitoring");
    } finally {
      setClearingId(null);
    }
  };

  const filteredReports = sellerSearch
    ? reports.filter((r) =>
        r.seller?.username?.toLowerCase().includes(sellerSearch.toLowerCase()) ||
        r.seller?._id?.includes(sellerSearch)
      )
    : reports;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
            <Flag className="h-5 w-5 text-red-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Report Management</h1>
            <p className="text-sm text-gray-500">{totalReports} total reports</p>
          </div>
        </div>

        <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
          <button
            onClick={() => setActiveTab("reports")}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === "reports" ? "bg-white shadow-sm text-gray-900" : "text-gray-600 hover:text-gray-800"
            }`}
          >
            <Flag className="h-4 w-4" /> Reports
          </button>
          <button
            onClick={() => setActiveTab("buyers")}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === "buyers" ? "bg-white shadow-sm text-gray-900" : "text-gray-600 hover:text-gray-800"
            }`}
          >
            <Users className="h-4 w-4" /> Buyer Accuracy
          </button>
        </div>
      </div>

      {activeTab === "reports" && (
        <>
          {/* Filters */}
          <div className="mb-5 flex flex-wrap gap-3 items-center">
            <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => { setStatusFilter(""); setPage(1); }}
                className={`px-3 py-1.5 rounded-md text-sm transition-all ${!statusFilter ? "bg-white shadow-sm font-medium" : "text-gray-600"}`}
              >
                All
              </button>
              {STATUS_OPTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => { setStatusFilter(s); setPage(1); }}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-sm transition-all ${
                    statusFilter === s ? "bg-white shadow-sm font-medium" : "text-gray-600"
                  }`}
                >
                  {STATUS_ICON[s]} {s}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 bg-white border rounded-lg px-3 py-1.5">
              <Search className="h-4 w-4 text-gray-400" />
              <input
                className="text-sm outline-none w-40"
                placeholder="Search seller..."
                value={sellerSearch}
                onChange={(e) => setSellerSearch(e.target.value)}
              />
            </div>

            <button
              onClick={fetchReports}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 bg-white border rounded-lg"
            >
              <RefreshCw className="h-4 w-4" /> Refresh
            </button>
          </div>

          {/* Reports grid */}
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
                        <Badge variant={STATUS_VARIANT[report.status]} className="flex items-center gap-1">
                          {STATUS_ICON[report.status]} {report.status}
                        </Badge>
                        <span className="text-sm font-semibold text-gray-900">
                          {REPORT_REASONS.find((r) => r.value === report.reason)?.icon}{" "}
                          {REPORT_REASONS.find((r) => r.value === report.reason)?.label}
                        </span>
                        <span className="text-xs text-gray-400">
                          {new Date(report.createdAt).toLocaleString()}
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-gray-700">
                        <span>
                          Buyer: <b>{report.buyer?.username || "N/A"}</b>
                        </span>
                        <span>
                          Seller: <b>{report.seller?.username || "N/A"}</b>
                        </span>
                        {report.product && (
                          <span className="text-gray-500">Product: {report.product.title}</span>
                        )}
                      </div>

                      <p className="text-sm text-gray-600 line-clamp-2">{report.description}</p>

                      {report.evidenceUrl && (
                        <a
                          href={report.evidenceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-600 hover:underline"
                        >
                          🔗 View Evidence
                        </a>
                      )}

                      {report.adminNote && (
                        <p className="text-xs text-gray-500 bg-gray-50 rounded px-2 py-1">
                          Admin note: {report.adminNote}
                        </p>
                      )}
                    </div>

                    <div className="shrink-0">
                      {report.status === "PENDING" ? (
                        <Button size="sm" onClick={() => openVerifyDialog(report)}>
                          <Eye className="h-4 w-4 mr-1" /> Review
                        </Button>
                      ) : (
                        <Button size="sm" variant="outline" onClick={() => openVerifyDialog(report)}>
                          <Eye className="h-4 w-4 mr-1" /> View
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalReports > 15 && (
            <div className="mt-6 flex items-center justify-center gap-2">
              <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
                Previous
              </Button>
              <span className="text-sm text-gray-600">
                Page {page} / {Math.ceil(totalReports / 15)}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= Math.ceil(totalReports / 15)}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}

      {activeTab === "buyers" && (
        <>
          <div className="mb-5 flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                className="h-4 w-4 rounded"
                checked={monitoringOnly}
                onChange={(e) => setMonitoringOnly(e.target.checked)}
              />
              Show only buyers under monitoring
            </label>
            <span className="text-sm text-gray-500">({totalBuyers} total)</span>
          </div>

          {loadingBuyers ? (
            <div className="py-16 text-center text-gray-400">Loading buyer stats...</div>
          ) : buyerStats.length === 0 ? (
            <Card className="py-16 text-center border-0 shadow-sm">
              <BarChart3 className="h-10 w-10 mx-auto mb-3 text-gray-300" />
              <p className="text-gray-500">No buyer statistics found</p>
            </Card>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {buyerStats.map((stat: any) => (
                <Card
                  key={stat._id}
                  className={`p-4 border-0 shadow-sm ${stat.underMonitoring ? "ring-2 ring-red-300" : ""}`}
                >
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div>
                      <p className="font-semibold text-sm text-gray-900">
                        {stat.buyer?.username || "Unknown"}
                      </p>
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
                      {
                        label: "Accuracy",
                        value: `${(stat.accuracyScore * 100).toFixed(0)}%`,
                        color:
                          stat.accuracyScore >= 0.6
                            ? "text-emerald-600"
                            : stat.accuracyScore >= 0.3
                            ? "text-amber-600"
                            : "text-red-600",
                      },
                    ].map((item) => (
                      <div key={item.label}>
                        <p className={`text-lg font-bold ${item.color}`}>{item.value}</p>
                        <p className="text-xs text-gray-500">{item.label}</p>
                      </div>
                    ))}
                  </div>

                  {/* Accuracy bar */}
                  <div className="mb-3">
                    <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          stat.accuracyScore >= 0.6
                            ? "bg-emerald-500"
                            : stat.accuracyScore >= 0.3
                            ? "bg-amber-400"
                            : "bg-red-500"
                        }`}
                        style={{ width: `${Math.min(stat.accuracyScore * 100, 100)}%` }}
                      />
                    </div>
                  </div>

                  {stat.underMonitoring && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full text-xs"
                      disabled={clearingId === stat.buyer?._id}
                      onClick={() => handleClearMonitoring(stat.buyer?._id)}
                    >
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
              {/* Info */}
              <div className="rounded-lg bg-gray-50 p-4 text-sm space-y-1.5">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant={STATUS_VARIANT[selectedReport.status]}>{selectedReport.status}</Badge>
                  <span className="font-medium">
                    {REPORT_REASONS.find((r) => r.value === selectedReport.reason)?.icon}{" "}
                    {REPORT_REASONS.find((r) => r.value === selectedReport.reason)?.label}
                  </span>
                </div>
                <p><b>Buyer:</b> {selectedReport.buyer?.username} ({selectedReport.buyer?.email})</p>
                <p><b>Seller:</b> {selectedReport.seller?.username} ({selectedReport.seller?.email})</p>
                {selectedReport.product && <p><b>Product:</b> {selectedReport.product.title}</p>}
                {selectedReport.order && (
                  <p><b>Order:</b> #{selectedReport.order._id?.slice(-8)?.toUpperCase()}</p>
                )}
                <p className="mt-2"><b>Description:</b></p>
                <p className="text-gray-700 bg-white p-2 rounded border">{selectedReport.description}</p>
                {selectedReport.evidenceUrl && (
                  <a href={selectedReport.evidenceUrl} target="_blank" rel="noopener noreferrer"
                    className="text-blue-600 hover:underline text-xs">
                    🔗 View Evidence
                  </a>
                )}
                <p className="text-xs text-gray-400">
                  Submitted: {new Date(selectedReport.createdAt).toLocaleString()}
                </p>
              </div>

              {/* Decision (only for PENDING) */}
              {selectedReport.status === "PENDING" && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    {(["VALID", "REJECTED"] as const).map((s) => (
                      <button
                        key={s}
                        onClick={() => setVerifyStatus(s)}
                        className={`p-3 rounded-lg border-2 flex items-center gap-2 ${
                          verifyStatus === s
                            ? s === "VALID"
                              ? "border-emerald-500 bg-emerald-50 text-emerald-800"
                              : "border-red-500 bg-red-50 text-red-800"
                            : "border-gray-200 text-gray-600"
                        } text-sm font-medium transition-all`}
                      >
                        {s === "VALID" ? (
                          <CheckCircle className="h-4 w-4" />
                        ) : (
                          <XCircle className="h-4 w-4" />
                        )}
                        Mark as {s}
                      </button>
                    ))}
                  </div>

                  {verifyStatus === "VALID" && (
                    <div className="text-xs text-amber-700 bg-amber-50 rounded-lg p-3 border border-amber-200">
                      ⚠️ <b>Marking as VALID</b> will increase the seller's complaint count, which affects
                      their Trust Score (Dispute Score). If the seller has ≥3 valid reports in 30 days, they
                      will be risk-flagged automatically.
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Admin Note <span className="text-red-500">*</span>
                    </label>
                    <Textarea
                      rows={3}
                      value={adminNote}
                      onChange={(e) => setAdminNote(e.target.value)}
                      placeholder="Explain your decision..."
                    />
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button
                      onClick={handleVerify}
                      disabled={submitting}
                      className={verifyStatus === "VALID" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-red-600 hover:bg-red-700"}
                    >
                      {submitting ? "Submitting..." : `Confirm ${verifyStatus}`}
                    </Button>
                  </div>
                </>
              )}

              {selectedReport.status !== "PENDING" && (
                <div className="flex justify-end">
                  <Button variant="outline" onClick={() => setDialogOpen(false)}>
                    Close
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
