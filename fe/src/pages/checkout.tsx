import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  confirmCheckout,
  previewCheckout,
  type CheckoutConfirmPayload,
  type CheckoutPreviewPayload,
  type CheckoutPreviewResponse,
} from "@/api/checkout";
import { useCart } from "@/contexts/cart-context";

type CheckoutLocationState = {
  source?: "cart" | "buy_now";
  cartItemIds?: string[];
  items?: { productId: string; quantity: number; selectedVariants?: { name: string; value: string }[] }[];
};

const buildPayloadFromState = (
  rawState: CheckoutLocationState | null | undefined,
): CheckoutPreviewPayload => {
  const source = rawState?.source === "buy_now" ? "buy_now" : "cart";

  if (source === "buy_now") {
    return {
      source,
      items: Array.isArray(rawState?.items) ? rawState?.items : [],
    };
  }

  return {
    source,
    cartItemIds: Array.isArray(rawState?.cartItemIds)
      ? rawState?.cartItemIds
      : undefined,
  };
};

export default function CheckoutPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { refreshCart } = useCart();

  const payload = useMemo(
    () => buildPayloadFromState(location.state as CheckoutLocationState),
    [location.state],
  );

  const [preview, setPreview] = useState<CheckoutPreviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [paymentSimulation, setPaymentSimulation] = useState<"success" | "failed">(
    "success",
  );

  const loadPreview = async () => {
    try {
      setLoading(true);
      const data = await previewCheckout(payload);
      setPreview(data);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to load checkout");
      setPreview(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPreview();
  }, [payload.source, JSON.stringify(payload.cartItemIds || []), JSON.stringify(payload.items || [])]);

  const handleConfirmPayment = async () => {
    if (!preview?.canProceed) return;
    try {
      setProcessing(true);
      const requestBody: CheckoutConfirmPayload = {
        ...payload,
        paymentSimulation,
      };
      const result = await confirmCheckout(requestBody);

      if (result.paymentStatus === "paid") {
        toast.success("Thanh toán thành công. Đơn hàng đã chuyển sang paid.");
      } else {
        toast.error("Thanh toán thất bại. Đơn hàng đã ghi nhận trạng thái failed.");
      }

      await refreshCart();
      navigate(result.redirectTo || "/my-ebay/activity/purchases");
    } catch (error: any) {
      const message =
        error.response?.data?.message || "Failed to confirm payment";
      toast.error(message);

      if (Array.isArray(error.response?.data?.outOfStockItems)) {
        const firstItem = error.response.data.outOfStockItems[0];
        if (firstItem?.message) {
          toast.error(firstItem.message);
        }
      }

      await loadPreview();
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Checkout</h1>
        <Button variant="outline" onClick={() => navigate("/cart")}>
          Back to Cart
        </Button>
      </div>

      {loading ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            Loading checkout preview...
          </CardContent>
        </Card>
      ) : !preview ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            Unable to load checkout data.
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {preview.groups.length > 0 ? (
                preview.groups.map((group) => (
                  <div key={group.sellerId} className="space-y-2">
                    <p className="text-sm font-semibold text-muted-foreground">
                      Seller: {group.sellerId}
                    </p>
                    <div className="space-y-2">
                      {group.items.map((item) => (
                        <div
                          key={`${item.productId}-${item.cartItemId || "buy_now"}`}
                          className="flex items-center justify-between border rounded-md p-3"
                        >
                          <div>
                            <p className="font-medium">{item.title}</p>
                            <p className="text-sm text-muted-foreground">
                              ${item.unitPrice.toFixed(2)} x {item.quantity}
                            </p>
                            {item.selectedVariants && item.selectedVariants.length > 0 && (
                              <p className="text-xs text-muted-foreground">
                                Variant:{" "}
                                {item.selectedVariants
                                  .map((v) => `${v.name}: ${v.value}`)
                                  .join(", ")}
                              </p>
                            )}
                          </div>
                          <p className="font-semibold">${item.lineTotal.toFixed(2)}</p>
                        </div>
                      ))}
                    </div>
                    <div className="flex justify-end text-sm font-semibold">
                      Seller subtotal: ${group.subtotalAmount.toFixed(2)}
                    </div>
                    <Separator />
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground">No purchasable items.</p>
              )}

              <div className="flex items-center justify-between text-lg font-bold">
                <span>Total</span>
                <span>${preview.totals.totalAmount.toFixed(2)}</span>
              </div>
            </CardContent>
          </Card>

          {preview.outOfStockItems.length > 0 && (
            <Card className="border-red-200">
              <CardHeader>
                <CardTitle className="text-red-600">Unavailable Items</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {preview.outOfStockItems.map((item, index) => (
                  <div
                    key={`${item.productId || "unknown"}-${index}`}
                    className="border border-red-200 rounded-md px-3 py-2 bg-red-50"
                  >
                    <p className="font-medium text-red-700">{item.title}</p>
                    <p className="text-sm text-red-600">{item.message}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Payment Simulation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant={paymentSimulation === "success" ? "default" : "outline"}
                  onClick={() => setPaymentSimulation("success")}
                >
                  Simulate Success
                </Button>
                <Button
                  type="button"
                  variant={paymentSimulation === "failed" ? "destructive" : "outline"}
                  onClick={() => setPaymentSimulation("failed")}
                >
                  Simulate Failure
                </Button>
              </div>

              <Button
                className="w-full"
                onClick={handleConfirmPayment}
                disabled={processing || !preview.canProceed}
              >
                {processing ? "Processing..." : "Pay now"}
              </Button>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

