import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/lib/axios";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
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
import { Messages } from "@/components/chat/messages";
import {
  MessageContext,
  type Conversation,
  type Message,
} from "@/hooks/use-message";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import {} from "lucide-react";
import {
  saveSeller as saveSellerApi,
  unsaveSeller as unsaveSellerApi,
  getSavedSellers,
  hideOrder as hideOrderApi,
  cancelOrder as cancelOrderApi,
} from "@/api/orders";

type OrderItem = {
  productId: {
    _id: string;
    title: string;
    price?: number;
    imageUrl?: string;
  };
  title: string;
  unitPrice: number;
  quantity: number;
  selectedVariants?: { name: string; value: string }[];
};

type Order = {
  _id: string;
  orderGroup?: any; // Replaced with any for flexibility or object { _id, shippingPrice }
  buyer: { _id: string; username: string };
  seller: { _id: string; username: string };
  items: OrderItem[];
  subtotalAmount?: number;
  discountAmount?: number;
  voucher?: {
    code?: string;
    discountAmount?: number;
  } | null;
  totalAmount: number;
  shippingPrice?: number;
  status: string;
  paymentStatus?: string;
  createdAt: string;
};

export default function PurchaseHistoryPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [savedSellers, setSavedSellers] = useState<Set<string>>(new Set());
  const [processingActions, setProcessingActions] = useState<Set<string>>(
    new Set(),
  );

  // Cancel order dialog state
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [orderIdToCancel, setOrderIdToCancel] = useState<string | null>(null);
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

  // Pagination states
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [limit] = useState(10);

  // Chat dialog states
  const [chatOpen, setChatOpen] = useState(false);
  const { payload } = useAuth();

  // Message context states
  const [participants, setParticipantsState] = useState<string[]>([]);
  const [conversation, setConversation] = useState<Conversation | undefined>();
  const [messages, setMessages] = useState<Message[] | undefined>();
  const [productRef, setProductRef] = useState<string | undefined>();
  const [productContext, setProductContext] = useState<any>();

  const navigate = useNavigate();

  const fetchOrders = async (p = page, s = search) => {
    try {
      setLoading(true);
      // Fetch orders with pagination and search
      const res = await api.get(
        `/api/orders?role=buyer&page=${p}&limit=${limit}&search=${encodeURIComponent(s)}`,
      );
      const { data: ordersData, pagination } = res.data;

      setOrders(ordersData || []);
      setTotalPages(pagination?.pages || 1);
      setPage(pagination?.page || 1);
    } catch (err) {
      console.error("Failed to load orders", err);
      toast.error("Failed to load orders");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  // Fetch saved sellers
  useEffect(() => {
    const fetchSavedSellers = async () => {
      try {
        const res = await getSavedSellers();
        const sellerIds = new Set(res.data.map((seller) => seller._id));
        setSavedSellers(sellerIds);
      } catch (err) {
        console.error("Failed to load saved sellers", err);
      }
    };

    fetchSavedSellers();
  }, []);

  // Handler: View order details
  const handleViewOrderDetails = (orderId: string) => {
    navigate(`/purchases/${orderId}`);
  };

  // Handler: Save/Unsave seller
  const handleToggleSaveSeller = async (
    sellerId: string,
    sellerName: string,
  ) => {
    const actionKey = `save-${sellerId}`;
    if (processingActions.has(actionKey)) return;

    try {
      setProcessingActions((prev) => new Set(prev).add(actionKey));

      if (savedSellers.has(sellerId)) {
        await unsaveSellerApi(sellerId);
        setSavedSellers((prev) => {
          const newSet = new Set(prev);
          newSet.delete(sellerId);
          return newSet;
        });
        toast.success(`Unsaved seller: ${sellerName}`);
      } else {
        await saveSellerApi(sellerId);
        setSavedSellers((prev) => new Set(prev).add(sellerId));
        toast.success(`Saved seller: ${sellerName}`);
      }
    } catch (err: any) {
      console.error("Failed to save/unsave seller", err);
      toast.error(
        err.response?.data?.message || "Failed to update saved seller",
      );
    } finally {
      setProcessingActions((prev) => {
        const newSet = new Set(prev);
        newSet.delete(actionKey);
        return newSet;
      });
    }
  };

  // Handler: Cancel order
  const handleCancelOrder = async () => {
    if (!orderIdToCancel) return;
    if (!cancelReason) {
      toast.error("Please select a reason for cancellation");
      return;
    }
    if (cancelReason === "other" && !cancelOtherText.trim()) {
      toast.error("Please provide details for 'Other' reason");
      return;
    }
    const actionKey = `cancel-${orderIdToCancel}`;
    if (processingActions.has(actionKey)) return;

    try {
      setProcessingActions((prev) => new Set(prev).add(actionKey));
      await cancelOrderApi(
        orderIdToCancel,
        cancelReason,
        cancelReason === "other" ? cancelOtherText.trim() : undefined,
      );

      // Update local state: mark that order as cancelled
      setOrders((prev) =>
        prev.map((o) =>
          o._id === orderIdToCancel ? { ...o, status: "cancelled" } : o,
        ),
      );

      toast.success("Order cancelled successfully");
    } catch (err: any) {
      console.error("Failed to cancel order", err);
      toast.error(err.response?.data?.message || "Failed to cancel order");
    } finally {
      setProcessingActions((prev) => {
        const newSet = new Set(prev);
        newSet.delete(actionKey);
        return newSet;
      });
      setCancelDialogOpen(false);
      setOrderIdToCancel(null);
      setCancelReason("");
      setCancelOtherText("");
    }
  };

  // Handler: Hide order
  const handleHideOrder = async (orderId: string) => {
    const actionKey = `hide-${orderId}`;
    if (processingActions.has(actionKey)) return;

    try {
      setProcessingActions((prev) => new Set(prev).add(actionKey));
      await hideOrderApi(orderId);

      // Remove order from UI
      setOrders((prev) => prev.filter((order) => order._id !== orderId));

      toast.success("Order hidden from list", {
        action: {
          label: "Undo",
          onClick: () => {
            // Refresh to restore
            window.location.reload();
          },
        },
      });
    } catch (err: any) {
      console.error("Failed to hide order", err);
      toast.error(err.response?.data?.message || "Failed to hide order");
    } finally {
      setProcessingActions((prev) => {
        const newSet = new Set(prev);
        newSet.delete(actionKey);
        return newSet;
      });
    }
  };

  // Handler: Open chat with seller
  const handleContactSeller = (sellerId: string, productId: string) => {
    const sender = payload?.userId;
    if (!sender) {
      toast.error("Please sign in to chat with the seller");
      return;
    }

    // Find product from orders
    const product = orders
      .flatMap((o) => o.items)
      .find((item) => item.productId?._id === productId);

    setParticipantsState([sender, sellerId]);
    setProductRef(productId);
    setProductContext(product?.productId);
    setChatOpen(true);
  };

  const handleSearch = () => {
    setPage(1);
    fetchOrders(1, search);
  };

  const [expandedSessions, setExpandedSessions] = useState<Set<string>>(
    new Set(),
  );

  // Toggle session expansion
  const toggleSessionExpansion = (sessionId: string) => {
    setExpandedSessions((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(sessionId)) {
        newSet.delete(sessionId);
      } else {
        newSet.add(sessionId);
      }
      return newSet;
    });
  };

  // Grouping logic: Group orders by orderGroup
  const sessionGroups = useMemo(() => {
    const groups: Record<string, { orders: Order[]; createdAt: string }> = {};

    orders.forEach((order) => {
      const sessionId =
        typeof order.orderGroup === "object" && order.orderGroup?._id
          ? order.orderGroup._id
          : order.orderGroup || order._id;
      if (!groups[sessionId]) {
        groups[sessionId] = {
          orders: [],
          createdAt: order.createdAt,
        };
      }
      groups[sessionId].orders.push(order);
      // Use the earliest createdAt for the session
      if (new Date(order.createdAt) < new Date(groups[sessionId].createdAt)) {
        groups[sessionId].createdAt = order.createdAt;
      }
    });

    return Object.entries(groups)
      .map(([sessionId, data]) => ({
        sessionId,
        ...data,
      }))
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
  }, [orders]);

  const filteredGroups = sessionGroups;

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      timeZone: "Asia/Ho_Chi_Minh",
    });

  const shortOrderNumber = (id: string) =>
    id.length > 10 ? id.slice(0, 2) + "-" + id.slice(-8) : id;

  const getStatusMeta = (status: string) => {
    const normalized = String(status || "").toLowerCase();

    if (normalized === "created") {
      return {
        label: "Placed",
        note: "Order has been placed successfully.",
        dotClass: "bg-blue-500",
        textClass: "text-blue-700",
      };
    }
    if (normalized === "packaging") {
      return {
        label: "Packaging",
        note: "Seller is preparing your order.",
        dotClass: "bg-cyan-500",
        textClass: "text-cyan-700",
      };
    }
    if (normalized === "ready_to_ship") {
      return {
        label: "Ready to Ship",
        note: "Seller has prepared your order and it's ready to be shipped.",
        dotClass: "bg-yellow-500",
        textClass: "text-yellow-700",
      };
    }
    if (normalized === "shipping") {
      return {
        label: "Shipping",
        note: "This order is on the way.",
        dotClass: "bg-amber-500",
        textClass: "text-amber-700",
      };
    }
    if (normalized === "delivered") {
      return {
        label: "Delivered",
        note: "This item has been delivered.",
        dotClass: "bg-emerald-500",
        textClass: "text-emerald-700",
      };
    }
    if (normalized === "completed") {
      return {
        label: "Completed",
        note: "Transaction completed.",
        dotClass: "bg-emerald-600",
        textClass: "text-emerald-800",
      };
    }
    if (normalized === "cancelled") {
      return {
        label: "Cancelled",
        note: "This order was cancelled.",
        dotClass: "bg-red-500",
        textClass: "text-red-700",
      };
    }
    if (normalized === "failed") {
      return {
        label: "Failed",
        note: "Payment or order failed.",
        dotClass: "bg-red-600",
        textClass: "text-red-800",
      };
    }
    if (normalized === "returned") {
      return {
        label: "Returned",
        note: "Items were returned.",
        dotClass: "bg-purple-500",
        textClass: "text-purple-700",
      };
    }

    return {
      label: normalized ? normalized.toUpperCase() : "UNKNOWN",
      note: "Order status updated.",
      dotClass: "bg-gray-500",
      textClass: "text-gray-700",
    };
  };

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Orders</h1>
        <div className="flex items-center gap-2">
          <Input
            placeholder="Search your orders"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="w-64"
          />
          <Button variant="default" onClick={handleSearch}>
            Search
          </Button>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-6 text-xs text-muted-foreground">
        <div>
          See orders from: <button className="underline">Last 60 days</button>
        </div>
        <div>
          Filter by: <button className="underline">All</button>
        </div>
      </div>

      <Separator className="mb-4" />

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading your orders...</p>
      ) : filteredGroups.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          You don&apos;t have any purchases yet.
        </p>
      ) : (
        <div className="space-y-4">
          {filteredGroups.map((group) => {
            const isExpanded = expandedSessions.has(group.sessionId);

            const groupShippingPrice =
              group.orders.find(
                (o) =>
                  typeof o.orderGroup === "object" &&
                  o.orderGroup?.shippingPrice !== undefined,
              )?.orderGroup?.shippingPrice || 0;

            const sessionTotalAmount =
              group.orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0) +
              groupShippingPrice;
            const sessionDiscountAmount = group.orders.reduce(
              (sum, o) =>
                sum + (o.discountAmount || o.voucher?.discountAmount || 0),
              0,
            );
            const uniqueSellers = Array.from(
              new Set(group.orders.map((o) => o.seller?.username)),
            ).filter(Boolean);
            const productNames = Array.from(
              new Set(
                group.orders.flatMap((o) =>
                  o.items.map((item) => item.productId?.title || item.title)
                )
              )
            ).filter(Boolean);

            return (
              <Card key={group.sessionId} className="overflow-hidden">
                <CardContent className="p-0">
                  <div
                    className="grid grid-cols-[1.2fr_1fr_1.2fr_1fr_0.8fr] gap-6 p-4 cursor-pointer transition-colors"
                    onClick={() => toggleSessionExpansion(group.sessionId)}
                  >
                    <div className="space-y-1">
                      <div className="text-[11px] font-semibold uppercase text-muted-foreground">
                        Order date
                      </div>
                      <div className="text-xs">
                        {formatDate(group.createdAt)}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-[11px] font-semibold uppercase text-muted-foreground">
                        Product
                      </div>
                      <div className="text-xs truncate max-w-[150px]" title={productNames.join(", ")}>
                        {productNames.join(", ")}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-[11px] font-semibold uppercase text-muted-foreground">
                        Sold by
                      </div>
                      <div className="text-xs text-blue-600 truncate max-w-[150px]">
                        {uniqueSellers.join(", ")}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-[11px] font-semibold uppercase text-muted-foreground">
                        Total
                      </div>
                      <div className="flex flex-col gap-0.5 font-semibold text-xs">
                        <span>US ${sessionTotalAmount.toFixed(2)}</span>
                        <div className="text-[10px] text-muted-foreground font-normal">
                          incl. US ${groupShippingPrice.toFixed(2)} shipping
                        </div>
                        {sessionDiscountAmount > 0 && (
                          <span className="text-[10px] text-green-700 font-medium">
                            Saved: -US ${sessionDiscountAmount.toFixed(2)}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center justify-end">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs cursor-pointer hover:text-blue-500 hover:bg-blue-400/20 text-blue-600 "
                      >
                        {isExpanded ? "Hide items" : "Show items"}
                      </Button>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="p-4 pt-2 space-y-6">
                      {group.orders.map((order, orderIdx) => (
                        <div key={order._id} className="space-y-4">
                          <Separator
                            className={orderIdx === 0 ? "hidden" : "block mt-2"}
                          />

                          {/* Seller Sub-Header */}
                          <div className="flex items-center justify-between text-[11px] font-bold text-muted-foreground uppercase px-2">
                            <span className="flex items-center gap-2">
                              Seller:{" "}
                              <span className="text-blue-600 underline cursor-pointer">
                                {order.seller?.username}
                              </span>
                            </span>
                            <span className="text-emerald-700">
                              Order: {shortOrderNumber(order._id)}
                            </span>
                          </div>

                          {order.items.map((item, itemIdx) => {
                            const statusMeta = getStatusMeta(order.status);
                            return (
                              <div
                                key={itemIdx}
                                className="flex flex-wrap items-start justify-between gap-4 px-2"
                              >
                                {/* LEFT: Image */}
                                <div className="flex gap-3">
                                  <div className="flex h-24 w-24 items-center justify-center rounded border bg-muted overflow-hidden">
                                    {item.productId?.imageUrl ? (
                                      <img
                                        src={item.productId.imageUrl}
                                        alt={item.productId.title || item.title}
                                        className="h-full w-full object-cover"
                                      />
                                    ) : (
                                      <span className="text-xs text-muted-foreground text-center px-2">
                                        No image
                                      </span>
                                    )}
                                  </div>
                                </div>

                                {/* MIDDLE: Info & Status */}
                                <div className="flex-1 space-y-2 text-sm">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleViewOrderDetails(order._id)
                                    }
                                    className="font-medium leading-snug text-left hover:text-blue-600 hover:underline cursor-pointer"
                                    title="View order detail"
                                  >
                                    {item.productId?.title || item.title}
                                  </button>
                                  {item.selectedVariants?.length ? (
                                    <div className="text-xs text-muted-foreground">
                                      Variant:{" "}
                                      {item.selectedVariants
                                        .map((v) => `${v.name}: ${v.value}`)
                                        .join(", ")}
                                    </div>
                                  ) : null}
                                  <div className="text-xs font-semibold">
                                    Quantity: {item.quantity} | Item Price: US $
                                    {item.unitPrice?.toFixed(2)}
                                  </div>

                                  {/* Status Display matching eBay style */}
                                  <div className="flex items-start gap-2 text-xs pt-1">
                                    <span
                                      className={`mt-1 inline-block h-3 w-3 rounded-full ${statusMeta.dotClass}`}
                                    />
                                    <div>
                                      <div
                                        className={`font-medium ${statusMeta.textClass}`}
                                      >
                                        {statusMeta.label} on{" "}
                                        {formatDate(order.createdAt)}
                                      </div>
                                      <div className="text-muted-foreground">
                                        Tracking number: -
                                      </div>
                                      <div className="flex items-center gap-2 mt-1">
                                        <span className="text-[10px] text-muted-foreground font-medium uppercase">
                                          Payment:
                                        </span>
                                        <span
                                          className={`px-2 py-0.5 rounded-sm font-bold text-[10px] uppercase ${
                                            order.paymentStatus === "paid"
                                              ? "bg-emerald-100 text-emerald-700"
                                              : order.paymentStatus === "unpaid"
                                                ? "bg-amber-100 text-amber-700"
                                                : "bg-red-100 text-red-700"
                                          }`}
                                        >
                                          {order.paymentStatus === "unpaid"
                                            ? "Unpaid"
                                            : order.paymentStatus === "paid"
                                              ? "Paid"
                                              : order.paymentStatus || "Unpaid"}
                                        </span>
                                      </div>
                                      <div className="text-muted-foreground text-[11px] italic">
                                        {statusMeta.note}
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                {/* RIGHT: Actions preserve all original buttons */}
                                <div className="flex flex-col items-end gap-2 text-sm">
                                  <Button
                                    size="sm"
                                    className="w-40 cursor-pointer rounded-none bg-blue-600 text-white hover:bg-blue-700"
                                    onClick={() =>
                                      handleViewOrderDetails(order._id)
                                    }
                                  >
                                    View detail
                                  </Button>

                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="w-40 cursor-pointer hover:text-blue-500 rounded-none border-blue-600 text-blue-600 hover:bg-blue-50"
                                    onClick={() =>
                                      navigate(
                                        `/products?search=${encodeURIComponent(item.productId?.title || item.title)}`,
                                      )
                                    }
                                  >
                                    View similar items
                                  </Button>

                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="w-40 cursor-pointer hover:text-blue-500 rounded-none border-blue-600 text-blue-600 hover:bg-blue-50"
                                    onClick={() =>
                                      navigate(
                                        `/purchases/${order._id}/feedback/${item.productId?._id || ""}`,
                                      )
                                    }
                                  >
                                    Leave feedback
                                  </Button>

                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="w-40 cursor-pointer hover:text-blue-500 rounded-none border-blue-600 text-blue-600 hover:bg-blue-50"
                                      >
                                        More actions
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent
                                      align="end"
                                      className="w-52 text-xs"
                                    >
                                      <DropdownMenuItem
                                        className="cursor-pointer hover:bg-muted/80"
                                        onClick={() =>
                                          handleViewOrderDetails(order._id)
                                        }
                                      >
                                        View order details
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        className="cursor-pointer hover:bg-muted/80"
                                        onClick={() =>
                                          handleContactSeller(
                                            order.seller?._id || "",
                                            item.productId?._id || "",
                                          )
                                        }
                                      >
                                        Contact seller
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        className="cursor-pointer hover:bg-muted/80"
                                        onClick={() =>
                                          navigate(
                                            `/purchases/${order._id}/complaint/${item.productId?._id || ""}?reason=not_received`,
                                          )
                                        }
                                      >
                                        I didn&apos;t receive it
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        className="cursor-pointer hover:bg-muted/80"
                                        onClick={() =>
                                          navigate(
                                            `/products?seller=${order.seller?._id || ""}`,
                                          )
                                        }
                                      >
                                        View seller&apos;s other items
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        className="cursor-pointer hover:bg-muted/80"
                                        onClick={() =>
                                          navigate("/sell/create", {
                                            state: {
                                              prefillData: {
                                                title:
                                                  item.productId?.title ||
                                                  item.title,
                                              },
                                            },
                                          })
                                        }
                                      >
                                        Sell this item
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        className="cursor-pointer hover:bg-muted/80"
                                        onClick={() =>
                                          handleToggleSaveSeller(
                                            order.seller?._id || "",
                                            order.seller?.username || "",
                                          )
                                        }
                                        disabled={processingActions.has(
                                          `save-${order.seller?._id}`,
                                        )}
                                      >
                                        {savedSellers.has(
                                          order.seller?._id || "",
                                        )
                                          ? "Unsave this seller"
                                          : "Save this seller"}
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        className="cursor-pointer hover:bg-muted/80"
                                        onClick={() =>
                                          handleHideOrder(order._id)
                                        }
                                        disabled={processingActions.has(
                                          `hide-${order._id}`,
                                        )}
                                      >
                                        Hide order
                                      </DropdownMenuItem>
                                      {(order.status.toLowerCase() ===
                                        "created" ||
                                        order.status.toLowerCase() ===
                                          "packaging") && (
                                        <DropdownMenuItem
                                          className="cursor-pointer text-red-600 hover:bg-red-50 focus:text-red-600"
                                          onClick={() => {
                                            setOrderIdToCancel(order._id);
                                            setCancelReason("");
                                            setCancelOtherText("");
                                            setCancelDialogOpen(true);
                                          }}
                                        >
                                          Cancel Order
                                        </DropdownMenuItem>
                                      )}
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Pagination Controls */}
      {!loading && totalPages > 1 && (
        <div className="mt-8 flex items-center justify-center gap-2 pb-8">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="cursor-pointer"
          >
            Previous
          </Button>

          <div className="flex items-center gap-1 mx-2">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <Button
                key={p}
                variant={page === p ? "default" : "ghost"}
                size="sm"
                onClick={() => setPage(p)}
                className={`w-8 h-8 p-0 cursor-pointer ${page === p ? "bg-blue-600 hover:bg-blue-700" : ""}`}
              >
                {p}
              </Button>
            ))}
          </div>

          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="cursor-pointer"
          >
            Next
          </Button>
        </div>
      )}

      {/* Chat Dialog */}
      <Dialog open={chatOpen} onOpenChange={setChatOpen}>
        <DialogContent
          className="h-fit overflow-auto flex flex-col p-0 gap-0 left-[unset] right-0 top-[unset] bottom-0 translate-0 m-4"
          aria-describedby=""
          showCloseButton={false}
        >
          <DialogTitle hidden>Chat box</DialogTitle>
          <MessageContext.Provider
            value={{
              participants,
              setParticipants: setParticipantsState,
              conversation,
              setConversation,
              messages,
              setMessages,
              productRef,
              setProductRef,
              product: productContext,
            }}
          >
            <Messages onCloseDialog={() => setChatOpen(false)} />
          </MessageContext.Provider>
        </DialogContent>
      </Dialog>

      {/* Cancel Order Confirmation Dialog */}
      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Order</AlertDialogTitle>
            <AlertDialogDescription>
              Please select a reason for cancelling this order. This action
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
              onClick={() => {
                setCancelDialogOpen(false);
                setOrderIdToCancel(null);
                setCancelReason("");
                setCancelOtherText("");
              }}
            >
              Keep Order
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={handleCancelOrder}
              disabled={
                processingActions.has(`cancel-${orderIdToCancel}`) ||
                !cancelReason
              }
            >
              {processingActions.has(`cancel-${orderIdToCancel}`)
                ? "Cancelling..."
                : "Confirm Cancel"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
