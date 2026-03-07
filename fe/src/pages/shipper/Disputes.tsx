import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { ImagePlus, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  getShipperDisputes,
  shipperRespond,
  uploadDisputeImages,
  type ShipperDisputeItem,
} from "@/api/deliveryDispute";

const STATUS_LABEL: Record<string, { label: string; className: string }> = {
  PENDING_SHIPPER: { label: "Pending Response", className: "text-orange-700 border-orange-300 bg-orange-50" },
  SHIPPER_RESPONDED: { label: "Responded", className: "text-blue-700 border-blue-300 bg-blue-50" },
  CONFIRMED: { label: "Confirmed", className: "text-green-700 border-green-300 bg-green-50" },
};

type FilterStatus = "all" | "PENDING_SHIPPER" | "SHIPPER_RESPONDED" | "CONFIRMED";

export default function ShipperDisputes() {
  const [disputes, setDisputes] = useState<ShipperDisputeItem[]>([]);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [loading, setLoading] = useState(true);
  // Per-dispute respond state
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
      toast.error("Please enter a note");
      return;
    }
    setSubmitting(true);
    try {
      let imageUrls: string[] = [];
      if (imageFiles.length > 0) {
        imageUrls = await uploadDisputeImages(imageFiles);
      }
      await shipperRespond(disputeId, { shipperNote: note, shipperImages: imageUrls });
      toast.success("Response submitted. Buyer has been notified.");
      closeRespond();
      fetchDisputes();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to submit response");
    } finally {
      setSubmitting(false);
    }
  };

  const tabs: { label: string; value: FilterStatus }[] = [
    { label: "All", value: "all" },
    { label: "Pending", value: "PENDING_SHIPPER" },
    { label: "Responded", value: "SHIPPER_RESPONDED" },
    { label: "Confirmed", value: "CONFIRMED" },
  ];

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Delivery Disputes</h1>
        <span className="text-sm text-gray-500">{disputes.length} total</span>
      </div>

      <div className="flex gap-2 mb-6 flex-wrap">
        {tabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setFilterStatus(tab.value)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              filterStatus === tab.value
                ? "bg-orange-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading...</div>
      ) : disputes.length === 0 ? (
        <div className="text-center py-12 text-gray-500">No disputes found.</div>
      ) : (
        <div className="space-y-4">
          {disputes.map((dispute) => {
            const cfg = STATUS_LABEL[dispute.status] || { label: dispute.status, className: "" };
            const addr = dispute.order?.shippingAddress;
            const isResponding = respondingId === dispute._id;

            return (
              <Card key={dispute._id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-sm font-mono text-gray-600">
                        Order #{(dispute.order?._id || "").slice(-8).toUpperCase()}
                      </CardTitle>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Reported {new Date(dispute.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge variant="outline" className={`text-xs ${cfg.className}`}>
                      {cfg.label}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                    <div>
                      <p className="text-gray-500 text-xs">Buyer</p>
                      <p className="font-medium">{dispute.buyer?.username}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 text-xs">Address</p>
                      <p className="font-medium">
                        {[addr?.district, addr?.city].filter(Boolean).join(", ") || "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500 text-xs">Order Total</p>
                      <p className="font-medium">${dispute.order?.totalAmount?.toFixed(2)}</p>
                    </div>
                  </div>

                  {/* Buyer's note */}
                  {dispute.buyerNote && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm">
                      <p className="text-xs font-semibold text-red-700 mb-1">Buyer's report:</p>
                      <p className="text-red-800">{dispute.buyerNote}</p>
                    </div>
                  )}

                  {/* Shipper's previous response */}
                  {dispute.shipperNote && dispute.status !== "PENDING_SHIPPER" && (
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm">
                      <p className="text-xs font-semibold text-blue-700 mb-1">Your response:</p>
                      <p className="text-blue-800">{dispute.shipperNote}</p>
                      {dispute.shipperImages?.length > 0 && (
                        <div className="flex gap-2 mt-2 flex-wrap">
                          {dispute.shipperImages.map((url, i) => (
                            <img
                              key={i}
                              src={url}
                              alt={`Evidence ${i + 1}`}
                              className="h-16 w-16 object-cover rounded-md border"
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Respond form */}
                  {dispute.status === "PENDING_SHIPPER" && (
                    <>
                      {!isResponding ? (
                        <Button
                          size="sm"
                          className="bg-orange-600 hover:bg-orange-700 text-white"
                          onClick={() => openRespond(dispute._id)}
                        >
                          Respond to Dispute
                        </Button>
                      ) : (
                        <div className="space-y-3 border rounded-lg p-4 bg-gray-50">
                          <p className="text-sm font-semibold text-gray-700">
                            Your response to the buyer:
                          </p>
                          <Textarea
                            placeholder="Explain the delivery situation (required)..."
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            rows={3}
                          />

                          {/* Image upload */}
                          <div>
                            <p className="text-xs text-gray-500 mb-2">
                              Attach proof images (optional, max 5):
                            </p>
                            {imagePreviews.length > 0 && (
                              <div className="flex gap-2 flex-wrap mb-2">
                                {imagePreviews.map((src, i) => (
                                  <div key={i} className="relative">
                                    <img
                                      src={src}
                                      alt={`Preview ${i}`}
                                      className="h-16 w-16 object-cover rounded-md border"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => removeImage(i)}
                                      className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center"
                                    >
                                      <X className="w-2.5 h-2.5" />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                            {imageFiles.length < 5 && (
                              <label className="cursor-pointer flex items-center gap-2 text-sm text-orange-600 hover:text-orange-700">
                                <ImagePlus className="h-4 w-4" />
                                Add images
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

                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              className="bg-orange-600 hover:bg-orange-700 text-white"
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
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
