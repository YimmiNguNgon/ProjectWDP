import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { ImagePlus, X, ShieldAlert, CheckCircle2, Clock, MessageSquare, MapPin, User, PackageX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  getShipperDisputes,
  shipperRespond,
  uploadDisputeImages,
  type ShipperDisputeItem,
} from "@/api/deliveryDispute";

const STATUS_CONFIG: Record<string, { label: string; badgeClass: string; icon: React.ReactNode }> = {
  PENDING_SHIPPER: {
    label: "Awaiting Response",
    badgeClass: "bg-orange-100 text-orange-700 border-orange-200",
    icon: <Clock className="w-3 h-3" />,
  },
  SHIPPER_RESPONDED: {
    label: "Responded",
    badgeClass: "bg-blue-100 text-blue-700 border-blue-200",
    icon: <MessageSquare className="w-3 h-3" />,
  },
  CONFIRMED: {
    label: "Resolved",
    badgeClass: "bg-green-100 text-green-700 border-green-200",
    icon: <CheckCircle2 className="w-3 h-3" />,
  },
};

type FilterStatus = "all" | "PENDING_SHIPPER" | "SHIPPER_RESPONDED" | "CONFIRMED";

export default function ShipperDisputes() {
  const [disputes, setDisputes] = useState<ShipperDisputeItem[]>([]);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [loading, setLoading] = useState(true);
  const [respondingId, setRespondingId] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const fetchDisputes = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getShipperDisputes(filterStatus === "all" ? undefined : filterStatus);
      setDisputes(res.data.disputes);
    } catch {
      toast.error("Failed to load disputes");
    } finally {
      setLoading(false);
    }
  }, [filterStatus]);

  useEffect(() => {
    fetchDisputes();
  }, [fetchDisputes]);

  const openRespond = (id: string) => {
    setRespondingId(id);
    setNote("");
    setImageFiles([]);
    setImagePreviews([]);
  };

  const closeRespond = () => {
    setRespondingId(null);
    setNote("");
    setImageFiles([]);
    setImagePreviews([]);
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const combined = [...imageFiles, ...files].slice(0, 5);
    setImageFiles(combined);
    setImagePreviews(combined.map((f) => URL.createObjectURL(f)));
  };

  const removeImage = (idx: number) => {
    const newFiles = imageFiles.filter((_, i) => i !== idx);
    setImageFiles(newFiles);
    setImagePreviews(newFiles.map((f) => URL.createObjectURL(f)));
  };

  const handleSubmitRespond = async (disputeId: string) => {
    if (!note.trim()) {
      toast.error("Please enter your response");
      return;
    }
    setSubmitting(true);
    try {
      let imageUrls: string[] = [];
      if (imageFiles.length > 0) {
        imageUrls = await uploadDisputeImages(imageFiles);
      }
      await shipperRespond(disputeId, { shipperNote: note, shipperImages: imageUrls });
      toast.success("Response submitted. The buyer will be notified.");
      closeRespond();
      fetchDisputes();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to submit response");
    } finally {
      setSubmitting(false);
    }
  };

  const tabs: { label: string; value: FilterStatus; count?: number }[] = [
    { label: "All", value: "all", count: disputes.length },
    { label: "Awaiting Response", value: "PENDING_SHIPPER", count: disputes.filter(d => d.status === "PENDING_SHIPPER").length },
    { label: "Responded", value: "SHIPPER_RESPONDED", count: disputes.filter(d => d.status === "SHIPPER_RESPONDED").length },
    { label: "Resolved", value: "CONFIRMED", count: disputes.filter(d => d.status === "CONFIRMED").length },
  ];

  const pendingCount = disputes.filter((d) => d.status === "PENDING_SHIPPER").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center">
            <ShieldAlert className="w-5 h-5 text-orange-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Delivery Disputes</h1>
            <p className="text-sm text-gray-500">Respond to delivery complaints from buyers</p>
          </div>
        </div>
      </div>

      {/* Alert banner */}
      {!loading && pendingCount > 0 && (
        <div className="flex items-center gap-3 bg-orange-50 border border-orange-200 rounded-xl px-5 py-3">
          <Clock className="w-4 h-4 text-orange-600 flex-shrink-0" />
          <p className="text-sm text-orange-700 font-medium">
            You have <span className="font-bold">{pendingCount}</span> dispute{pendingCount > 1 ? "s" : ""} awaiting your response.
          </p>
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {tabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setFilterStatus(tab.value)}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-medium transition-all ${
              filterStatus === tab.value
                ? "bg-orange-600 text-white shadow-sm"
                : "bg-white text-gray-600 border border-gray-200 hover:border-orange-300 hover:text-orange-600"
            }`}
          >
            {tab.label}
            {tab.count !== undefined && tab.count > 0 && (
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold leading-none ${
                filterStatus === tab.value ? "bg-white/30 text-white" : "bg-gray-100 text-gray-500"
              }`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 p-6 animate-pulse">
              <div className="flex justify-between mb-3">
                <div className="h-4 bg-gray-100 rounded w-32" />
                <div className="h-5 bg-gray-100 rounded w-24" />
              </div>
              <div className="h-3 bg-gray-100 rounded w-48 mb-4" />
              <div className="h-16 bg-gray-100 rounded" />
            </div>
          ))}
        </div>
      ) : disputes.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 py-20 flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-2xl bg-gray-50 flex items-center justify-center mb-4">
            <PackageX className="w-8 h-8 text-gray-300" />
          </div>
          <p className="text-base font-semibold text-gray-700 mb-1">No disputes found</p>
          <p className="text-sm text-gray-400 max-w-xs">
            {filterStatus === "all"
              ? "You have no delivery disputes at this time."
              : "No disputes with this status."}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {disputes.map((dispute) => {
            const cfg = STATUS_CONFIG[dispute.status] || {
              label: dispute.status,
              badgeClass: "bg-gray-100 text-gray-600 border-gray-200",
              icon: null,
            };
            const addr = dispute.order?.shippingAddress;
            const isResponding = respondingId === dispute._id;
            const isPending = dispute.status === "PENDING_SHIPPER";

            return (
              <div
                key={dispute._id}
                className={`bg-white rounded-2xl border overflow-hidden shadow-sm transition-all ${
                  isPending ? "border-orange-200" : "border-gray-100"
                }`}
              >
                {/* Card header */}
                <div className={`flex items-center justify-between px-6 py-4 ${isPending ? "bg-orange-50/60" : "bg-gray-50/40"}`}>
                  <div>
                    <span className="font-mono text-sm font-semibold text-gray-800">
                      Order #{(dispute.order?._id || "").slice(-8).toUpperCase()}
                    </span>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Reported on {new Date(dispute.createdAt).toLocaleString("en-US")}
                    </p>
                  </div>
                  <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1 rounded-full border ${cfg.badgeClass}`}>
                    {cfg.icon}
                    {cfg.label}
                  </span>
                </div>

                <div className="px-6 py-5 space-y-4">
                  {/* Info row */}
                  <div className="flex flex-wrap gap-5 text-sm">
                    <div className="flex items-center gap-1.5 text-gray-600">
                      <User className="w-3.5 h-3.5 text-gray-400" />
                      <span className="text-xs text-gray-400">Buyer:</span>
                      <span className="font-medium text-gray-800">{dispute.buyer?.username || "—"}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-gray-600">
                      <MapPin className="w-3.5 h-3.5 text-gray-400" />
                      <span className="text-xs text-gray-400">Address:</span>
                      <span className="font-medium text-gray-800">
                        {[addr?.district, addr?.city].filter(Boolean).join(", ") || "—"}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-gray-600">
                      <span className="text-xs text-gray-400">Order value:</span>
                      <span className="font-semibold text-gray-800">${dispute.order?.totalAmount?.toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Buyer's complaint */}
                  {dispute.buyerNote && (
                    <div className="rounded-xl border border-red-100 bg-red-50 p-4">
                      <div className="flex items-center gap-1.5 mb-2">
                        <ShieldAlert className="w-3.5 h-3.5 text-red-500" />
                        <p className="text-xs font-semibold text-red-600 uppercase tracking-wide">Buyer's Complaint</p>
                      </div>
                      <p className="text-sm text-red-800 leading-relaxed">{dispute.buyerNote}</p>
                    </div>
                  )}

                  {/* Shipper's previous response */}
                  {dispute.shipperNote && dispute.status !== "PENDING_SHIPPER" && (
                    <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
                      <div className="flex items-center gap-1.5 mb-2">
                        <MessageSquare className="w-3.5 h-3.5 text-blue-500" />
                        <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide">Your Response</p>
                      </div>
                      <p className="text-sm text-blue-800 leading-relaxed">{dispute.shipperNote}</p>
                      {dispute.shipperImages?.length > 0 && (
                        <div className="flex gap-2 mt-3 flex-wrap">
                          {dispute.shipperImages.map((url, i) => (
                            <img
                              key={i}
                              src={url}
                              alt={`Evidence ${i + 1}`}
                              className="h-20 w-20 object-cover rounded-lg border border-blue-100 shadow-sm"
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Respond form */}
                  {isPending && (
                    <>
                      {!isResponding ? (
                        <Button
                          size="sm"
                          className="bg-orange-600 hover:bg-orange-700 text-white rounded-lg"
                          onClick={() => openRespond(dispute._id)}
                        >
                          <MessageSquare className="w-3.5 h-3.5 mr-1.5" />
                          Respond to Dispute
                        </Button>
                      ) : (
                        <div className="rounded-xl border border-orange-200 bg-orange-50/40 p-5 space-y-3">
                          <p className="text-sm font-semibold text-gray-700">Your response:</p>
                          <Textarea
                            placeholder="Describe the delivery situation (required)..."
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            rows={3}
                            className="bg-white resize-none text-sm"
                          />

                          {/* Image upload */}
                          <div>
                            <p className="text-xs text-gray-500 mb-2">
                              Attach evidence photos (optional, max 5):
                            </p>
                            {imagePreviews.length > 0 && (
                              <div className="flex gap-2 flex-wrap mb-2">
                                {imagePreviews.map((src, i) => (
                                  <div key={i} className="relative group">
                                    <img
                                      src={src}
                                      alt={`Preview ${i}`}
                                      className="h-[72px] w-[72px] object-cover rounded-lg border border-gray-200 shadow-sm"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => removeImage(i)}
                                      className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                      <X className="w-3 h-3" />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                            {imageFiles.length < 5 && (
                              <label className="cursor-pointer inline-flex items-center gap-1.5 text-sm text-orange-600 hover:text-orange-700 font-medium">
                                <ImagePlus className="h-4 w-4" />
                                Add photos
                                <input
                                  type="file"
                                  accept="image/*"
                                  multiple
                                  className="hidden"
                                  onChange={handleImageSelect}
                                />
                              </label>
                            )}
                          </div>

                          <div className="flex gap-2 pt-1">
                            <Button
                              size="sm"
                              className="bg-orange-600 hover:bg-orange-700 text-white rounded-lg"
                              disabled={submitting}
                              onClick={() => handleSubmitRespond(dispute._id)}
                            >
                              {submitting ? "Submitting..." : "Submit Response"}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={submitting}
                              onClick={closeRespond}
                              className="rounded-lg"
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
