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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  MapPin,
  Truck,
  CreditCard,
  ChevronLeft,
  Pencil,
  Trash2,
  Plus,
  ChevronRight,
  Store,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { getAvailableVouchers, type Voucher } from "@/api/vouchers";
import AddressForm from "@/components/address-form";
import { ConfirmDialog } from "@/components/confirm-dialog";
import {
  createAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
} from "@/api/user";
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
  // notes keyed by sellerId for each suborder
  const [sellerNotes, setSellerNotes] = useState<Record<string, string>>({});
  const [globalVoucherInput, setGlobalVoucherInput] = useState("");
  const [globalVoucherCode, setGlobalVoucherCode] = useState("");
  const [sellerVoucherInputs, setSellerVoucherInputs] = useState<
    Record<string, string>
  >({});
  const [sellerVoucherCodes, setSellerVoucherCodes] = useState<
    Record<string, string>
  >({});
  const [globalVoucherOptions, setGlobalVoucherOptions] = useState<Voucher[]>(
    [],
  );
  const [sellerVoucherOptions, setSellerVoucherOptions] = useState<
    Record<string, Voucher[]>
  >({});
  const [loadingVoucherOptions, setLoadingVoucherOptions] = useState(false);

  // Address CRUD state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAddressListModalOpen, setIsAddressListModalOpen] = useState(false);
  const [selectedAddressForEdit, setSelectedAddressForEdit] =
    useState<Address | null>(null);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [confirmDialogAction, setConfirmDialogAction] = useState<
    "setDefault" | "delete" | null
  >(null);
  const [pendingAddressId, setPendingAddressId] = useState<string | null>(null);
  const [isActionLoading, setIsActionLoading] = useState(false);

  const sellerVoucherPayload = useMemo(
    () =>
      Object.entries(sellerVoucherCodes)
        .filter(([, code]) => Boolean(code.trim()))
        .map(([sellerId, code]) => ({
          sellerId,
          code: code.trim().toUpperCase(),
        })),
    [sellerVoucherCodes],
  );

  const checkoutRequestBody = useMemo(
    () => ({
      ...payload,
      globalVoucherCode: globalVoucherCode || undefined,
      sellerVoucherCodes: sellerVoucherPayload,
      sellerNotes,
    }),
    [payload, globalVoucherCode, sellerVoucherPayload, sellerNotes],
  );

  const loadPreview = async () => {
    try {
      // only show the full-screen loading indicator if we don't
      // already have a preview. otherwise the UI will flash/refresh
      // when the user is typing in seller notes.
      if (!preview) {
        setLoading(true);
      }
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
    if (!previewData?.groups?.length) {
      setGlobalVoucherOptions([]);
      setSellerVoucherOptions({});
      return;
    }

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
    loadPreview();
  }, [
    payload.source,
    JSON.stringify(payload.cartItemIds || []),
    JSON.stringify(payload.items || []),
    globalVoucherCode,
    JSON.stringify(sellerVoucherPayload),
    JSON.stringify(sellerNotes), // recalc when seller notes change
  ]);

  useEffect(() => {
    loadAddresses();
  }, []);

  useEffect(() => {
    if (!preview) return;
    loadVoucherOptions(preview);
  }, [
    preview?.totals.subtotalAmount,
    JSON.stringify(
      preview?.groups?.map((g) => [g.sellerId, g.subtotalAmount]) || [],
    ),
  ]);

  const shippingCosts: Record<string, number> = {
    standard: 5.0,
    express: 15.0,
  };

  const totalAmount =
    Number(preview?.totals.totalAmount || 0) +
    Number(shippingCosts[shippingMethod] || 0);

  const handleConfirmPayment = async () => {
    if (!preview?.canProceed) return;
    if (!selectedAddressId) {
      toast.error("Please select a shipping address");
      return;
    }

    const selectedAddress = addresses.find((a) => a._id === selectedAddressId);
    if (!selectedAddress) {
      toast.error("Address details not found");
      return;
    }

    try {
      setProcessing(true);
      const requestBody: CheckoutConfirmPayload = {
        ...checkoutRequestBody,
        paymentSimulation: "success",
        shippingAddress: {
          fullName: selectedAddress.fullName,
          phone: selectedAddress.phone,
          country: selectedAddress.country,
          city: selectedAddress.city,
          district: selectedAddress.district,
          ward: selectedAddress.ward,
          street: selectedAddress.street,
          detail: selectedAddress.detail,
        },
        shippingPrice: shippingCosts[shippingMethod] || 0,
        paymentMethod: paymentMethod,
        sellerNotes: sellerNotes,
      };
      const result = await confirmCheckout(requestBody);

      if (
        result.paymentStatus === "processing" ||
        result.paymentStatus === "paid" ||
        result.paymentStatus === "unpaid"
      ) {
        toast.success("Payment successful.");
        await refreshCart();
        navigate("/checkout/success", {
          state: {
            orders: result.orders || [],
            totalAmount: totalAmount || 0,
            subtotalAmount: preview?.totals.subtotalAmount || 0,
            discountAmount: preview?.totals.discountAmount || 0,
            shippingPrice: shippingCosts[shippingMethod] || 0,
            shippingMethod,
            shippingAddress: {
              fullName: selectedAddress.fullName,
              phone: selectedAddress.phone,
              country: selectedAddress.country,
              city: selectedAddress.city,
              district: selectedAddress.district,
              ward: selectedAddress.ward,
              street: selectedAddress.street,
              detail: selectedAddress.detail,
            },
            paymentMethod: paymentMethod,
            orderGroupId: result.orders?.[0]?._id,
          },
        });
      } else {
        toast.error("Payment failed.");
        await refreshCart();
        navigate(result.redirectTo || "/my-ebay/activity/purchases");
      }
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

  const handleClearGlobalVoucher = () => {
    setGlobalVoucherInput("");
    setGlobalVoucherCode("");
  };

  const handleSelectGlobalVoucher = (voucher: Voucher) => {
    setGlobalVoucherInput(voucher.code);
    setGlobalVoucherCode(voucher.code);
  };

  const handleApplySellerVoucher = (sellerId: string) => {
    const code = (sellerVoucherInputs[sellerId] || "").trim().toUpperCase();
    setSellerVoucherCodes((prev) => ({ ...prev, [sellerId]: code }));
  };

  const handleClearSellerVoucher = (sellerId: string) => {
    setSellerVoucherInputs((prev) => ({ ...prev, [sellerId]: "" }));
    setSellerVoucherCodes((prev) => {
      const next = { ...prev };
      delete next[sellerId];
      return next;
    });
  };

  const handleSelectSellerVoucher = (sellerId: string, voucher: Voucher) => {
    setSellerVoucherInputs((prev) => ({ ...prev, [sellerId]: voucher.code }));
    setSellerVoucherCodes((prev) => ({ ...prev, [sellerId]: voucher.code }));
  };

  const handleOpenAddAddress = () => {
    setSelectedAddressForEdit(null);
    setIsModalOpen(true);
  };

  const handleOpenEditAddress = (e: React.MouseEvent, addr: Address) => {
    e.stopPropagation();
    setSelectedAddressForEdit(addr);
    setIsModalOpen(true);
  };

  const handleAddressSubmit = async (payload: any) => {
    try {
      if (selectedAddressForEdit) {
        await updateAddress(selectedAddressForEdit._id, payload);
      } else {
        await createAddress(payload);
      }
      await loadAddresses();
      setIsModalOpen(false);
    } catch (error) {
      console.error("Failed to save address", error);
      throw error; // Let AddressForm handle the error toast if it does, or catch here
    }
  };

  const handleConfirmAction = async () => {
    if (!pendingAddressId || !confirmDialogAction) return;
    try {
      setIsActionLoading(true);
      if (confirmDialogAction === "delete") {
        await deleteAddress(pendingAddressId);
        toast.success("Address deleted successfully");
        if (selectedAddressId === pendingAddressId) {
          setSelectedAddressId("");
        }
      } else if (confirmDialogAction === "setDefault") {
        await setDefaultAddress(pendingAddressId);
        toast.success("Default address set successfully");
      }
      await loadAddresses();
      setConfirmDialogOpen(false);
    } catch (error) {
      toast.error(`Failed to ${confirmDialogAction} address`);
    } finally {
      setIsActionLoading(false);
      setPendingAddressId(null);
      setConfirmDialogAction(null);
    }
  };

  const openDeleteConfirm = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setPendingAddressId(id);
    setConfirmDialogAction("delete");
    setConfirmDialogOpen(true);
  };

  const selectedAddress = addresses.find(
    (a: Address) => a._id === selectedAddressId,
  );

  // show a full‑page loader only when we truly have **no** preview yet.
  // subsequent preview requests (triggered by typing seller notes, etc.)
  // will set `loading` but we keep the current UI on screen so the user
  // can continue typing uninterrupted.
  if (loading && !preview) {
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
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <MapPin className="h-5 w-5 text-primary" />
                Delivery Address
              </h2>
              {addresses.length > 0 && (
                <Button
                  variant="outline"
                  className="text-primary font-semibold hover:no-underline hover:bg-blue-400/30 hover:text-primary cursor-pointer p-2 rounded-md bg-blue-400/30 border-0 h-auto"
                  onClick={() => setIsAddressListModalOpen(true)}
                >
                  Change
                </Button>
              )}
            </div>

            {selectedAddress ? (
              <div
                className="group relative p-4 rounded-xl border-2 border-primary/20 bg-primary/5 hover:border-primary/40 transition-all cursor-pointer"
                onClick={() => setIsAddressListModalOpen(true)}
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-lg text-foreground">
                        {selectedAddress.fullName}
                      </span>
                      <span className="text-muted-foreground">|</span>
                      <span className="text-sm font-medium text-muted-foreground">
                        {selectedAddress.phone}
                      </span>
                      {selectedAddress.isDefault && (
                        <Badge
                          variant="outline"
                          className="bg-primary/10 text-primary border-none text-[10px] px-2 py-0.5"
                        >
                          Default
                        </Badge>
                      )}
                    </div>
                    <p className="text-md text-foreground/80 leading-relaxed">
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
                    </p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors mt-1" />
                </div>
              </div>
            ) : (
              <div className="text-center py-8 border-2 border-dashed rounded-xl bg-muted/30">
                <p className="text-sm text-muted-foreground mb-4">
                  No address selected for delivery
                </p>
                <Button
                  variant="default"
                  className="bg-[#AAED56] cursor-pointer text-[#324E0F] hover:bg-[#9CD845] border-none font-bold px-6"
                  onClick={handleOpenAddAddress}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add New Address
                </Button>
              </div>
            )}
          </section>

          {/* Address Selection Modal */}
          <Dialog
            open={isAddressListModalOpen}
            onOpenChange={setIsAddressListModalOpen}
          >
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col p-0 border-none rounded-2xl shadow-2xl">
              <DialogHeader className="px-6 py-8 border-b bg-white">
                <div className="flex items-center justify-between">
                  <DialogTitle className="text-2xl font-bold">
                    Select Delivery Address
                  </DialogTitle>
                  <Button
                    size="sm"
                    className="bg-[#AAED56] cursor-pointer text-[#324E0F] hover:bg-[#9CD845] border-none font-bold rounded-full px-4 h-9 shadow-sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenAddAddress();
                    }}
                  >
                    <Plus className="h-4 w-4 mr-1.5" />
                    New Address
                  </Button>
                </div>
              </DialogHeader>

              <div className="flex-1 overflow-y-auto p-6 scrollbar-thin">
                <RadioGroup
                  value={selectedAddressId}
                  onValueChange={(val) => {
                    setSelectedAddressId(val);
                    setIsAddressListModalOpen(false);
                  }}
                >
                  <div className="grid gap-4">
                    {addresses.map((addr: Address) => (
                      <div
                        key={addr._id}
                        className={cn(
                          "group relative flex flex-col p-5 rounded-2xl border-2 transition-all cursor-pointer",
                          selectedAddressId === addr._id
                            ? "border-primary bg-primary/3 shadow-inner"
                            : "border-border hover:border-primary/30 hover:bg-muted/30",
                        )}
                        onClick={() => {
                          setSelectedAddressId(addr._id);
                          setIsAddressListModalOpen(false);
                        }}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 space-y-1.5">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-lg text-foreground">
                                {addr.fullName}
                              </span>
                              <span className="text-muted-foreground opacity-50">
                                |
                              </span>
                              <span className="text-sm font-medium text-muted-foreground">
                                {addr.phone}
                              </span>
                              {addr.isDefault && (
                                <Badge
                                  variant="outline"
                                  className="bg-blue-500/10 text-blue-600 border-none text-[10px] font-bold px-2 py-0.5"
                                >
                                  Default
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-foreground/70 leading-relaxed font-medium">
                              {addr.detail ? `${addr.detail}, ` : ""}
                              {addr.street ? `${addr.street}, ` : ""}
                              {addr.ward ? `${addr.ward}, ` : ""}
                              {addr.district ? `${addr.district}, ` : ""}
                              {addr.city}
                            </p>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-9 w-9 cursor-pointer rounded-full hover:bg-white hover:shadow-sm text-muted-foreground hover:text-primary transition-all"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenEditAddress(e, addr);
                              }}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            {!addr.isDefault && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-9 w-9 cursor-pointer rounded-full hover:bg-white hover:shadow-sm text-muted-foreground hover:text-destructive transition-all"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openDeleteConfirm(e, addr._id);
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                            <div className="ml-2">
                              <RadioGroupItem
                                value={addr._id}
                                className="w-5 h-5 border-2 border-primary/30 text-primary"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </RadioGroup>

                {addresses.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-12 text-center space-y-4">
                    <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center">
                      <MapPin className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <div className="space-y-1">
                      <p className="font-bold text-lg">No addresses found</p>
                      <p className="text-sm text-muted-foreground">
                        Add an address to continue with your checkout
                      </p>
                    </div>
                    <Button
                      className="bg-[#AAED56] text-[#324E0F] hover:bg-[#9CD845] font-bold px-6"
                      onClick={handleOpenAddAddress}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Address
                    </Button>
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>

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
                        Estimated delivery 3-4 days
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

          <section className="bg-white rounded-xl border p-6 shadow-sm space-y-4">
            <h3 className="font-bold text-lg">Global Voucher (Whole Order)</h3>
            <div className="flex gap-2">
              <Input
                placeholder="Enter global voucher code"
                value={globalVoucherInput}
                onChange={(e) =>
                  setGlobalVoucherInput(e.target.value.toUpperCase())
                }
                className="uppercase"
              />
              <Button
                className="cursor-pointer"
                onClick={handleApplyGlobalVoucher}
              >
                Apply
              </Button>
              {globalVoucherCode && (
                <Button
                  variant="outline"
                  className="cursor-pointer"
                  onClick={handleClearGlobalVoucher}
                >
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
              <option value="">Quick select global voucher</option>
              {globalVoucherOptions.map((voucher) => (
                <option key={voucher._id} value={voucher.code}>
                  {voucher.code} -{" "}
                  {voucher.type === "percentage"
                    ? `${voucher.value}%`
                    : `$${voucher.value}`}
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
              {!globalVoucherOptions.length && (
                <p className="text-xs text-muted-foreground">
                  No global vouchers available.
                </p>
              )}
            </div>
          </section>

          <section className="bg-white rounded-xl border p-6 shadow-sm space-y-5">
            <h3 className="font-bold text-lg">Order Details</h3>
            {preview.groups.map((group: CheckoutGroup) => (
              <div
                key={group.sellerId}
                className="border rounded-xl p-4 space-y-4"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-semibold">
                    <Store className="h-4 w-4 text-primary" />
                    <span>{group.sellerName || "Seller"}</span>
                  </div>
                  <Badge variant="outline">
                    Subtotal ${group.subtotalAmount.toFixed(2)}
                  </Badge>
                </div>

                <div className="mt-2">
                  <Textarea
                    placeholder="Note for this shop..."
                    value={sellerNotes[group.sellerId] || ""}
                    onChange={(e) =>
                      setSellerNotes((prev) => ({
                        ...prev,
                        [group.sellerId]: e.target.value,
                      }))
                    }
                    className="w-full"
                    rows={2}
                  />
                </div>

                <div className="space-y-2">
                  {group.items.map((item: CheckoutGroupItem) => (
                    <div
                      key={`${group.sellerId}-${item.productId}-${item.cartItemId || ""}`}
                      className="flex flex-col gap-2 p-3 bg-muted/10 rounded-lg border border-muted"
                    >
                      <div className="flex items-center justify-between text-sm">
                        <div>
                          <p className="font-medium">{item.title}</p>
                          {item.selectedVariants &&
                            item.selectedVariants.length > 0 && (
                              <p className="text-xs text-muted-foreground">
                                {item.selectedVariants
                                  .map(
                                    (v: { name: string; value: string }) =>
                                      `${v.name}: ${v.value}`,
                                  )
                                  .join(" • ")}
                              </p>
                            )}
                        </div>
                        <div className="text-right">
                          <p>${item.lineTotal.toFixed(2)}</p>
                          <p className="text-xs text-muted-foreground">
                            x{item.quantity}
                          </p>
                        </div>
                      </div>
                      {/* no per-item note any more */}
                    </div>
                  ))}
                </div>

                <Separator />
                <div className="space-y-3">
                  <Label className="font-semibold">Voucher For This Shop</Label>
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
                      className="uppercase"
                    />
                    <Button
                      className="cursor-pointer"
                      onClick={() => handleApplySellerVoucher(group.sellerId)}
                    >
                      Apply
                    </Button>
                    {sellerVoucherCodes[group.sellerId] && (
                      <Button
                        variant="outline"
                        className="cursor-pointer"
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
                    {(sellerVoucherOptions[group.sellerId] || []).map(
                      (voucher) => (
                        <option key={voucher._id} value={voucher.code}>
                          {voucher.code} -{" "}
                          {voucher.type === "percentage"
                            ? `${voucher.value}%`
                            : `$${voucher.value}`}
                        </option>
                      ),
                    )}
                  </select>

                  <div className="space-y-2">
                    {(sellerVoucherOptions[group.sellerId] || []).map(
                      (voucher) => (
                        <VoucherTicket
                          key={voucher._id}
                          voucher={voucher}
                          selected={
                            sellerVoucherCodes[group.sellerId] === voucher.code
                          }
                          onSelect={(v) =>
                            handleSelectSellerVoucher(group.sellerId, v)
                          }
                        />
                      ),
                    )}
                    {!(sellerVoucherOptions[group.sellerId] || []).length && (
                      <p className="text-xs text-muted-foreground">
                        No shop vouchers available for this seller.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
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

              <div className="mt-6 pt-6 border-t space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-medium">
                    ${preview.totals.subtotalAmount.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-sm text-yellow-700">
                  <span>Global Voucher</span>
                  <span>
                    -${(preview.totals.globalDiscountAmount || 0).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-sm text-blue-700">
                  <span>Shop Vouchers</span>
                  <span>
                    -${(preview.totals.sellerDiscountAmount || 0).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-sm text-green-600 font-medium">
                  <span>Total Discount</span>
                  <span>
                    -${(preview.totals.discountAmount || 0).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Shipping Fee</span>
                  <span className="font-medium">
                    ${shippingCosts[shippingMethod].toFixed(2)}
                  </span>
                </div>
                <Separator className="my-4" />
                <div className="flex justify-between items-baseline">
                  <span className="font-bold text-lg">Total</span>
                  <span className="text-2xl font-black text-primary">
                    ${totalAmount.toFixed(2)}
                  </span>
                </div>
              </div>

              {preview.voucherErrors && preview.voucherErrors.length > 0 && (
                <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 space-y-1">
                  {preview.voucherErrors.map((error, index) => (
                    <p
                      key={`${error.code}-${index}`}
                      className="text-xs text-red-700"
                    >
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
                  disabled={
                    processing || !preview.canProceed || (loading && !!preview)
                  }
                >
                  {processing
                    ? "Processing..."
                    : loading && !!preview
                      ? "Updating…"
                      : "Place Order"}
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
      <AddressForm
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        initialData={selectedAddressForEdit}
        onSubmit={handleAddressSubmit}
      />

      <ConfirmDialog
        open={confirmDialogOpen}
        onOpenChange={setConfirmDialogOpen}
        title={
          confirmDialogAction === "delete"
            ? "Delete Address"
            : "Set Default Address"
        }
        description={
          confirmDialogAction === "delete"
            ? "Are you sure you want to delete this address? This action cannot be undone."
            : "Are you sure you want to set this as your default address?"
        }
        confirmText={
          confirmDialogAction === "delete" ? "Delete" : "Set as Default"
        }
        isDangerous={confirmDialogAction === "delete"}
        loading={isActionLoading}
        onConfirm={handleConfirmAction}
      />
    </div>
  );
}
