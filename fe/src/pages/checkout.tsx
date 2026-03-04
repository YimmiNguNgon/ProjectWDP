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
import { MapPin, Truck, CreditCard, ChevronLeft, Store } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { getAvailableVouchers, type Voucher } from "@/api/vouchers";
import VoucherTicket from "@/components/voucher/voucher-ticket";

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

  const [globalVoucherInput, setGlobalVoucherInput] = useState("");
  const [globalVoucherCode, setGlobalVoucherCode] = useState("");
  const [sellerVoucherInputs, setSellerVoucherInputs] = useState<Record<string, string>>({});
  const [sellerVoucherCodes, setSellerVoucherCodes] = useState<Record<string, string>>({});

  const [globalVoucherOptions, setGlobalVoucherOptions] = useState<Voucher[]>([]);
  const [sellerVoucherOptions, setSellerVoucherOptions] = useState<Record<string, Voucher[]>>({});
  const [loadingVoucherOptions, setLoadingVoucherOptions] = useState(false);

  const sellerVoucherPayload = useMemo(
    () =>
      Object.entries(sellerVoucherCodes)
        .filter(([, code]) => Boolean(code.trim()))
        .map(([sellerId, code]) => ({ sellerId, code: code.trim().toUpperCase() })),
    [sellerVoucherCodes],
  );

  const checkoutRequestBody = useMemo(
    () => ({
      ...payload,
      globalVoucherCode: globalVoucherCode || undefined,
      sellerVoucherCodes: sellerVoucherPayload,
    }),
    [payload, globalVoucherCode, sellerVoucherPayload],
  );

  const loadPreview = async () => {
    try {
      setLoading(true);
      const data = await previewCheckout(checkoutRequestBody);
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

  const loadVoucherOptions = async (previewData: CheckoutPreviewResponse) => {
    if (!user || !previewData?.groups) return;

    try {
      setLoadingVoucherOptions(true);
      const globalPromise = getAvailableVouchers({
        scope: "global",
        subtotal: previewData.totals.subtotalAmount,
      });

      const sellerPromises = previewData.groups.map((group) =>
        getAvailableVouchers({
          scope: "seller",
          sellerId: group.sellerId,
          subtotal: group.subtotalAmount,
        }),
      );

      const [globalRes, ...sellerRes] = await Promise.all([
        globalPromise,
        ...sellerPromises,
      ]);

      const sellerMap: Record<string, Voucher[]> = {};
      previewData.groups.forEach((group, index) => {
        sellerMap[group.sellerId] = sellerRes[index]?.data || [];
      });

      setGlobalVoucherOptions(globalRes.data || []);
      setSellerVoucherOptions(sellerMap);
    } catch {
      setGlobalVoucherOptions([]);
      setSellerVoucherOptions({});
    } finally {
      setLoadingVoucherOptions(false);
    }
  };

  useEffect(() => {
    loadAddresses();
  }, []);

  useEffect(() => {
    loadPreview();
  }, [
    payload.source,
    JSON.stringify(payload.cartItemIds || []),
    JSON.stringify(payload.items || []),
    globalVoucherCode,
    JSON.stringify(sellerVoucherPayload),
  ]);

  useEffect(() => {
    if (!preview) return;
    loadVoucherOptions(preview);
  }, [
    preview?.totals.subtotalAmount,
    JSON.stringify(preview?.groups?.map((g) => [g.sellerId, g.subtotalAmount]) || []),
    user?.username,
  ]);

  const shippingCosts: Record<string, number> = {
    standard: 5.0,
    express: 15.0,
  };

  const totalAmount =
    Number(preview?.totals.totalAmount || 0) + Number(shippingCosts[shippingMethod] || 0);

  const handleConfirmPayment = async () => {
    if (!preview?.canProceed) return;
    if (!selectedAddressId) {
      toast.error("Please select a shipping address");
      return;
    }

    try {
      setProcessing(true);
      const requestBody: CheckoutConfirmPayload = {
        ...checkoutRequestBody,
        paymentSimulation: "success",
      };
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

  const handleApplyGlobalVoucher = () => {
    const code = globalVoucherInput.trim().toUpperCase();
    setGlobalVoucherCode(code);
  };

  const handleSelectGlobalVoucher = (voucher: Voucher) => {
    setGlobalVoucherInput(voucher.code);
    setGlobalVoucherCode(voucher.code);
  };

  const handleClearGlobalVoucher = () => {
    setGlobalVoucherInput("");
    setGlobalVoucherCode("");
  };

  const handleApplySellerVoucher = (sellerId: string) => {
    const code = (sellerVoucherInputs[sellerId] || "").trim().toUpperCase();
    setSellerVoucherCodes((prev) => ({ ...prev, [sellerId]: code }));
  };

  const handleSelectSellerVoucher = (sellerId: string, voucher: Voucher) => {
    setSellerVoucherInputs((prev) => ({ ...prev, [sellerId]: voucher.code }));
    setSellerVoucherCodes((prev) => ({ ...prev, [sellerId]: voucher.code }));
  };

  const handleClearSellerVoucher = (sellerId: string) => {
    setSellerVoucherInputs((prev) => ({ ...prev, [sellerId]: "" }));
    setSellerVoucherCodes((prev) => {
      const next = { ...prev };
      delete next[sellerId];
      return next;
    });
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
        <div className="flex-1 space-y-6">
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
                          <span className="font-bold text-lg">{addr.fullName}</span>
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
                      <p className="text-sm text-muted-foreground">{addr.phone}</p>
                      <p className="text-sm text-muted-foreground">{user?.email}</p>
                      <p className="text-md mt-1">
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
                  <p className="text-sm text-muted-foreground">No addresses found.</p>
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
                    <span className="text-right font-medium">{selectedAddress.fullName}</span>
                    <span className="text-muted-foreground">Phone:</span>
                    <span className="text-right font-medium">{selectedAddress.phone}</span>
                    <span className="text-muted-foreground">Email:</span>
                    <span className="text-right font-medium">{user?.email}</span>
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
                      <p className="text-xs text-muted-foreground">Estimated delivery 5-7 days</p>
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
                      <p className="text-xs text-muted-foreground">Estimated delivery 2-3 days</p>
                    </div>
                  </div>
                  <span className="font-semibold text-sm">+$15.00</span>
                </Label>
              </div>
            </RadioGroup>
          </section>

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
                    <span className="font-semibold text-sm">{method.label}</span>
                  </Label>
                ))}
              </div>
            </RadioGroup>
          </section>

          <section className="bg-white rounded-xl border p-6 shadow-sm space-y-4">
            <h3 className="font-bold text-lg">Global Voucher (for total order)</h3>
            <div className="flex gap-2">
              <Input
                placeholder="Enter global voucher code"
                value={globalVoucherInput}
                onChange={(e) => setGlobalVoucherInput(e.target.value.toUpperCase())}
              />
              <Button onClick={handleApplyGlobalVoucher}>Apply</Button>
              {globalVoucherCode && (
                <Button variant="outline" onClick={handleClearGlobalVoucher}>
                  Remove
                </Button>
              )}
            </div>

            <select
              value={globalVoucherCode}
              onChange={(e) => {
                const code = e.target.value;
                setGlobalVoucherInput(code);
                setGlobalVoucherCode(code);
              }}
              className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
              disabled={loadingVoucherOptions}
            >
              <option value="">Select global voucher quickly</option>
              {globalVoucherOptions.map((voucher) => (
                <option key={voucher._id} value={voucher.code}>
                  {voucher.code} - {voucher.type === "percentage" ? `${voucher.value}%` : `$${voucher.value}`}
                </option>
              ))}
            </select>

            <div className="space-y-2">
              {globalVoucherOptions.map((voucher) => (
                <VoucherTicket
                  key={voucher._id}
                  voucher={voucher}
                  selected={globalVoucherCode === voucher.code}
                  onSelect={handleSelectGlobalVoucher}
                />
              ))}
              {globalVoucherOptions.length === 0 && (
                <p className="text-xs text-muted-foreground">No global vouchers available.</p>
              )}
            </div>

          </section>

          <section className="bg-white rounded-xl border p-6 shadow-sm space-y-5">
            <h3 className="font-bold text-lg">Items by Shop</h3>
            {preview.groups.map((group: CheckoutGroup) => (
              <div key={group.sellerId} className="border rounded-xl p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-semibold">
                    <Store className="h-4 w-4 text-primary" />
                    <span>{group.sellerName || "Seller"}</span>
                  </div>
                  <Badge variant="outline">Subtotal ${group.subtotalAmount.toFixed(2)}</Badge>
                </div>

                <div className="space-y-2">
                  {group.items.map((item: CheckoutGroupItem) => (
                    <div
                      key={`${group.sellerId}-${item.productId}-${item.cartItemId || ""}`}
                      className="flex items-center justify-between text-sm"
                    >
                      <div>
                        <p className="font-medium">{item.title}</p>
                        {item.selectedVariants && item.selectedVariants.length > 0 && (
                          <p className="text-xs text-muted-foreground">
                            {item.selectedVariants
                              .map((v: { name: string; value: string }) => `${v.name}: ${v.value}`)
                              .join(" • ")}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <p>${item.lineTotal.toFixed(2)}</p>
                        <p className="text-xs text-muted-foreground">x{item.quantity}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <Separator />
                <div className="space-y-3">
                  <Label className="font-semibold">Shop Voucher</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Enter shop voucher code"
                      value={sellerVoucherInputs[group.sellerId] || ""}
                      onChange={(e) =>
                        setSellerVoucherInputs((prev) => ({
                          ...prev,
                          [group.sellerId]: e.target.value.toUpperCase(),
                        }))
                      }
                    />
                    <Button onClick={() => handleApplySellerVoucher(group.sellerId)}>Apply</Button>
                    {sellerVoucherCodes[group.sellerId] && (
                      <Button
                        variant="outline"
                        onClick={() => handleClearSellerVoucher(group.sellerId)}
                      >
                        Remove
                      </Button>
                    )}
                  </div>

                  <select
                    value={sellerVoucherCodes[group.sellerId] || ""}
                    onChange={(e) => {
                      const code = e.target.value;
                      setSellerVoucherInputs((prev) => ({
                        ...prev,
                        [group.sellerId]: code,
                      }));
                      setSellerVoucherCodes((prev) => ({
                        ...prev,
                        [group.sellerId]: code,
                      }));
                    }}
                    className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                    disabled={loadingVoucherOptions}
                  >
                    <option value="">Quick select shop voucher</option>
                    {(sellerVoucherOptions[group.sellerId] || []).map((voucher) => (
                      <option key={voucher._id} value={voucher.code}>
                        {voucher.code} - {voucher.type === "percentage" ? `${voucher.value}%` : `$${voucher.value}`}
                      </option>
                    ))}
                  </select>

                  <div className="space-y-2">
                    {(sellerVoucherOptions[group.sellerId] || []).map((voucher) => (
                      <VoucherTicket
                        key={voucher._id}
                        voucher={voucher}
                        selected={sellerVoucherCodes[group.sellerId] === voucher.code}
                        onSelect={(v) => handleSelectSellerVoucher(group.sellerId, v)}
                      />
                    ))}
                    {(sellerVoucherOptions[group.sellerId] || []).length === 0 && (
                      <p className="text-xs text-muted-foreground">No shop vouchers available for this seller.</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </section>

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

        <div className="w-full lg:w-[400px]">
          <div className="sticky top-8 space-y-6">
            <section className="bg-white rounded-xl border p-6 shadow-sm">
              <h2 className="text-xl font-semibold mb-6">
                Order Summary ({preview.totals.itemCount} items)
              </h2>

              <div className="space-y-5 max-h-[420px] overflow-y-auto pr-2">
                {preview.groups.map((group) => (
                  <div key={group.sellerId} className="space-y-2">
                    <p className="font-semibold text-sm">{group.sellerName}</p>
                    {group.items.map((item) => (
                      <div
                        key={`${group.sellerId}-${item.productId}-${item.cartItemId || ""}`}
                        className="flex justify-between text-sm"
                      >
                        <div className="pr-3">
                          <p className="font-medium line-clamp-1">{item.title}</p>
                          <p className="text-xs text-muted-foreground">Qty {item.quantity}</p>
                        </div>
                        <p className="font-semibold">${item.lineTotal.toFixed(2)}</p>
                      </div>
                    ))}
                  </div>
                ))}
              </div>

              <div className="mt-6 pt-6 border-t space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-medium">${preview.totals.subtotalAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm text-yellow-700">
                  <span>Global Voucher</span>
                  <span>- ${preview.totals.globalDiscountAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm text-blue-700">
                  <span>Shop Vouchers</span>
                  <span>- ${preview.totals.sellerDiscountAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm text-green-600 font-medium">
                  <span>Total Discount</span>
                  <span>- ${preview.totals.discountAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Shipping Fee</span>
                  <span className="font-medium">${shippingCosts[shippingMethod].toFixed(2)}</span>
                </div>
                <Separator className="my-4" />
                <div className="flex justify-between items-baseline">
                  <span className="font-bold text-lg">Total</span>
                  <span className="text-2xl font-black text-primary">${totalAmount.toFixed(2)}</span>
                </div>
              </div>

              {preview.voucherErrors && preview.voucherErrors.length > 0 && (
                <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 space-y-1">
                  {preview.voucherErrors.map((error, index) => (
                    <p key={`${error.code}-${index}`} className="text-xs text-red-700">
                      {error.scope === "seller" && error.sellerName
                        ? `${error.sellerName}: `
                        : ""}
                      {error.code} - {error.message}
                    </p>
                  ))}
                </div>
              )}

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
                  <CardTitle className="text-sm text-red-600">Unavailable Items</CardTitle>
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

