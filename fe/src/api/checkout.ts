import api from "@/lib/axios";

export interface CheckoutRequestItem {
  productId: string;
  quantity: number;
  selectedVariants?: { name: string; value: string }[];
}

export interface SellerVoucherCodeInput {
  sellerId: string;
  code: string;
}

export interface CheckoutPreviewPayload {
  source: "cart" | "buy_now";
  cartItemIds?: string[];
  items?: CheckoutRequestItem[];
  globalVoucherCode?: string;
  sellerVoucherCodes?: SellerVoucherCodeInput[] | Record<string, string>;
}

export interface CheckoutGroupItem {
  cartItemId?: string;
  productId: string;
  title: string;
  unitPrice: number;
  quantity: number;
  selectedVariants?: { name: string; value: string }[];
  variantSku?: string;
  availableStock?: number;
  lineTotal: number;
}

export interface CheckoutGroup {
  sellerId: string;
  sellerName: string;
  items: CheckoutGroupItem[];
  subtotalAmount: number;
}

export interface CheckoutUnavailableItem {
  title: string;
  message: string;
  availableStock: number;
  productId?: string;
  cartItemId?: string;
  selectedVariants?: { name: string; value: string }[];
}

export interface AppliedVoucherSummary {
  voucherId: string;
  sellerId?: string;
  sellerName?: string;
  code: string;
  scope: "global" | "seller";
  type: "percentage" | "fixed";
  value: number;
  discountAmount: number;
  usageLimit: number | null;
  usedCount: number;
  remainingUsage: number | null;
}

export interface CheckoutPreviewResponse {
  success: boolean;
  source: "cart" | "buy_now";
  groups: CheckoutGroup[];
  totals: {
    itemCount: number;
    subtotalAmount: number;
    globalDiscountAmount: number;
    sellerDiscountAmount: number;
    discountAmount: number;
    totalAmount: number;
  };
  appliedVouchers?: {
    global: AppliedVoucherSummary | null;
    seller: AppliedVoucherSummary[];
  };
  voucherErrors?: Array<{
    scope: "global" | "seller";
    sellerId?: string;
    sellerName?: string;
    code: string;
    message: string;
  }>;
  payableItemCount: number;
  outOfStockItems: CheckoutUnavailableItem[];
  canProceed: boolean;
}

export interface CheckoutConfirmPayload extends CheckoutPreviewPayload {
  paymentSimulation: "success" | "failed";
}

export interface CheckoutConfirmResponse {
  success: boolean;
  paymentStatus: "paid" | "failed";
  orders: Array<{
    _id: string;
    status: string;
    totalAmount: number;
    seller: string;
  }>;
  appliedVouchers?: {
    global: AppliedVoucherSummary | null;
    seller: AppliedVoucherSummary[];
  };
  outOfStockItems: CheckoutUnavailableItem[];
  redirectTo: string;
}

export const previewCheckout = async (payload: CheckoutPreviewPayload) => {
  const response = await api.post<CheckoutPreviewResponse>(
    "/api/orders/checkout/preview",
    payload,
  );
  return response.data;
};

export const confirmCheckout = async (payload: CheckoutConfirmPayload) => {
  const response = await api.post<CheckoutConfirmResponse>(
    "/api/orders/checkout/confirm",
    payload,
  );
  return response.data;
};
