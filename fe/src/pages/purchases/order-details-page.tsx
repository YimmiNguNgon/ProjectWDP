import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getOrderDetails, type Order } from "@/api/orders";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";

export default function OrderDetailsPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [groupTotal, setGroupTotal] = useState<number>(0);
  const [groupSubtotal, setGroupSubtotal] = useState<number>(0);
  const [groupShippingTotal, setGroupShippingTotal] = useState<number>(0);
  const [groupDiscount, setGroupDiscount] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  const totalAmount = groupSubtotal + groupShippingTotal - groupDiscount;

  useEffect(() => {
    if (!orderId) return;

    const fetchOrderDetails = async () => {
      try {
        setLoading(true);
        const res = await getOrderDetails(orderId);
        setOrders(res.data);

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
    { key: "ready_to_ship", label: "Ready to Ship", Icon: Package },
    { key: "shipping", label: "Shipping", Icon: Truck },
    { key: "delivered", label: "Delivered", Icon: PackageCheck },
    { key: "completed", label: "Completed", Icon: Star },
  ] as const;

  type StepKey = (typeof STATUS_STEPS)[number]["key"];

  const STATUS_RANK: Record<string, number> = {
    created: 0,
    packaging: 1,
    ready_to_ship: 2,
    shipping: 3,
    delivered: 4,
    completed: 5,
  };

  // Overall status = the minimum rank among all sub-orders (all must reach a state before the group advances)
  const overallStatus: StepKey = (() => {
    let minRank = 4;
    for (const o of orders) {
      const rank = STATUS_RANK[o.status.toLowerCase()] ?? 0;
      if (rank < minRank) minRank = rank;
    }
    return (STATUS_STEPS[minRank]?.key ?? "created") as StepKey;
  })();

  const overallRank = STATUS_RANK[overallStatus] ?? 0;

  const getStepState = (stepKey: StepKey): "done" | "active" | "pending" => {
    const rank = STATUS_RANK[stepKey] ?? 0;
    if (rank < overallRank) return "done";
    if (rank === overallRank) return "active";
    return "pending";
  };

  return (
    <div className="mx-auto px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold">Order Details</h1>
        <Button
          variant="outline"
          className="flex items-center gap-2 cursor-pointer"
          onClick={() => navigate(-1)}
        >
          <ChevronLeft className="h-4 w-4" />
          Back
        </Button>
      </div>

      <div className="bg-white rounded-xl border shadow-sm p-6 space-y-8">
        {/* ─── Status Timeline ─── */}
        <div className="pb-2">
          <p className="text-sm font-semibold text-muted-foreground mb-8">
            ORDER STATUS
          </p>
          <div className="relative flex items-start justify-between">
            {/* connecting line behind icons — top-[28px] = half of h-14 (56px) */}
            <div className="absolute top-[28px] left-8 right-8 h-0.5 bg-border z-0" />
            {STATUS_STEPS.map((step) => {
              const state = getStepState(step.key);
              const { Icon } = step;
              return (
                <div
                  key={step.key}
                  className="relative z-10 flex flex-col items-center gap-3 flex-1"
                >
                  {state === "done" ? (
                    <div className="h-14 w-14 rounded-full bg-emerald-50 border-2 border-emerald-400 flex items-center justify-center shadow-sm">
                      <Icon className="h-6 w-6 text-emerald-500" />
                    </div>
                  ) : state === "active" ? (
                    <div className="h-14 w-14 rounded-full bg-blue-50 border-2 border-blue-500 flex items-center justify-center shadow-md ring-4 ring-blue-100">
                      <Icon className="h-6 w-6 text-blue-600" />
                    </div>
                  ) : (
                    <div className="h-14 w-14 rounded-full bg-muted border border-border flex items-center justify-center">
                      <Icon className="h-6 w-6 text-muted-foreground/40" />
                    </div>
                  )}
                  <span
                    className={`text-xs font-semibold text-center leading-tight tracking-wide ${
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
        </div>

        <Separator />

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

          <div className="space-y-6">
            <div>
              <p className="text-sm font-semibold text-muted-foreground mb-2 tracking-wider">
                PAYMENT METHOD
              </p>
              <div className="flex items-center gap-2">
                <div className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-md border border-blue-100 text-sm font-semibold uppercase">
                  {baseOrder.paymentMethod || "COD"}
                </div>
                <div
                  className={`px-3 py-1.5 rounded-md border text-sm font-semibold uppercase ${
                    baseOrder.paymentStatus === "paid"
                      ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                      : baseOrder.paymentStatus === "unpaid"
                        ? "bg-amber-50 text-amber-700 border-amber-100"
                        : "bg-red-50 text-red-700 border-red-100"
                  }`}
                >
                  {baseOrder.paymentStatus === "unpaid"
                    ? "Unpaid"
                    : baseOrder.paymentStatus === "paid"
                      ? "Paid"
                      : baseOrder.paymentStatus || "Unpaid"}
                </div>
              </div>
            </div>

            {baseOrder.note && (
              <div>
                <p className="text-sm font-semibold text-muted-foreground mb-2 tracking-wider">
                  ORDER NOTE
                </p>
                <div className="p-4 bg-yellow-50/50 border border-yellow-100 rounded-lg text-sm text-yellow-800 italic">
                  "{baseOrder.note}"
                </div>
              </div>
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
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">
                    Seller: {subOrder.seller?.username}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Order ID: {subOrder._id}
                  </p>
                </div>
                <div
                  className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    STATUS_RANK[subOrder.status.toLowerCase()] === undefined
                      ? "text-gray-600 bg-gray-50"
                      : STATUS_RANK[subOrder.status.toLowerCase()] >= 3
                        ? "text-green-600 bg-green-50"
                        : STATUS_RANK[subOrder.status.toLowerCase()] >= 2
                          ? "text-blue-600 bg-blue-50"
                          : STATUS_RANK[subOrder.status.toLowerCase()] >= 1
                            ? "text-cyan-600 bg-cyan-50"
                            : "text-blue-600 bg-blue-50"
                  }`}
                >
                  {subOrder.status.toUpperCase()}
                </div>
              </div>

              <div className="space-y-4 mt-4">
                {subOrder.items.map((item, index) => (
                  <div key={`${item.productId?._id}-${index}`} className="flex flex-col gap-2">
                    <div
                      className="flex flex-col sm:flex-row gap-4 p-4 bg-muted/30 rounded-lg border-2 border-transparent hover:border-border transition-colors cursor-pointer"
                      onClick={() => navigate(`/products/${item.productId?._id}`)}
                    >
                      <div className="h-24 w-24 bg-muted rounded-md flex items-center justify-center shrink-0 overflow-hidden border">
                        {item.productId?.image || item.productId?.images?.[0] ? (
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
                    {item.note && (
                      <div className="mx-4 mb-4 mt-0 p-3 bg-yellow-50/50 border border-yellow-100 rounded-lg text-sm text-yellow-800 italic">
                        Note: "{item.note}"
                      </div>
                    )}
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
    </div>
  );
}
