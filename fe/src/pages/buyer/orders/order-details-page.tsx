import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { getOrderDetails, cancelOrder, type Order } from "@/api/orders";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  ChevronLeft,
  ShoppingBag,
  Settings2,
  Truck,
  PackageCheck,
  Star,
  Package,
  CheckCircle2,
  AlertTriangle,
  MessageSquare,
  XCircle,
  Flag,
  ShieldAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  getDisputeByOrder,
  confirmReceived,
  reportNotReceived,
  buyerConfirmAfterDispute,
  buyerReportToAdmin,
  type DeliveryDispute,
} from "@/api/deliveryDispute";

export default function OrderDetailsPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [groupTotal, setGroupTotal] = useState<number>(0);
  const [groupSubtotal, setGroupSubtotal] = useState<number>(0);
  const [groupShippingTotal, setGroupShippingTotal] = useState<number>(0);
  const [groupDiscount, setGroupDiscount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  // Delivery confirmation state (per sub-order)
  const [disputes, setDisputes] = useState<
    Record<string, DeliveryDispute | null>
  >({});
  const [reportNote, setReportNote] = useState<Record<string, string>>({});
  const [showReportForm, setShowReportForm] = useState<Record<string, boolean>>(
    {},
  );
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Cancel order dialog state
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [subOrderIdToCancel, setSubOrderIdToCancel] = useState<string | null>(
    null,
  );
  const cancelReasons = [
    "changed_mind",
    "ordered_by_mistake",
    "wrong_quantity",
    "found_better_price",
    "payment_issue",
    "delivery_too_long",
    "seller_not_responding",
    "want_change_address",
    "want_change_product",
    "other",
  ];
  const [cancelReason, setCancelReason] = useState<string>("");
  const [cancelOtherText, setCancelOtherText] = useState<string>("");

  const totalAmount = groupSubtotal + groupShippingTotal - groupDiscount;

  useEffect(() => {
    if (!orderId) return;

    const fetchOrderDetails = async () => {
      try {
        setLoading(true);
        const res = await getOrderDetails(orderId, { role: "buyer" });
        setOrders(res.data);

        // Fetch disputes for delivered/completed sub-orders
        const deliveredOrders = res.data.filter(
          (o) => o.status === "delivered" || o.status === "completed",
        );
        const disputeResults = await Promise.allSettled(
          deliveredOrders.map((o) =>
            getDisputeByOrder(o._id).then((r) => ({
              id: o._id,
              dispute: r.data.dispute,
            })),
          ),
        );
        const disputeMap: Record<string, DeliveryDispute | null> = {};
        disputeResults.forEach((r) => {
          if (r.status === "fulfilled") {
            disputeMap[r.value.id] = r.value.dispute;
          }
        });
        setDisputes(disputeMap);

        // Calculate group totals properly
        let subtotal = 0;
        let discountTotal = 0;

        for (const order of res.data) {
          subtotal += order.subtotalAmount || order.totalAmount || 0;
          discountTotal +=
            order.discountAmount || order.voucher?.discountAmount || 0;
        }

        const shippingPrice = res.shippingPrice || 0;
        const totalAmount =
          res.groupTotal || subtotal + shippingPrice - discountTotal;

        setGroupSubtotal(subtotal);
        setGroupShippingTotal(shippingPrice);
        setGroupDiscount(discountTotal);
        setGroupTotal(totalAmount);
      } catch (err) {
        console.error("Failed to fetch order details", err);
        toast.error("Failed to load order details");
      } finally {
        setLoading(false);
      }
    };

    fetchOrderDetails();
  }, [orderId]);

  const handleConfirmReceived = async (subOrderId: string) => {
    setActionLoading(subOrderId + "_confirm");
    try {
      await confirmReceived(subOrderId);
      toast.success("Order confirmed as received! You can now leave a review.");
      setOrders((prev) =>
        prev.map((o) =>
          o._id === subOrderId ? { ...o, status: "completed" } : o,
        ),
      );
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to confirm");
    } finally {
      setActionLoading(null);
    }
  };

  const handleReportNotReceived = async (
    subOrderId: string,
    skipToAdmin = false,
  ) => {
    setActionLoading(subOrderId + (skipToAdmin ? "_reportAdmin" : "_report"));
    try {
      const res = await reportNotReceived(
        subOrderId,
        reportNote[subOrderId] || "",
        skipToAdmin,
      );
      toast.info(
        skipToAdmin
          ? "Report sent to admin. We will review and contact you shortly."
          : "Report submitted. The shipper will be notified.",
      );
      setDisputes((prev) => ({ ...prev, [subOrderId]: res.data.dispute }));
      setShowReportForm((prev) => ({ ...prev, [subOrderId]: false }));
    } catch (err: any) {
      const msg = err?.response?.data?.message || "Failed to submit report";
      if (err?.response?.status === 409 && err?.response?.data?.data) {
        setDisputes((prev) => ({
          ...prev,
          [subOrderId]: err.response.data.data,
        }));
      }
      toast.error(msg);
    } finally {
      setActionLoading(null);
    }
  };

  const handleConfirmAfterDispute = async (
    subOrderId: string,
    disputeId: string,
  ) => {
    setActionLoading(subOrderId + "_disputeConfirm");
    try {
      await buyerConfirmAfterDispute(disputeId);
      toast.success("Confirmed! Order is now completed.");
      setOrders((prev) =>
        prev.map((o) =>
          o._id === subOrderId ? { ...o, status: "completed" } : o,
        ),
      );
      setDisputes((prev) => ({
        ...prev,
        [subOrderId]: prev[subOrderId]
          ? { ...prev[subOrderId]!, status: "CONFIRMED" }
          : null,
      }));
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to confirm");
    } finally {
      setActionLoading(null);
    }
  };

  const handleReportToAdmin = async (subOrderId: string, disputeId: string) => {
    setActionLoading(subOrderId + "_reportAdmin");
    try {
      await buyerReportToAdmin(disputeId);
      toast.info(
        "Your report has been sent to admin. We will review and contact you shortly.",
      );
      setDisputes((prev) => ({
        ...prev,
        [subOrderId]: prev[subOrderId]
          ? { ...prev[subOrderId]!, status: "REPORTED_TO_ADMIN" }
          : null,
      }));
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to report to admin");
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancelOrder = async () => {
    if (!subOrderIdToCancel) return;
    if (!cancelReason) {
      toast.error("Please select a reason for cancellation");
      return;
    }
    if (cancelReason === "other" && !cancelOtherText.trim()) {
      toast.error("Please provide details for 'Other' reason");
      return;
    }
    setActionLoading(subOrderIdToCancel + "_cancel");
    try {
      const res = await cancelOrder(
        subOrderIdToCancel,
        cancelReason,
        cancelReason === "other" ? cancelOtherText.trim() : undefined,
      );
      toast.success(
        res.data.status === "cancel_requested"
          ? "Cancellation request sent to seller."
          : "Order cancelled successfully.",
      );
      setOrders((prev) =>
        prev.map((o) =>
          o._id === subOrderIdToCancel ? { ...o, status: res.data.status } : o,
        ),
      );
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to cancel order");
    } finally {
      setActionLoading(null);
      setCancelDialogOpen(false);
      setSubOrderIdToCancel(null);
      setCancelReason("");
      setCancelOtherText("");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-muted-foreground">Loading order details...</p>
      </div>
    );
  }

  if (!orders || orders.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-muted-foreground">Order not found.</p>
      </div>
    );
  }

  // Nếu là group order, lấy thông tin chung từ đơn hàng đầu tiên (vì buyer giống nhau)
  const baseOrder = orders[0];

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Asia/Ho_Chi_Minh",
    });

  // ─── Status timeline logic ───
  const STATUS_STEPS = [
    { key: "created", label: "Order Placed", Icon: ShoppingBag },
    { key: "packaging", label: "Packaging", Icon: Settings2 },
    { key: "ready_to_ship", label: "Waiting", Icon: Package },
    { key: "shipping", label: "Shipping", Icon: Truck },
    { key: "delivered", label: "Delivered", Icon: PackageCheck },
    { key: "completed", label: "Completed", Icon: Star },
  ] as const;

  type StepKey = (typeof STATUS_STEPS)[number]["key"];

  const STATUS_RANK: Record<string, number> = {
    created: 0,
    cancelled: 0,
    cancel_requested: 1,
    failed: 0,
    packaging: 1,
    ready_to_ship: 2,
    pending_acceptance: 2,
    shipping: 3,
    delivered: 4,
    completed: 5,
    waiting_return_shipment: 5,
    return_shipping: 5,
    delivered_to_seller: 5,
    returned: 5,
  };

  const getStepState = (stepKey: StepKey, currentStatus: string): "done" | "active" | "pending" => {
    const currentRank = STATUS_RANK[currentStatus.toLowerCase()] ?? 0;
    const stepRank = STATUS_RANK[stepKey] ?? 0;
    if (stepRank < currentRank) return "done";
    if (stepRank === currentRank) return "active";
    return "pending";
  };

  return (
    <div className="mx-auto px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold">Order Details</h1>
        <Button
          variant="outline"
          className="flex items-center gap-2 cursor-pointer"
          onClick={() => navigate("/my-ebay/activity/purchases")}
        >
          <ChevronLeft className="h-4 w-4" />
          Back
        </Button>
      </div>

      <div className="bg-white rounded-xl border shadow-sm p-6 space-y-8">

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <p className="text-sm font-semibold text-muted-foreground mb-1">
              ORDER DATE
            </p>
            <p className="font-medium">{formatDate(baseOrder.createdAt)}</p>
          </div>
          <div>
            <p className="text-sm font-semibold text-muted-foreground mb-1">
              TOTAL AMOUNT
            </p>
            <p className="text-2xl font-bold">${totalAmount.toFixed(2)}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <p className="text-sm font-semibold text-muted-foreground mb-3 tracking-wider">
              SHIPPING ADDRESS
            </p>
            {baseOrder.shippingAddress ? (
              <div className="space-y-1 text-sm bg-muted/20 p-4 rounded-lg border border-border">
                <p className="font-bold text-base">
                  {baseOrder.shippingAddress.fullName}
                </p>
                <p className="text-muted-foreground">
                  {baseOrder.shippingAddress.phone}
                </p>
                <p className="mt-2 text-foreground/80 leading-relaxed">
                  {baseOrder.shippingAddress.detail &&
                    `${baseOrder.shippingAddress.detail}, `}
                  {baseOrder.shippingAddress.street &&
                    `${baseOrder.shippingAddress.street}, `}
                  {baseOrder.shippingAddress.ward &&
                    `${baseOrder.shippingAddress.ward}, `}
                  {baseOrder.shippingAddress.district &&
                    `${baseOrder.shippingAddress.district}, `}
                  {baseOrder.shippingAddress.city}
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic">
                No shipping address provided
              </p>
            )}
          </div>

        </div>

        <Separator />

        <div>
          <p className="text-sm font-semibold text-muted-foreground mb-1">
            BUYER
          </p>
          <div className="flex items-center gap-2">
            <span className="font-medium text-lg">
              {baseOrder.customer?.username}
            </span>
          </div>
          <p className="text-sm text-muted-foreground tracking-tighter mt-1">
            Email: ({baseOrder.customer?.email})
          </p>
        </div>

        <Separator />

        <div className="space-y-6">
          <p className="text-lg font-bold">Sub-orders</p>
          {orders.map((subOrder) => (
            <div key={subOrder._id} className="border rounded-lg p-4 space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-base font-bold text-blue-600 underline cursor-pointer">
                    Seller: {subOrder.seller?.username}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Order ID: {subOrder._id}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <div className="flex gap-2">
                    <div className="px-3 py-1 rounded-full text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 uppercase whitespace-nowrap">
                      {subOrder.paymentMethod || "COD"}
                    </div>
                    <div
                      className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap ${
                        subOrder.paymentStatus === "paid"
                          ? "text-emerald-700 bg-emerald-50 border border-emerald-200"
                          : subOrder.paymentStatus === "unpaid"
                            ? "text-amber-700 bg-amber-50 border border-amber-200"
                            : "text-red-700 bg-red-50 border border-red-200"
                      }`}
                    >
                      {subOrder.paymentStatus === "unpaid"
                        ? "UNPAID"
                        : subOrder.paymentStatus === "paid"
                          ? "PAID"
                          : (subOrder.paymentStatus || "UNPAID").toUpperCase()}
                    </div>
                  </div>
                  <div
                    className={`px-4 py-1.5 rounded-full text-sm font-bold border ${
                      STATUS_RANK[subOrder.status.toLowerCase()] === undefined
                        ? "text-gray-700 bg-gray-50 border-gray-200"
                        : STATUS_RANK[subOrder.status.toLowerCase()] >= 3
                          ? "text-green-700 bg-green-50 border-green-200"
                          : STATUS_RANK[subOrder.status.toLowerCase()] >= 2
                            ? "text-blue-700 bg-blue-50 border-blue-200"
                            : STATUS_RANK[subOrder.status.toLowerCase()] >= 1
                              ? "text-cyan-700 bg-cyan-50 border-cyan-200"
                              : subOrder.status.toLowerCase() === "cancelled" ||
                                  subOrder.status.toLowerCase() === "failed"
                                ? "text-red-700 bg-red-50 border-red-200"
                                : subOrder.status.toLowerCase() ===
                                    "cancel_requested"
                                  ? "text-amber-700 bg-amber-50 border-amber-200"
                                  : [
                                        "waiting_return_shipment",
                                        "return_shipping",
                                        "delivered_to_seller",
                                        "returned",
                                      ].includes(subOrder.status.toLowerCase())
                                    ? "text-orange-700 bg-orange-50 border-orange-200"
                                    : "text-blue-700 bg-blue-50 border-blue-200"
                    }`}
                  >
                    {subOrder.status.toUpperCase().replace(/_/g, " ")}
                  </div>
                </div>
              </div>

              {/* ─── Status Timeline per Sub-order ─── */}
              <div className="pt-2 pb-6 border-b">
                {[
                  "waiting_return_shipment",
                  "return_shipping",
                  "delivered_to_seller",
                  "returned",
                ].includes(subOrder.status.toLowerCase()) ? (
                  <div className="flex items-center gap-4 p-4 bg-orange-50 border border-orange-200 rounded-xl">
                    <div className="h-10 w-10 rounded-full bg-orange-100 border-2 border-orange-500 flex items-center justify-center shadow-md shrink-0">
                      <Truck className="h-5 w-5 text-orange-600" />
                    </div>
                    <div>
                      <p className="font-bold text-orange-700 text-sm">
                        {subOrder.status === "returned"
                          ? "Order Returned"
                          : "Return in Progress"}
                      </p>
                      <p className="text-xs text-orange-600 mt-0.5">
                        {subOrder.status === "returned"
                          ? "This order has been returned and refunded."
                          : "This order is currently being returned to the seller."}
                      </p>
                    </div>
                  </div>
                ) : subOrder.status === "cancelled" ||
                  subOrder.status === "failed" ? (
                  <div className="flex items-center gap-4 p-4 bg-red-50 border border-red-200 rounded-xl">
                    <div className="h-10 w-10 rounded-full bg-red-100 border-2 border-red-500 flex items-center justify-center shadow-md shrink-0">
                      <XCircle className="h-5 w-5 text-red-600" />
                    </div>
                    <div>
                      <p className="font-bold text-red-700 text-sm">
                        Order{" "}
                        {subOrder.status === "failed" ? "Failed" : "Cancelled"}
                      </p>
                      <p className="text-xs text-red-500 mt-0.5">
                        {subOrder.status === "failed"
                          ? "This order could not be processed."
                          : "This order was cancelled. Any payment will be refunded."}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="relative flex items-start justify-between">
                    <div className="absolute top-[20px] left-6 right-6 h-0.5 bg-border z-0" />
                    {STATUS_STEPS.map((step) => {
                      const state = getStepState(step.key, subOrder.status);
                      const { Icon } = step;
                      return (
                        <div
                          key={step.key}
                          className="relative z-10 flex flex-col items-center gap-2 flex-1"
                        >
                          {state === "done" ? (
                            <div className="h-10 w-10 rounded-full bg-emerald-50 border-2 border-emerald-400 flex items-center justify-center shadow-sm">
                              <Icon className="h-5 w-5 text-emerald-500" />
                            </div>
                          ) : state === "active" ? (
                            <div className="h-10 w-10 rounded-full bg-blue-50 border-2 border-blue-500 flex items-center justify-center shadow-md ring-4 ring-blue-100">
                              <Icon className="h-5 w-5 text-blue-600" />
                            </div>
                          ) : (
                            <div className="h-10 w-10 rounded-full bg-muted border border-border flex items-center justify-center">
                              <Icon className="h-5 w-5 text-muted-foreground/40" />
                            </div>
                          )}
                          <span
                            className={`text-[10px] sm:text-xs font-semibold text-center leading-tight tracking-wide ${
                              state === "done"
                                ? "text-emerald-600"
                                : state === "active"
                                  ? "text-blue-600"
                                  : "text-muted-foreground/50"
                            }`}
                          >
                            {step.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {(() => {
                const history = subOrder.statusHistory || [];
                // Find the latest cancel_requested index
                const cancelRequestedIndex = [...history]
                  .reverse()
                  .findIndex((h) => h.status === "cancel_requested");

                let resolutionType: "approve" | "reject" | "direct" | null =
                  null;
                let resolutionNote = "";

                if (cancelRequestedIndex !== -1) {
                  const actualIndex = history.length - 1 - cancelRequestedIndex;
                  const nextEntry = history[actualIndex + 1];
                  if (nextEntry) {
                    if (nextEntry.status === "cancelled") {
                      resolutionType = "approve";
                      resolutionNote = nextEntry.note || "";
                    } else if (nextEntry.status === "packaging") {
                      resolutionType = "reject";
                      resolutionNote = nextEntry.note || "";
                    }
                  }
                }

                // If not a resolution, check for direct cancellation (from 'created')
                if (!resolutionType) {
                  const cancelEntry = history.find(
                    (h) => h.status === "cancelled" && h.note && h.note.trim(),
                  );
                  if (cancelEntry) {
                    resolutionType = "direct";
                    resolutionNote = cancelEntry.note || "";
                  }
                }

                const buyerNote = subOrder.note;

                return (
                  <>
                    {buyerNote && (
                      <div className="mb-4 mt-0 p-3 bg-yellow-50/50 border border-yellow-100 rounded-lg text-sm text-yellow-800 italic">
                        Note: "{buyerNote}"
                      </div>
                    )}
                    {resolutionType && resolutionNote && (
                      <div
                        className={`mb-4 mt-0 p-3 border rounded-lg text-sm italic ${
                          resolutionType === "reject"
                            ? "bg-amber-50/50 border-amber-100 text-amber-800"
                            : resolutionType === "approve"
                              ? "bg-green-50/50 border-green-100 text-green-800"
                              : "bg-red-50/50 border-red-100 text-red-800"
                        }`}
                      >
                        <strong>
                          {resolutionType === "approve"
                            ? "Approve Note:"
                            : resolutionType === "reject"
                              ? "Reject Note:"
                              : "Cancellation reason:"}
                        </strong>{" "}
                        "{resolutionNote}"
                      </div>
                    )}
                  </>
                );
              })()}
              <div className="space-y-4 mt-4">
                {subOrder.items.map((item, index) => (
                  <div
                    key={`${item.productId?._id}-${index}`}
                    className="flex flex-col gap-2"
                  >
                    <div
                      className="flex flex-col sm:flex-row gap-4 p-4 bg-muted/30 rounded-lg border-2 border-transparent hover:border-border transition-colors cursor-pointer"
                      onClick={() =>
                        navigate(`/products/${item.productId?._id}`)
                      }
                    >
                      <div className="h-24 w-24 bg-muted rounded-md flex items-center justify-center shrink-0 overflow-hidden border">
                        {item.productId?.image ||
                        item.productId?.images?.[0] ? (
                          <img
                            src={
                              item.productId.image || item.productId.images?.[0]
                            }
                            alt={item.title}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            No image
                          </span>
                        )}
                      </div>
                      <div className="flex-1 space-y-1">
                        <p className="font-medium text-lg leading-tight hover:underline">
                          {item.productId?.title || item.title}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Quantity: {item.quantity}
                        </p>
                        <p className="text-sm font-semibold mt-1">
                          ${item.unitPrice.toFixed(2)} x {item.quantity} = $
                          {(item.unitPrice * item.quantity).toFixed(2)}
                        </p>
                        {item.selectedVariants &&
                          item.selectedVariants.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-2">
                              {item.selectedVariants.map((v) => (
                                <span
                                  key={`${v.name}-${v.value}`}
                                  className="px-2 py-1 bg-white border rounded text-xs text-muted-foreground"
                                >
                                  <span className="font-medium text-foreground mr-1">
                                    {v.name}:
                                  </span>
                                  {v.value}
                                </span>
                              ))}
                            </div>
                          )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="bg-muted/10 p-4 rounded-lg border mt-4 text-sm space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-medium">
                    $
                    {(subOrder.subtotalAmount ?? subOrder.totalAmount).toFixed(
                      2,
                    )}
                  </span>
                </div>
                {Number(
                  subOrder.discountAmount ?? subOrder.voucher?.discountAmount,
                ) > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Voucher Discount
                    </span>
                    <span className="text-emerald-600 font-medium">
                      -$
                      {(
                        subOrder.discountAmount ??
                        subOrder.voucher?.discountAmount ??
                        0
                      ).toFixed(2)}
                    </span>
                  </div>
                )}
                {/* Shipping removed from sub-orders as it is now at the group level */}
                <Separator className="my-2" />
                <div className="flex justify-between text-base font-bold">
                  <span>Seller Total</span>
                  <span>${subOrder.totalAmount.toFixed(2)}</span>
                </div>
              </div>

              {/* ─── Delivery Confirmation Actions ─── */}
              <div className="mt-4 flex flex-wrap gap-2">
                {["shipping", "delivered", "completed"].includes(
                  subOrder.status.toLowerCase(),
                ) && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-amber-600 border-amber-200 hover:bg-amber-50 hover:text-amber-700 h-9"
                    onClick={() =>
                      navigate(`/purchases/${subOrder._id}/complaint`)
                    }
                  >
                    <ShieldAlert className="h-4 w-4 mr-1.5" />
                    Report an issue / Complaint
                  </Button>
                )}
              </div>

              {subOrder.status === "delivered" &&
                (() => {
                  const dispute = disputes[subOrder._id];

                  // Dispute đã CONFIRMED: hoàn tất
                  if (dispute?.status === "CONFIRMED") {
                    return (
                      <div className="mt-4 p-3 bg-gray-50 border rounded-lg text-sm text-gray-600">
                        You have confirmed receipt of this order.
                      </div>
                    );
                  }

                  // Đã báo cáo admin, admin chưa phản hồi
                  if (
                    dispute?.status === "REPORTED_TO_ADMIN" &&
                    !dispute.adminNotifiedAt
                  ) {
                    return (
                      <div className="mt-4 p-3 bg-purple-50 border border-purple-200 rounded-lg text-sm text-purple-700">
                        <AlertTriangle className="h-4 w-4 inline mr-1" />
                        Your report has been sent to admin. Please wait for
                        their response.
                      </div>
                    );
                  }

                  // Admin đã phản hồi → buyer xác nhận nhận hàng
                  if (
                    dispute?.status === "REPORTED_TO_ADMIN" &&
                    dispute.adminNotifiedAt
                  ) {
                    return (
                      <div className="mt-4 p-4 border border-purple-200 bg-purple-50 rounded-lg space-y-3">
                        <p className="text-sm font-semibold text-purple-800">
                          Admin responded to your report:
                        </p>
                        <p className="text-sm text-purple-700">
                          {dispute.adminNote}
                        </p>
                        <p className="text-xs text-purple-500">
                          {new Date(dispute.adminNotifiedAt).toLocaleString()}
                        </p>
                        <Button
                          size="sm"
                          className="bg-emerald-600 hover:bg-emerald-700 text-white"
                          disabled={!!actionLoading}
                          onClick={() =>
                            handleConfirmAfterDispute(subOrder._id, dispute._id)
                          }
                        >
                          <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                          {actionLoading === subOrder._id + "_disputeConfirm"
                            ? "..."
                            : "I have received my order"}
                        </Button>
                      </div>
                    );
                  }

                  // Shipper đã phản hồi: buyer xác nhận hoặc report lên admin
                  if (dispute?.status === "SHIPPER_RESPONDED") {
                    return (
                      <div className="mt-4 p-4 border border-blue-200 bg-blue-50 rounded-lg space-y-3">
                        <p className="text-sm font-semibold text-blue-800">
                          Shipper responded to your report:
                        </p>
                        <p className="text-sm text-blue-700">
                          {dispute.shipperNote}
                        </p>
                        {dispute.shipperImages?.length > 0 && (
                          <div className="flex gap-2 flex-wrap">
                            {dispute.shipperImages.map((url, i) => (
                              <img
                                key={i}
                                src={url}
                                alt={`Evidence ${i + 1}`}
                                className="h-20 w-20 object-cover rounded-md border border-blue-200"
                              />
                            ))}
                          </div>
                        )}
                        <p className="text-xs text-blue-600">
                          If you have received your order, confirm below.
                          Otherwise, report to admin for further assistance.
                        </p>
                        <div className="flex gap-2 flex-wrap">
                          <Button
                            size="sm"
                            className="bg-emerald-600 hover:bg-emerald-700 text-white"
                            disabled={!!actionLoading}
                            onClick={() =>
                              handleConfirmAfterDispute(
                                subOrder._id,
                                dispute._id,
                              )
                            }
                          >
                            <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                            {actionLoading === subOrder._id + "_disputeConfirm"
                              ? "..."
                              : "I received it"}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-red-300 text-red-600 hover:bg-red-50"
                            disabled={!!actionLoading}
                            onClick={() =>
                              handleReportToAdmin(subOrder._id, dispute._id)
                            }
                          >
                            <AlertTriangle className="h-3.5 w-3.5 mr-1" />
                            {actionLoading === subOrder._id + "_reportAdmin"
                              ? "..."
                              : "Still not received — Report to Admin"}
                          </Button>
                        </div>
                      </div>
                    );
                  }

                  // Dispute đang chờ shipper phản hồi
                  if (dispute?.status === "PENDING_SHIPPER") {
                    return (
                      <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg space-y-3">
                        <p className="text-sm text-amber-700">
                          <MessageSquare className="h-4 w-4 inline mr-1" />
                          Your non-receipt report has been sent to the shipper.
                          Waiting for their response...
                        </p>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-red-300 text-red-600 hover:bg-red-50"
                          disabled={!!actionLoading}
                          onClick={() =>
                            handleReportToAdmin(subOrder._id, dispute._id)
                          }
                        >
                          <AlertTriangle className="h-3.5 w-3.5 mr-1" />
                          {actionLoading === subOrder._id + "_reportAdmin"
                            ? "..."
                            : "Skip shipper — Report to Admin"}
                        </Button>
                      </div>
                    );
                  }

                  // Chưa có dispute: show Confirm or Report buttons
                  return (
                    <div className="mt-4 space-y-3">
                      <p className="text-sm font-medium text-gray-700">
                        Have you received this order?
                      </p>
                      <div className="flex gap-2 flex-wrap">
                        <Button
                          size="sm"
                          className="bg-emerald-600 hover:bg-emerald-700 text-white"
                          disabled={!!actionLoading}
                          onClick={() => handleConfirmReceived(subOrder._id)}
                        >
                          <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                          {actionLoading === subOrder._id + "_confirm"
                            ? "..."
                            : "Yes, I received it"}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-red-300 text-red-600 hover:bg-red-50"
                          disabled={!!actionLoading}
                          onClick={() =>
                            setShowReportForm((prev) => ({
                              ...prev,
                              [subOrder._id]: !prev[subOrder._id],
                            }))
                          }
                        >
                          <AlertTriangle className="h-3.5 w-3.5 mr-1" />
                          No, I didn't receive it
                        </Button>
                      </div>

                      {showReportForm[subOrder._id] && (
                        <div className="p-4 border border-red-200 bg-red-50 rounded-lg space-y-3">
                          <p className="text-sm font-semibold text-red-700">
                            Describe the issue:
                          </p>
                          <Textarea
                            placeholder="Describe the issue (optional)..."
                            value={reportNote[subOrder._id] || ""}
                            onChange={(e) =>
                              setReportNote((prev) => ({
                                ...prev,
                                [subOrder._id]: e.target.value,
                              }))
                            }
                            rows={2}
                          />
                          <div className="flex gap-2 flex-wrap">
                            <Button
                              size="sm"
                              className="bg-red-600 hover:bg-red-700 text-white"
                              disabled={!!actionLoading}
                              onClick={() =>
                                handleReportNotReceived(subOrder._id, false)
                              }
                            >
                              {actionLoading === subOrder._id + "_report"
                                ? "Submitting..."
                                : "Report to Shipper"}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={!!actionLoading}
                              onClick={() =>
                                setShowReportForm((prev) => ({
                                  ...prev,
                                  [subOrder._id]: false,
                                }))
                              }
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}

              {/* ─── Cancel Order (buyer, early statuses only) ─── */}
              {subOrder.status === "created" && (
                <div className="mt-4">
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-red-300 text-red-600 hover:bg-red-50 hover:text-red-600 cursor-pointer"
                    disabled={!!actionLoading}
                    onClick={() => {
                      setSubOrderIdToCancel(subOrder._id);
                      setCancelReason("");
                      setCancelOtherText("");
                      setCancelDialogOpen(true);
                    }}
                  >
                    <XCircle className="h-3.5 w-3.5 mr-1" />
                    {actionLoading === subOrder._id + "_cancel"
                      ? "Cancelling..."
                      : "Cancel Order"}
                  </Button>
                </div>
              )}

              {subOrder.status === "packaging" && (
                <div className="mt-4">
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-amber-300 text-amber-600 hover:bg-amber-50 hover:text-amber-600 cursor-pointer"
                    disabled={!!actionLoading}
                    onClick={() => {
                      setSubOrderIdToCancel(subOrder._id);
                      setCancelReason("");
                      setCancelOtherText("");
                      setCancelDialogOpen(true);
                    }}
                  >
                    <XCircle className="h-3.5 w-3.5 mr-1" />
                    {actionLoading === subOrder._id + "_cancel"
                      ? "Requesting..."
                      : "Request Cancellation"}
                  </Button>
                </div>
              )}

              {subOrder.status === "cancel_requested" && (
                <div className="mt-4">
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-gray-300 text-gray-500 bg-gray-50"
                    disabled={true}
                  >
                    <XCircle className="h-3.5 w-3.5 mr-1" />
                    Cancellation Pending
                  </Button>
                </div>
              )}

              {/* ─── Post-completion actions ─── */}
              {subOrder.status === "completed" && (
                <div className="mt-4 flex gap-3 flex-wrap">
                  {subOrder.items.map((item) => (
                    <Link
                      key={item.productId?._id}
                      to={`/purchases/${subOrder._id}/feedback/${item.productId?._id}`}
                      className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:underline"
                    >
                      <Star className="h-3.5 w-3.5" />
                      Leave a review
                    </Link>
                  ))}
                  <Link
                    to={`/purchases/${subOrder._id}/return`}
                    className="inline-flex items-center gap-1.5 text-sm text-orange-600 hover:underline"
                  >
                    Request Return/Refund
                  </Link>
                  {subOrder.seller?._id && (
                    <Link
                      to={`/report?sellerId=${subOrder.seller._id}&orderId=${subOrder._id}`}
                      className="inline-flex items-center gap-1.5 text-sm text-red-500 hover:underline"
                    >
                      <Flag className="h-3.5 w-3.5" />
                      Report Seller
                    </Link>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* ─── Global Order Summary ─── */}
        <div className="bg-muted/30 rounded-xl p-6 space-y-3 border-2 border-dashed">
          <p className="text-lg font-bold mb-2">Order Summary</p>
          <div className="flex justify-between text-md">
            <span className="text-muted-foreground">Items Subtotal</span>
            <span>${groupSubtotal.toFixed(2)}</span>
          </div>
          {groupDiscount > 0 && (
            <div className="flex justify-between text-md">
              <span className="text-muted-foreground">Total Discount</span>
              <span className="text-emerald-600 font-medium">
                -${groupDiscount.toFixed(2)}
              </span>
            </div>
          )}
          <div className="flex justify-between text-md">
            <span className="text-muted-foreground">Shipping Fee</span>
            <span>
              {groupShippingTotal > 0
                ? `$${groupShippingTotal.toFixed(2)}`
                : "FREE"}
            </span>
          </div>
          <Separator className="my-2" />
          <div className="flex justify-between text-xl font-bold text-blue-600">
            <span>Order Total</span>
            <span>${groupTotal.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Cancel Order Confirmation Dialog */}
      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Order</AlertDialogTitle>
            <AlertDialogDescription>
              Please select a reason for cancelling the order. This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="mt-2 space-y-2">
            {cancelReasons.map((r) => (
              <label key={r} className="flex items-center gap-2">
                <input
                  type="radio"
                  name="cancelReason"
                  value={r}
                  checked={cancelReason === r}
                  onChange={() => setCancelReason(r)}
                />
                <span className="text-sm capitalize">
                  {r.replace(/_/g, " ")}
                </span>
              </label>
            ))}
            {cancelReason === "other" && (
              <Textarea
                value={cancelOtherText}
                onChange={(e) => setCancelOtherText(e.target.value)}
                placeholder="Please specify the reason"
                rows={3}
              />
            )}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel
              className="cursor-pointer"
              onClick={() => {
                setCancelDialogOpen(false);
                setSubOrderIdToCancel(null);
                setCancelReason("");
                setCancelOtherText("");
              }}
            >
              Keep Order
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 cursor-pointer hover:bg-red-700 text-white"
              onClick={handleCancelOrder}
              disabled={
                actionLoading === subOrderIdToCancel + "_cancel" ||
                !cancelReason
              }
            >
              {actionLoading === subOrderIdToCancel + "_cancel"
                ? "Cancelling..."
                : "Confirm Cancel"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
