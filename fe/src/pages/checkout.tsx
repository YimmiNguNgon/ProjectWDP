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
  type CheckoutGroup,
  type CheckoutGroupItem,
  type CheckoutUnavailableItem,
} from "@/api/checkout";
import { useCart } from "@/contexts/cart-context";
import { getAddresses, type Address } from "@/api/user";
import { useAuth } from "@/hooks/use-auth";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MapPin, Truck, CreditCard, ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  validateVoucher,
  type VoucherValidationResponse,
} from "@/api/vouchers";

type CheckoutLocationState = {
  source?: "cart" | "buy_now";
  cartItemIds?: string[];
  items?: {
    productId: string;
    quantity: number;
    selectedVariants?: { name: string; value: string }[];
  }[];
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
  const { user } = useAuth();

  const payload = useMemo(
    () => buildPayloadFromState(location.state as CheckoutLocationState),
    [location.state],
  );

  const [preview, setPreview] = useState<CheckoutPreviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string>("");
  const [shippingMethod, setShippingMethod] = useState<string>("standard");
  const [paymentMethod, setPaymentMethod] = useState<string>("cod");
  const [orderNote, setOrderNote] = useState<string>("");
  const [voucherCode, setVoucherCode] = useState<string>("");

  const [appliedVoucher, setAppliedVoucher] =
    useState<VoucherValidationResponse | null>(null);
  const [applyingVoucher, setApplyingVoucher] = useState(false);

  const loadPreview = async () => {
    try {
      setLoading(true);
      const data = await previewCheckout({
        ...payload,
        voucherCode: voucherCode || undefined,
      });
      setPreview(data);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to load checkout");
      setPreview(null);
    } finally {
      setLoading(false);
    }
  };

  const loadAddresses = async () => {
    try {
      const res = await getAddresses();
      setAddresses(res.data || []);
      const defaultAddr = res.data?.find((a: Address) => a.isDefault);
      if (defaultAddr) setSelectedAddressId(defaultAddr._id);
      else if (res.data?.length > 0) setSelectedAddressId(res.data[0]._id);
    } catch (err) {
      console.error("Failed to load addresses", err);
    }
  };

  useEffect(() => {
    loadPreview();
    loadAddresses();
  }, [
    payload.source,
    JSON.stringify(payload.cartItemIds || []),
    JSON.stringify(payload.items || []),
  ]);

  const shippingCosts: Record<string, number> = {
    standard: 5.0,
    express: 15.0,
  };

  const totalAmount =
    (preview?.totals.totalAmount || 0) +
    shippingCosts[shippingMethod] -
    (appliedVoucher?.discountAmount || 0);

  const handleConfirmPayment = async () => {
    if (!preview?.canProceed) return;
    if (!selectedAddressId) {
      toast.error("Please select a shipping address");
      return;
    }

    try {
      setProcessing(true);
      const requestBody: CheckoutConfirmPayload = {
        ...payload,
        paymentSimulation: "success", // Defaulting to success for now
        voucherCode: appliedVoucher?.voucherCode || undefined, // Pass applied voucher code
        // Note: The original API might need expansion for addressId, etc.
        // For this UI task, we focus on the frontend logic.
      } as any;
      const result = await confirmCheckout(requestBody);

      if (result.paymentStatus === "paid") {
        toast.success("Payment successful.");
      } else {
        toast.error("Payment failed.");
      }

      await refreshCart();
      navigate(result.redirectTo || "/my-ebay/activity/purchases");
    } catch (error: any) {
      const message =
        error.response?.data?.message || "Failed to confirm payment";
      toast.error(message);
      await loadPreview();
    } finally {
      setProcessing(false);
    }
  };

  const handleApplyVoucher = async () => {
    if (!voucherCode.trim()) {
      toast.error("Please enter a voucher code");
      return;
    }

    try {
      setApplyingVoucher(true);
      const res = await validateVoucher(
        voucherCode,
        preview?.totals.subtotalAmount || 0,
      );
      if (res.success) {
        setAppliedVoucher(res.data);
        await loadPreview(); // Reload preview to get backend-calculated totals
        toast.success(res.message || "Voucher applied successfully");
      } else {
        setAppliedVoucher(null);
        toast.error(res.message || "Invalid voucher");
      }
    } catch (err: any) {
      setAppliedVoucher(null);
      toast.error(err.response?.data?.message || "Failed to validate voucher");
    } finally {
      setApplyingVoucher(false);
    }
  };

  const selectedAddress = addresses.find(
    (a: Address) => a._id === selectedAddressId,
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center text-muted-foreground">
          Loading checkout preview...
        </div>
      </div>
    );
  }

  if (!preview) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center text-muted-foreground">
          Unable to load checkout data.
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto px-4 py-8">
      <div className="flex items-center justify-between gap-1 mb-8">
        <div className="flex flex-col gap-0">
          <h1 className="text-4xl font-bold">Checkout</h1>
          <p className="text-muted-foreground text-md">Complete your order</p>
        </div>
        <Button
          variant="outline"
          size="default"
          className="w-fit rounded-md cursor-pointer mt-2 p-2 h-fit hover:bg-transparent text-muted-foreground hover:text-foreground"
          onClick={() => navigate("/cart")}
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Back to Cart
        </Button>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Left Column: Checkout Details */}
        <div className="flex-1 space-y-6">
          {/* Shipping Address Section */}
          <section className="bg-white rounded-xl border p-6 shadow-sm">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <MapPin className="h-5 w-5 text-primary" />
              Recipient Information
            </h2>
            <div className="space-y-4">
              <p className="text-sm font-medium text-muted-foreground">
                Select delivery address
              </p>
              <RadioGroup
                value={selectedAddressId}
                onValueChange={setSelectedAddressId}
              >
                <div className="grid gap-3">
                  {addresses.map((addr: Address) => (
                    <div
                      key={addr._id}
                      onClick={() => {
                        setSelectedAddressId(addr._id);
                      }}
                      className={cn(
                        "relative flex flex-col p-4 rounded-lg border-2 cursor-pointer transition-all",
                        selectedAddressId === addr._id
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-muted-foreground/30",
                      )}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-lg">
                            {addr.fullName}
                          </span>
                          {addr.isDefault && (
                            <Badge
                              variant="outline"
                              className="text-[12px] bg-blue-400/20 font-semibold text-blue-400 p-2 rounded-md"
                            >
                              Default
                            </Badge>
                          )}
                        </div>
                        <RadioGroupItem value={addr._id} />
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {addr.phone}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {user?.email}
                      </p>
                      <p className="text-md  mt-1">
                        {addr.detail ? `${addr.detail}, ` : ""}
                        {addr.street ? `${addr.street}, ` : ""}
                        {addr.ward ? `${addr.ward}, ` : ""}
                        {addr.district ? `${addr.district}, ` : ""}
                        {addr.city ? addr.city : ""}
                      </p>
                    </div>
                  ))}
                </div>
              </RadioGroup>
              {!addresses.length && (
                <div className="text-center py-4 border-2 border-dashed rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    No addresses found.
                  </p>
                  <Button
                    variant="link"
                    size="sm"
                    onClick={() => navigate("/my-ebay/account/addresses")}
                  >
                    Add an address
                  </Button>
                </div>
              )}

              {selectedAddress && (
                <div className="mt-6 pt-6 border-t space-y-3">
                  <p className="text-sm font-semibold">Recipient Details</p>
                  <div className="grid grid-cols-2 text-sm gap-y-2">
                    <span className="text-muted-foreground">Name:</span>
                    <span className="text-right font-medium">
                      {selectedAddress.fullName}
                    </span>
                    <span className="text-muted-foreground">Phone:</span>
                    <span className="text-right font-medium">
                      {selectedAddress.phone}
                    </span>
                    <span className="text-muted-foreground">Email:</span>
                    <span className="text-right font-medium">
                      {user?.email}
                    </span>
                    <span className="text-muted-foreground">Address:</span>
                    <span className="text-right font-medium leading-tight">
                      {selectedAddress.detail
                        ? `${selectedAddress.detail}, `
                        : ""}
                      {selectedAddress.street
                        ? `${selectedAddress.street}, `
                        : ""}
                      {selectedAddress.ward ? `${selectedAddress.ward}, ` : ""}
                      {selectedAddress.district
                        ? `${selectedAddress.district}, `
                        : ""}
                      {selectedAddress.city}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Shipping Method Section */}
          <section className="bg-white rounded-xl border p-6 shadow-sm">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Truck className="h-5 w-5 text-primary" />
              Shipping Method
            </h2>
            <RadioGroup
              value={shippingMethod}
              onValueChange={setShippingMethod}
            >
              <div className="grid gap-3">
                <Label
                  className={cn(
                    "flex items-center justify-between p-4 rounded-lg border-2 cursor-pointer transition-all",
                    shippingMethod === "standard"
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-muted-foreground/30",
                  )}
                >
                  <div className="flex items-center gap-3">
                    <RadioGroupItem value="standard" />
                    <div>
                      <p className="font-semibold text-sm">Standard Shipping</p>
                      <p className="text-xs text-muted-foreground">
                        Estimated delivery 5-7 days
                      </p>
                    </div>
                  </div>
                  <span className="font-semibold text-sm">+$5.00</span>
                </Label>

                <Label
                  className={cn(
                    "flex items-center justify-between p-4 rounded-lg border-2 cursor-pointer transition-all",
                    shippingMethod === "express"
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-muted-foreground/30",
                  )}
                >
                  <div className="flex items-center gap-3">
                    <RadioGroupItem value="express" />
                    <div>
                      <p className="font-semibold text-sm">Express Shipping</p>
                      <p className="text-xs text-muted-foreground">
                        Estimated delivery 2-3 days
                      </p>
                    </div>
                  </div>
                  <span className="font-semibold text-sm">+$15.00</span>
                </Label>
              </div>
            </RadioGroup>
          </section>

          {/* Payment Method Section */}
          <section className="bg-white rounded-xl border p-6 shadow-sm">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" />
              Payment Method
            </h2>
            <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod}>
              <div className="grid gap-3 mb-4">
                {[
                  { id: "cod", label: "Cash on Delivery (COD)" },
                  { id: "bank", label: "Bank Transfer" },
                ].map((method) => (
                  <Label
                    key={method.id}
                    className={cn(
                      "flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all",
                      paymentMethod === method.id
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-muted-foreground/30",
                    )}
                  >
                    <RadioGroupItem value={method.id} />
                    <span className="font-semibold text-sm">
                      {method.label}
                    </span>
                  </Label>
                ))}
              </div>
            </RadioGroup>
          </section>

          {/* Voucher Section */}
          <section className="bg-white rounded-xl border p-6 shadow-sm">
            <h3 className="font-bold mb-4">Discount Code</h3>
            <div className="flex gap-2">
              <Input
                placeholder="Enter voucher code"
                value={voucherCode}
                onChange={(e) => setVoucherCode(e.target.value)}
              />
              <Button
                className="cursor-pointer"
                onClick={handleApplyVoucher}
                disabled={applyingVoucher || !preview}
              >
                {applyingVoucher ? "Applying..." : "Apply"}
              </Button>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Hint: Use "SAVE10" or "SAVE20"
            </p>
          </section>

          {/* Note Section */}
          <section className="bg-white rounded-xl border p-6 shadow-sm">
            <h3 className="font-bold mb-4">Order Note (optional)</h3>
            <Textarea
              placeholder="Enter instructions for the shop..."
              value={orderNote}
              onChange={(e) => setOrderNote(e.target.value)}
              className="resize-none h-24"
            />
          </section>
        </div>

        {/* Right Column: Order Summary Sidebar */}
        <div className="w-full lg:w-[400px]">
          <div className="sticky top-8 space-y-6">
            <section className="bg-white rounded-xl border p-6 shadow-sm">
              <h2 className="text-xl font-semibold mb-6">
                Order Summary ({preview.totals.itemCount} items)
              </h2>
              <div className="space-y-6 max-h-[400px] overflow-y-auto pr-2 scrollbar-thin">
                {preview.groups
                  .flatMap((g: CheckoutGroup) => g.items)
                  .map((item: CheckoutGroupItem) => (
                    <div
                      key={`${item.productId}-${item.cartItemId}`}
                      className="flex gap-4"
                    >
                      <div className="w-20 h-20 bg-muted rounded-lg shrink-0 overflow-hidden">
                        <img
                          src={(item as any).image || "/placeholder.png"}
                          alt={item.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1 flex flex-col justify-between">
                        <div>
                          <div className="flex justify-between items-start">
                            <p className="font-semibold text-sm line-clamp-1">
                              {item.title}
                            </p>
                          </div>
                          {item.selectedVariants &&
                            item.selectedVariants.length > 0 && (
                              <p className="text-[11px] text-muted-foreground uppercase tracking-wider">
                                {item.selectedVariants
                                  .map(
                                    (v: { name: string; value: string }) =>
                                      v.value,
                                  )
                                  .join(" / ")}
                              </p>
                            )}
                        </div>
                        <div className="flex justify-between items-end">
                          <p className="font-bold text-sm">
                            ${item.lineTotal.toFixed(2)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>

              {/* Voucher Input */}
              <div className="mt-6 pt-6 border-t">
                <div className="flex gap-2">
                  <Input
                    placeholder="Voucher Code"
                    value={voucherCode}
                    onChange={(e) => setVoucherCode(e.target.value.toUpperCase())}
                    className="h-10 uppercase"
                    disabled={applyingVoucher || !!appliedVoucher}
                  />
                  <Button 
                    variant="outline"
                    className="h-10 px-4 font-semibold hover:bg-primary/5 active:scale-95 transition-transform shrink-0"
                    onClick={handleApplyVoucher}
                    disabled={applyingVoucher || !!appliedVoucher || !voucherCode.trim()}
                  >
                    {applyingVoucher ? "..." : appliedVoucher ? "Applied" : "Apply"}
                  </Button>
                </div>
                {appliedVoucher && (
                  <button
                    onClick={() => {
                      setAppliedVoucher(null);
                      setVoucherCode("");
                      loadPreview();
                    }}
                    className="text-[10px] text-red-500 mt-1 hover:underline ml-1"
                  >
                    Remove voucher
                  </button>
                )}
              </div>

              <div className="mt-6 pt-6 border-t space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-medium">
                    ${preview.totals.subtotalAmount.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Shipping Fee</span>
                  <span className="font-medium">
                    ${shippingCosts[shippingMethod].toFixed(2)}
                  </span>
                </div>
                {appliedVoucher && (
                  <div className="flex justify-between text-sm text-green-600 font-medium">
                    <div className="flex flex-col">
                      <span>Voucher Discount</span>
                      <span className="text-[10px] text-green-500 uppercase">
                        CODE: {appliedVoucher.voucherCode}
                      </span>
                    </div>
                    <span>-${appliedVoucher.discountAmount.toFixed(2)}</span>
                  </div>
                )}
                <Separator className="my-4" />
                <div className="flex justify-between items-baseline">
                  <span className="font-bold text-lg">Total</span>
                  <span className="text-2xl font-black text-primary">
                    ${totalAmount.toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="mt-8 space-y-3">
                <Button
                  size="lg"
                  className="w-full cursor-pointer h-12 text-md font-bold shadow-lg shadow-primary/20"
                  onClick={handleConfirmPayment}
                  disabled={processing || !preview.canProceed}
                >
                  {processing ? "Processing..." : "Place Order"}
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  className="w-full cursor-pointer h-12 text-sm text-muted-foreground"
                  onClick={() => navigate("/cart")}
                >
                  Back to Cart
                </Button>
              </div>
            </section>

            {preview.outOfStockItems.length > 0 && (
              <Card className="border-red-200 bg-red-50/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-red-600 flex items-center gap-2">
                    Unavailable Items
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {preview.outOfStockItems.map(
                    (item: CheckoutUnavailableItem, index: number) => (
                      <div key={index} className="text-xs text-red-700">
                        • {item.title}: {item.message}
                      </div>
                    ),
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
