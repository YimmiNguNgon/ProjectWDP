import { useState, useEffect, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import api from "@/lib/axios";
import {
  AlertTriangle,
  Flag,
  CheckCircle,
  Upload,
  ArrowLeft,
  ShieldAlert,
  Clock,
  BarChart3,
  ImageIcon,
  X,
  User,
  Package,
  ShoppingBag,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  submitReport,
  getMyReports,
  getMyReportStats,
  REPORT_REASONS,
  type ReportReason,
  type Report,
  type BuyerReportStats,
} from "@/api/reportApi";

const STATUS_MAP: Record<string, { label: string; variant: "default" | "secondary" | "destructive" }> = {
  PENDING: { label: "Pending Review", variant: "secondary" },
  VALID: { label: "Valid", variant: "default" },
  REJECTED: { label: "Rejected", variant: "destructive" },
};

export default function BuyerReportPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Pre-fill from query params
  const prefillSellerId = searchParams.get("sellerId") || "";
  const prefillProductId = searchParams.get("productId") || "";
  const prefillOrderId = searchParams.get("orderId") || "";

  // Resolved names for display
  const [sellerName, setSellerName] = useState<string>("");
  const [productTitle, setProductTitle] = useState<string>("");
  const [productImage, setProductImage] = useState<string>("");

  // Form state
  const [sellerId, setSellerId] = useState(prefillSellerId);
  const [reason, setReason] = useState<ReportReason | "">("");
  const [description, setDescription] = useState("");
  const [evidenceUrl, setEvidenceUrl] = useState("");
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);
  const [evidencePreview, setEvidencePreview] = useState<string>("");
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // My reports + stats
  const [myReports, setMyReports] = useState<Report[]>([]);
  const [stats, setStats] = useState<BuyerReportStats | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [activeTab, setActiveTab] = useState<"submit" | "history">("submit");

  // Fetch seller & product info on load
  useEffect(() => {
    if (prefillProductId) {
      api.get(`/api/products/${prefillProductId}`).then((res) => {
        const p = res.data?.data ?? res.data;
        if (p) {
          setProductTitle(p.title || "");
          setProductImage(p.images?.[0] || p.image || "");
          // Also fill seller from product if not separately provided
          if (p.seller) {
            const name = p.seller.username || p.seller.shopName || p.seller.name || "";
            if (name) setSellerName(name);
          }
        }
      }).catch(() => { });
    }

    if (prefillSellerId && !prefillProductId) {
      // Try fetching seller profile
      api.get(`/api/users/${prefillSellerId}`).then((res) => {
        const u = res.data?.data ?? res.data;
        const name = u?.username || u?.shopName || u?.name || "";
        if (name) setSellerName(name);
      }).catch(() => { });
    }

    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      setLoadingHistory(true);
      const [reportsRes, statsRes] = await Promise.all([getMyReports({ limit: 20 }), getMyReportStats()]);
      setMyReports(reportsRes.reports);
      setStats(statsRes.data);
    } catch {
      // silently ignore if not authenticated
    } finally {
      setLoadingHistory(false);
    }
  };

  // ── File selection ──────────────────────────────────────
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image too large. Max size is 5MB.");
      return;
    }
    if (!file.type.startsWith("image/")) {
      toast.error("Only image files are allowed as evidence.");
      return;
    }
    setEvidenceFile(file);
    setEvidencePreview(URL.createObjectURL(file));
    setEvidenceUrl("");
  };

  const handleRemoveEvidence = () => {
    setEvidenceFile(null);
    setEvidencePreview("");
    setEvidenceUrl("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // ── Upload to Cloudinary ────────────────────────────────
  const uploadEvidence = async (): Promise<string | undefined> => {
    if (!evidenceFile) return undefined;
    const formData = new FormData();
    formData.append("evidence", evidenceFile);
    try {
      setUploading(true);
      const res = await api.post("/api/upload/report-evidence", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const url: string = res.data.url;
      setEvidenceUrl(url);
      return url;
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to upload evidence image");
      return undefined;
    } finally {
      setUploading(false);
    }
  };

  // ── Submit ──────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sellerId.trim()) return toast.error("Seller ID is required");
    if (!reason) return toast.error("Please select a reason");
    if (!description.trim() || description.length < 20)
      return toast.error("Description must be at least 20 characters");

    try {
      setSubmitting(true);
      let finalEvidenceUrl = evidenceUrl;
      if (evidenceFile && !evidenceUrl) {
        finalEvidenceUrl = (await uploadEvidence()) || "";
        if (!finalEvidenceUrl && evidenceFile) { setSubmitting(false); return; }
      }
      await submitReport({
        sellerId,
        productId: prefillProductId || undefined,
        orderId: prefillOrderId || undefined,
        reason: reason as ReportReason,
        description,
        evidenceUrl: finalEvidenceUrl || undefined,
      });
      toast.success("Report submitted! It will be reviewed by our team.");
      setSubmitted(true);
      fetchHistory();
      setReason("");
      setDescription("");
      handleRemoveEvidence();
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || "Failed to submit report");
    } finally {
      setSubmitting(false);
    }
  };

  const isBusy = submitting || uploading;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      {/* Header */}
      <div className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="text-gray-500 hover:text-gray-800 transition">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center">
                <Flag className="h-4 w-4 text-red-600" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900">Report a Seller</h1>
                <p className="text-xs text-gray-500">Help us maintain a safe marketplace</p>
              </div>
            </div>
          </div>
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
            {(["submit", "history"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === tab ? "bg-white text-gray-900 shadow-sm" : "text-gray-600 hover:text-gray-800"
                  }`}
              >
                {tab === "submit" ? "Submit Report" : "My Reports"}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Stats Banner */}
        {stats && (
          <div className={`mb-6 p-4 rounded-xl border-2 ${stats.underMonitoring ? "bg-red-50 border-red-200"
            : stats.accuracyScore < 0.5 ? "bg-amber-50 border-amber-200"
              : "bg-emerald-50 border-emerald-200"
            }`}>
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3">
                {stats.underMonitoring
                  ? <ShieldAlert className="h-6 w-6 text-red-600 shrink-0" />
                  : <BarChart3 className="h-6 w-6 text-emerald-600 shrink-0" />
                }
                <div>
                  <p className="font-semibold text-sm">
                    {stats.underMonitoring ? " Account in Report Monitoring Mode" : "Your Report Statistics"}
                  </p>
                  {stats.underMonitoring && (
                    <p className="text-xs text-red-700 mt-0.5">
                      Your report accuracy is too low. Reporting is temporarily disabled.
                    </p>
                  )}
                </div>
              </div>
              <div className="flex gap-4 text-sm">
                <div className="text-center"><p className="font-bold text-lg">{stats.totalReports}</p><p className="text-xs text-gray-600">Total</p></div>
                <div className="text-center"><p className="font-bold text-lg text-emerald-600">{stats.validReports}</p><p className="text-xs text-gray-600">Valid</p></div>
                <div className="text-center"><p className="font-bold text-lg text-red-600">{stats.rejectedReports}</p><p className="text-xs text-gray-600">Rejected</p></div>
                <div className="text-center">
                  <p className={`font-bold text-lg ${stats.accuracyScore >= 0.6 ? "text-emerald-600" : stats.accuracyScore >= 0.3 ? "text-amber-600" : "text-red-600"}`}>
                    {(stats.accuracyScore * 100).toFixed(0)}%
                  </p>
                  <p className="text-xs text-gray-600">Accuracy</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "submit" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: Info */}

            {/* Right: Form */}
            <div className="lg:col-span-2">
              {submitted ? (
                <Card className="p-8 text-center border-0 shadow-sm">
                  <CheckCircle className="h-14 w-14 text-emerald-500 mx-auto mb-4" />
                  <h2 className="text-xl font-bold text-gray-900 mb-2">Report Submitted!</h2>
                  <p className="text-gray-600 text-sm mb-6">
                    Our team will review your report and take appropriate action. Thank you for helping keep the marketplace safe.
                  </p>
                  <Button onClick={() => setSubmitted(false)} variant="outline">Submit Another Report</Button>
                </Card>
              ) : stats?.underMonitoring ? (
                <Card className="p-8 text-center border-0 shadow-sm border-2 border-red-200">
                  <ShieldAlert className="h-14 w-14 text-red-500 mx-auto mb-4" />
                  <h2 className="text-xl font-bold text-gray-900 mb-2">Reporting Restricted</h2>
                  <p className="text-gray-600 text-sm">
                    Your account is in report monitoring mode due to a low report accuracy score. Please contact support if you believe this is a mistake.
                  </p>
                </Card>
              ) : (
                <Card className="p-6 border-0 shadow-sm">
                  <form onSubmit={handleSubmit} className="space-y-5">

                    {/* ── Reporting target info card ── */}
                    {(prefillSellerId || prefillProductId || prefillOrderId) && (
                      <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 space-y-2">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Reporting About</p>

                        {/* Seller */}
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                            <User className="h-4 w-4 text-red-600" />
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Seller</p>
                            <p className="text-sm font-semibold text-gray-900">
                              {sellerName || prefillSellerId}
                            </p>
                          </div>
                        </div>

                        {/* Product */}
                        {prefillProductId && (
                          <div className="flex items-center gap-3">
                            {productImage ? (
                              <img src={productImage} alt="" className="w-8 h-8 rounded-md object-cover shrink-0 border" />
                            ) : (
                              <div className="w-8 h-8 rounded-md bg-blue-100 flex items-center justify-center shrink-0">
                                <Package className="h-4 w-4 text-blue-600" />
                              </div>
                            )}
                            <div>
                              <p className="text-xs text-gray-500">Product</p>
                              <p className="text-sm font-semibold text-gray-900 line-clamp-1">
                                {productTitle || prefillProductId}
                              </p>
                            </div>
                          </div>
                        )}

                        {/* Order */}
                        {prefillOrderId && (
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-md bg-purple-100 flex items-center justify-center shrink-0">
                              <ShoppingBag className="h-4 w-4 text-purple-600" />
                            </div>
                            <div>
                              <p className="text-xs text-gray-500">Order</p>
                              <p className="text-sm font-mono text-gray-700">#{prefillOrderId.slice(-8)}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Seller ID (manual if not pre-filled) */}
                    {!prefillSellerId && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                          Seller ID <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
                          placeholder="Paste the seller's ID here"
                          value={sellerId}
                          onChange={(e) => setSellerId(e.target.value)}
                          required
                        />
                      </div>
                    )}

                    {/* Reason */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Reason <span className="text-red-500">*</span>
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {REPORT_REASONS.map((r) => (
                          <button
                            key={r.value}
                            type="button"
                            onClick={() => setReason(r.value)}
                            className={`flex items-center gap-2.5 px-4 py-3 rounded-lg border-2 text-sm text-left transition-all ${reason === r.value
                              ? "border-blue-500 bg-blue-50 text-blue-900 font-medium"
                              : "border-gray-200 hover:border-gray-300 bg-white text-gray-700"
                              }`}
                          >
                            <span className="text-lg">{r.icon}</span>
                            {r.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Description */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Description <span className="text-red-500">*</span>
                      </label>
                      <Textarea
                        rows={4}
                        placeholder="Describe what happened in detail (minimum 20 characters)..."
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="resize-none"
                        maxLength={2000}
                      />
                      <p className="mt-1 text-xs text-gray-400 text-right">{description.length}/2000</p>
                    </div>

                    {/* Evidence Photo */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Evidence Photo <span className="text-gray-400 font-normal">(optional, max 5MB)</span>
                      </label>
                      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                      {evidencePreview ? (
                        <div className="relative w-full rounded-xl border-2 border-dashed border-emerald-300 bg-emerald-50 overflow-hidden">
                          <img src={evidencePreview} alt="Evidence preview" className="w-full max-h-56 object-contain" />
                          <div className="absolute top-2 right-2 flex gap-2">
                            <button type="button" onClick={() => fileInputRef.current?.click()} className="bg-white/90 hover:bg-white border border-gray-200 rounded-full p-1.5 shadow-sm transition" title="Change image">
                              <ImageIcon className="h-4 w-4 text-gray-600" />
                            </button>
                            <button type="button" onClick={handleRemoveEvidence} className="bg-white/90 hover:bg-red-50 border border-gray-200 rounded-full p-1.5 shadow-sm transition" title="Remove image">
                              <X className="h-4 w-4 text-red-500" />
                            </button>
                          </div>
                          <p className="text-xs text-emerald-700 text-center pb-2">
                            {evidenceFile?.name}
                            {evidenceUrl && <span className="ml-2 text-emerald-600 font-medium">✓ Uploaded</span>}
                          </p>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="w-full rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 hover:border-blue-400 hover:bg-blue-50 transition-all py-8 flex flex-col items-center gap-2 text-gray-500 hover:text-blue-600"
                        >
                          <Upload className="h-7 w-7" />
                          <span className="text-sm font-medium">Click to upload evidence photo</span>
                          <span className="text-xs text-gray-400">JPG, PNG, WEBP — max 5MB</span>
                        </button>
                      )}
                    </div>

                    <Button type="submit" disabled={isBusy} className="w-full h-11 bg-red-600 hover:bg-red-700 text-white font-medium">
                      {uploading ? (
                        <span className="flex items-center gap-2">
                          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                          Uploading evidence...
                        </span>
                      ) : submitting ? (
                        <span className="flex items-center gap-2">
                          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                          Submitting...
                        </span>
                      ) : (
                        <span className="flex items-center gap-2"><Flag className="h-4 w-4" /> Submit Report</span>
                      )}
                    </Button>
                  </form>
                </Card>
              )}
            </div>
          </div>
        )}

        {activeTab === "history" && (
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">My Submitted Reports</h2>
            {loadingHistory ? (
              <div className="py-16 text-center text-gray-400">Loading...</div>
            ) : myReports.length === 0 ? (
              <Card className="py-16 text-center text-gray-500 border-0 shadow-sm">
                <Flag className="h-10 w-10 mx-auto mb-3 text-gray-300" />
                <p>You haven't submitted any reports yet.</p>
              </Card>
            ) : (
              <div className="space-y-3">
                {myReports.map((report) => (
                  <Card key={report._id} className="p-4 border-0 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant={STATUS_MAP[report.status].variant}>{STATUS_MAP[report.status].label}</Badge>
                          <span className="text-sm font-medium text-gray-900">
                            {REPORT_REASONS.find((r) => r.value === report.reason)?.icon}{" "}
                            {REPORT_REASONS.find((r) => r.value === report.reason)?.label}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600">
                          Seller: <span className="font-medium">{report.seller?.username || "N/A"}</span>
                          {report.product && <span className="text-gray-400"> · {report.product.title}</span>}
                        </p>
                        <p className="text-xs text-gray-400">
                          Submitted {new Date(report.createdAt).toLocaleDateString()}
                          {report.verifiedAt && <> · Reviewed {new Date(report.verifiedAt).toLocaleDateString()}</>}
                        </p>
                        {report.adminNote && (
                          <p className="text-xs text-gray-500 bg-gray-50 rounded px-2 py-1 mt-1">
                            Admin note: {report.adminNote}
                          </p>
                        )}
                      </div>
                    </div>
                    <p className="mt-2 text-sm text-gray-700 line-clamp-2">{report.description}</p>
                    {report.evidenceUrl && (
                      <a href={report.evidenceUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs text-blue-600 hover:underline">
                        <ImageIcon className="h-3.5 w-3.5" /> View Evidence
                      </a>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
