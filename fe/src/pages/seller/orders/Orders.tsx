import { useState, useEffect } from "react";
import {
  Search,
  Truck,
  CheckCircle,
  Clock,
  XCircle,
  Package,
  Eye,
  MoreVertical,
  X,
  User,
  CreditCard,
  MapPin,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { type Order, orderService } from "@/services/orderService";
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
import { Textarea } from "@/components/ui/textarea";

// ─── Status config ────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  created: {
    label: "New Order",
    dot: "#F59E0B",
    bg: "#FFFBEB",
    text: "#92400E",
    border: "#FDE68A",
  },
  packaging: {
    label: "Packaging",
    dot: "#3B82F6",
    bg: "#EFF6FF",
    text: "#1E40AF",
    border: "#BFDBFE",
  },
  ready_to_ship: {
    label: "Ready to Ship",
    dot: "#3B82F6",
    bg: "#EFF6FF",
    text: "#1E40AF",
    border: "#BFDBFE",
  },
  shipping: {
    label: "Shipping",
    dot: "#8B5CF6",
    bg: "#F5F3FF",
    text: "#4C1D95",
    border: "#DDD6FE",
  },
  delivered: {
    label: "Delivered",
    dot: "#059669",
    bg: "#D1FAE5",
    text: "#064E3B",
    border: "#6EE7B7",
  },
  completed: {
    label: "Completed",
    dot: "#059669",
    bg: "#D1FAE5",
    text: "#064E3B",
    border: "#6EE7B7",
  },
  cancelled: {
    label: "Cancelled",
    dot: "#EF4444",
    bg: "#FEF2F2",
    text: "#7F1D1D",
    border: "#FECACA",
  },
  failed: {
    label: "Failed",
    dot: "#EF4444",
    bg: "#FEF2F2",
    text: "#7F1D1D",
    border: "#FECACA",
  },
  returned: {
    label: "Returned",
    dot: "#EF4444",
    bg: "#FEF2F2",
    text: "#7F1D1D",
    border: "#FECACA",
  },
} as const;

const PAYMENT_STATUS_CONFIG = {
  unpaid: {
    label: "Unpaid",
    dot: "#EAB308",
    bg: "#FEFCE8",
    text: "#A16207",
    border: "#FEF08A",
  },
  paid: {
    label: "Paid",
    dot: "#22C55E",
    bg: "#F0FDF4",
    text: "#15803D",
    border: "#BBF7D0",
  },
  failed: {
    label: "Failed",
    dot: "#EF4444",
    bg: "#FEF2F2",
    text: "#B91C1C",
    border: "#FECACA",
  },
  refunded: {
    label: "Refunded",
    dot: "#6B7280",
    bg: "#F9FAFB",
    text: "#374151",
    border: "#E5E7EB",
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatDate(dateString?: string) {
  if (!dateString) return "—";
  return new Date(dateString).toLocaleString("en-US", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function InfoBlock({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          background: "#F8FAFC",
          border: "1px solid #E2E8F0",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          marginTop: 2,
        }}
      >
        {icon}
      </div>
      <div>
        <p
          style={{
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: "0.06em",
            color: "#94A3B8",
            textTransform: "uppercase",
            marginBottom: 4,
          }}
        >
          {label}
        </p>
        {children}
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: Order["status"] }) {
  const cfg = STATUS_CONFIG[status] ?? {
    label: "Unknown",
    dot: "#94A3B8",
    bg: "#F8FAFC",
    text: "#475569",
    border: "#E2E8F0",
  };
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "4px 12px",
        borderRadius: 999,
        background: cfg.bg,
        color: cfg.text,
        border: `1px solid ${cfg.border}`,
        fontSize: 12,
        fontWeight: 600,
        letterSpacing: "0.03em",
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: cfg.dot,
          flexShrink: 0,
        }}
      />
      {cfg.label}
    </span>
  );
}

function PaymentStatusPill({
  paymentStatus,
}: {
  paymentStatus: Order["paymentStatus"];
}) {
  const cfg = PAYMENT_STATUS_CONFIG[paymentStatus] ?? {
    label: "Unknown",
    dot: "#94A3B8",
    bg: "#F8FAFC",
    text: "#475569",
    border: "#E2E8F0",
  };

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "4px 12px",
        borderRadius: 999,
        background: cfg.bg,
        color: cfg.text,
        border: `1px solid ${cfg.border}`,
        fontSize: 12,
        fontWeight: 600,
        letterSpacing: "0.03em",
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: cfg.dot,
          flexShrink: 0,
        }}
      />
      {cfg.label}
    </span>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
function OrderDetailsPopup({
  order,
  onClose,
}: {
  order: Order | null;
  onClose: () => void;
}) {
  if (!order) return null;

  const subtotal =
    order.orderDetails?.reduce(
      (sum, i) => sum + (i.unitPrice ?? 0) * (i.quantity ?? 1),
      0,
    ) ??
    order.total ??
    0;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(15,23,42,0.45)",
          backdropFilter: "blur(4px)",
          zIndex: 50,
          animation: "fadeIn 0.2s ease",
        }}
      />

      {/* Panel */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 51,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 16,
        }}
      >
        <div
          style={{
            background: "#FFFFFF",
            borderRadius: 20,
            boxShadow:
              "0 25px 60px rgba(15,23,42,0.18), 0 0 0 1px rgba(148,163,184,0.12)",
            width: "100%",
            maxWidth: 820,
            maxHeight: "92vh",
            display: "flex",
            flexDirection: "column",
            animation: "slideUp 0.25s cubic-bezier(0.16,1,0.3,1)",
            fontFamily: "'DM Sans', 'Geist', system-ui, sans-serif",
          }}
        >
          {/* ── Header ── */}
          <div
            style={{
              padding: "24px 28px 20px",
              borderBottom: "1px solid #F1F5F9",
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
            }}
          >
            <div>
              <h2
                style={{
                  fontSize: 22,
                  fontWeight: 700,
                  color: "#0F172A",
                  margin: 0,
                  letterSpacing: "-0.02em",
                }}
              >
                Order Details
              </h2>
              <p style={{ fontSize: 13, color: "#64748B", marginTop: 3 }}>
                {order.orderId || order._id}
              </p>
            </div>
            <button
              onClick={onClose}
              style={{
                width: 34,
                height: 34,
                borderRadius: 10,
                border: "1px solid #E2E8F0",
                background: "#F8FAFC",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#64748B",
                transition: "all 0.15s",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background =
                  "#F1F5F9";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background =
                  "#F8FAFC";
              }}
            >
              <X size={16} />
            </button>
          </div>

          {/* ── Body ── */}
          <div style={{ overflowY: "auto", padding: "24px 28px", flex: 1 }}>
            {/* Info grid */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "28px 48px",
                marginBottom: 32,
              }}
            >
              {/* Customer */}
              <InfoBlock
                icon={<User size={16} color="#6366F1" />}
                label="Customer"
              >
                <p
                  style={{
                    fontWeight: 700,
                    color: "#0F172A",
                    fontSize: 15,
                    margin: "0 0 2px",
                  }}
                >
                  {order.username}
                </p>
                <p style={{ color: "#64748B", fontSize: 13, margin: 0 }}>
                  {order.email}
                </p>
                {order.phone && (
                  <p
                    style={{
                      color: "#64748B",
                      fontSize: 13,
                      margin: "2px 0 0",
                    }}
                  >
                    {order.phone}
                  </p>
                )}
              </InfoBlock>

              {/* Order Time */}
              <InfoBlock
                icon={<Clock size={16} color="#8B5CF6" />}
                label="Order Time"
              >
                <p
                  style={{
                    fontWeight: 600,
                    color: "#0F172A",
                    fontSize: 14,
                    margin: 0,
                  }}
                >
                  {formatDate(order.createdAt || order.date)}
                </p>
                {order.updatedAt && order.updatedAt !== order.createdAt && (
                  <p
                    style={{
                      color: "#94A3B8",
                      fontSize: 12,
                      margin: "3px 0 0",
                    }}
                  >
                    Updated {formatDate(order.updatedAt)}
                  </p>
                )}
              </InfoBlock>

              {/* Address */}
              {order.address && (
                <InfoBlock
                  icon={<MapPin size={16} color="#F43F5E" />}
                  label="Delivery Address"
                >
                  <p
                    style={{
                      color: "#334155",
                      fontSize: 13,
                      margin: 0,
                      lineHeight: 1.5,
                    }}
                  >
                    {order.address}
                  </p>
                </InfoBlock>
              )}

              <InfoBlock
                icon={<Package size={16} color="#F59E0B" />}
                label="Status"
              >
                <div style={{ marginTop: 2 }}>
                  <StatusPill status={order.status} />
                </div>
              </InfoBlock>

              {/* Payment + Status */}
              <InfoBlock
                icon={<CreditCard size={16} color="#10B981" />}
                label="Payment"
              >
                <p
                  style={{
                    fontWeight: 600,
                    color: "#0F172A",
                    fontSize: 14,
                    margin: 0,
                    textTransform: "uppercase",
                    letterSpacing: "0.04em",
                  }}
                >
                  {order.paymentMethod}
                </p>
              </InfoBlock>
              <InfoBlock
                icon={<Wallet size={16} color="#F59E0B" />}
                label="Payment Status"
              >
                <div style={{ marginTop: 2 }}>
                  <PaymentStatusPill paymentStatus={order.paymentStatus} />
                </div>
              </InfoBlock>

              {/* Note */}
              {order.note && (
                <div style={{ gridColumn: "1 / -1" }}>
                  <InfoBlock
                    icon={
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          width: 16,
                          height: 16,
                        }}
                      >
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="#F59E0B"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path>
                          <polyline points="14 2 14 8 20 8"></polyline>
                          <line x1="16" y1="13" x2="8" y2="13"></line>
                          <line x1="16" y1="17" x2="8" y2="17"></line>
                          <line x1="10" y1="9" x2="8" y2="9"></line>
                        </svg>
                      </div>
                    }
                    label="Note from Buyer"
                  >
                    <p
                      style={{
                        color: "#475569",
                        fontSize: 13,
                        margin: 0,
                        lineHeight: 1.5,
                        fontStyle: "italic",
                        backgroundColor: "#FFFBEB",
                        padding: "8px 12px",
                        borderRadius: "8px",
                        border: "1px solid #FEF3C7",
                        borderLeft: "3px solid #F59E0B",
                      }}
                    >
                      "{order.note}"
                    </p>
                  </InfoBlock>
                </div>
              )}
              {order.status === "cancelled" &&
                order.statusHistory &&
                (() => {
                  const cancelEntry = order.statusHistory.find(
                    (h) => h.status === "cancelled" && h.note && h.note.trim(),
                  );
                  if (!cancelEntry) return null;
                  return (
                    <div style={{ gridColumn: "1 / -1" }}>
                      <InfoBlock
                        icon={<XCircle size={16} color="#EF4444" />}
                        label="Cancellation Reason"
                      >
                        <p
                          style={{
                            color: "#B91C1C",
                            fontSize: 13,
                            margin: 0,
                            lineHeight: 1.5,
                            fontStyle: "italic",
                            backgroundColor: "#FEF2F2",
                            padding: "8px 12px",
                            borderRadius: "8px",
                            border: "1px solid #FECACA",
                          }}
                        >
                          "{cancelEntry.note}"
                        </p>
                      </InfoBlock>
                    </div>
                  );
                })()}
            </div>

            {/* ── Products table ── */}
            <div>
              <h3
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  color: "#94A3B8",
                  margin: "0 0 12px",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <Package size={13} />
                Products · {order.orderDetails?.length || order.items || 0} item
                {(order.orderDetails?.length ?? 1) !== 1 ? "s" : ""}
              </h3>

              <div
                style={{
                  border: "1px solid #E2E8F0",
                  borderRadius: 14,
                  overflow: "hidden",
                }}
              >
                {/* Table head */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 120px 80px 110px",
                    background: "#F8FAFC",
                    borderBottom: "1px solid #E2E8F0",
                    padding: "10px 16px",
                  }}
                >
                  {["Product", "Unit Price", "Qty", "Subtotal"].map((h) => (
                    <span
                      key={h}
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        color: "#94A3B8",
                        letterSpacing: "0.06em",
                        textTransform: "uppercase",
                      }}
                    >
                      {h}
                    </span>
                  ))}
                </div>

                {/* Rows */}
                {order.orderDetails && order.orderDetails.length > 0 ? (
                  order.orderDetails.map((item, i) => (
                    <div
                      key={i}
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        borderTop: i > 0 ? "1px solid #F1F5F9" : "none",
                      }}
                    >
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "1fr 120px 80px 110px",
                          padding: "14px 16px",
                          alignItems: "center",
                          transition: "background 0.1s",
                        }}
                        onMouseEnter={(e) => {
                          (e.currentTarget as HTMLDivElement).style.background =
                            "#F8FAFC";
                        }}
                        onMouseLeave={(e) => {
                          (e.currentTarget as HTMLDivElement).style.background =
                            "transparent";
                        }}
                      >
                        {/* Product cell */}
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 12,
                          }}
                        >
                          {item.productImage ? (
                            <img
                              src={item.productImage}
                              alt={item.productName}
                              style={{
                                width: 44,
                                height: 44,
                                borderRadius: 10,
                                objectFit: "cover",
                                border: "1px solid #E2E8F0",
                              }}
                            />
                          ) : (
                            <div
                              style={{
                                width: 44,
                                height: 44,
                                borderRadius: 10,
                                background:
                                  "linear-gradient(135deg, #EEF2FF, #E0E7FF)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                border: "1px solid #E0E7FF",
                              }}
                            >
                              <Package size={18} color="#818CF8" />
                            </div>
                          )}
                          <div>
                            <p
                              style={{
                                fontWeight: 600,
                                color: "#0F172A",
                                fontSize: 14,
                                margin: "0 0 2px",
                              }}
                            >
                              {item.productName}
                            </p>
                            {item.selectedVariants?.length ? (
                              <p
                                style={{
                                  fontSize: 12,
                                  color: "#64748B",
                                  margin: "0 0 2px",
                                }}
                              >
                                {item.selectedVariants
                                  .map((v) => `${v.name}: ${v.value}`)
                                  .join(" · ")}
                              </p>
                            ) : null}
                            <p
                              style={{
                                fontSize: 11,
                                color: "#D1D1D1",
                                margin: 0,
                              }}
                            >
                              ID: {item.productId}
                              {item.variantSku
                                ? ` · SKU: ${item.variantSku}`
                                : ""}
                            </p>
                          </div>
                        </div>

                        <span style={{ color: "#475569", fontSize: 14 }}>
                          ${item.unitPrice?.toFixed(2) ?? "0.00"}
                        </span>
                        <span style={{ color: "#475569", fontSize: 14 }}>
                          {item.quantity}
                        </span>
                        <span
                          style={{
                            fontWeight: 600,
                            color: "#0F172A",
                            fontSize: 14,
                            justifySelf: "end",
                          }}
                        >
                          ${item.subtotal?.toFixed(2) ?? "0.00"}
                        </span>
                      </div>
                      {item.note && (
                        <div
                          style={{
                            margin: "0 16px 12px",
                            padding: "8px 12px",
                            background: "#FEF3C7", // yellow-100
                            border: "1px solid #FDE68A", // yellow-200
                            borderRadius: 8,
                            fontSize: 13,
                            color: "#92400E", // yellow-800
                            fontStyle: "italic",
                          }}
                        >
                          Note: "{item.note}"
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 120px 80px 110px",
                      padding: "14px 16px",
                      alignItems: "center",
                    }}
                  >
                    <span style={{ color: "#475569", fontSize: 14 }}>
                      Ordered Product
                    </span>
                    <span style={{ color: "#475569", fontSize: 14 }}>
                      ${order.total?.toFixed(2) ?? "0.00"}
                    </span>
                    <span style={{ color: "#475569", fontSize: 14 }}>
                      {order.items}
                    </span>
                    <span
                      style={{
                        fontWeight: 700,
                        color: "#0F172A",
                        fontSize: 14,
                      }}
                    >
                      ${order.total?.toFixed(2) ?? "0.00"}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* ── Total ── */}
            <div
              style={{
                marginTop: 20,
                display: "flex",
                justifyContent: "flex-end",
              }}
            >
              <div
                style={{
                  background:
                    "linear-gradient(135deg, #EEF2FF 0%, #F5F3FF 100%)",
                  border: "1px solid #E0E7FF",
                  borderRadius: 14,
                  padding: "14px 24px",
                  display: "flex",
                  alignItems: "center",
                  gap: 48,
                  minWidth: 260,
                }}
              >
                <span
                  style={{
                    fontWeight: 600,
                    color: "#64748B",
                    fontSize: 14,
                    letterSpacing: "0.02em",
                  }}
                >
                  Order Total
                </span>
                <span
                  style={{
                    fontWeight: 800,
                    color: "#4F46E5",
                    fontSize: 22,
                    letterSpacing: "-0.03em",
                  }}
                >
                  ${(order.total ?? subtotal).toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* ── Footer ── */}
          <div
            style={{
              borderTop: "1px solid #F1F5F9",
              padding: "16px 28px",
              display: "flex",
              justifyContent: "flex-end",
              gap: 10,
            }}
          >
            <button
              onClick={onClose}
              style={{
                padding: "9px 20px",
                borderRadius: 10,
                border: "1px solid #E2E8F0",
                background: "#F8FAFC",
                color: "#475569",
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.15s",
                fontFamily: "inherit",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background =
                  "#F1F5F9";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background =
                  "#F8FAFC";
              }}
            >
              Close
            </button>
          </div>
        </div>
      </div>

      {/* Animations */}
      <style>{`
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px) scale(0.97) } to { opacity: 1; transform: translateY(0) scale(1) } }
      `}</style>
    </>
  );
}

export default function SellerOrders() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showOrderDetails, setShowOrderDetails] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // cancellation UI state
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [orderIdToCancel, setOrderIdToCancel] = useState<string | null>(null);
  const [cancelProcessing, setCancelProcessing] = useState(false);

  useEffect(() => {
    fetchOrders();
    fetchStats();
  }, [selectedStatus]);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (selectedStatus !== "all") params.status = selectedStatus;
      const result = await orderService.getOrders(params);
      setOrders(result.orders);
    } catch (error) {
      console.error("Error fetching orders:", error);
      toast.error("Unable to load orders list");
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const statsData = await orderService.getOrderStats();
      setStats(statsData);
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  const handleViewOrderDetails = async (orderId: string) => {
    setLoadingDetails(true);
    try {
      const orderDetails = await orderService.getOrderById(orderId);
      if (orderDetails) {
        setSelectedOrder(orderDetails);
        setShowOrderDetails(true);
      } else {
        toast.error("Unable to load order details");
      }
    } catch (error) {
      console.error("Error fetching order details:", error);
      toast.error("An error occurred while loading order details");
    } finally {
      setLoadingDetails(false);
    }
  };

  const statuses = [
    { value: "all", label: "All", icon: Package },
    { value: "created", label: "New Order", icon: Clock },
    { value: "packaging", label: "Packaging", icon: Package },
    { value: "ready_to_ship", label: "Ready to Ship", icon: Package },
    { value: "shipping", label: "Shipping", icon: Truck },
    { value: "delivered", label: "Delivered", icon: CheckCircle },
    { value: "cancelled", label: "Cancelled", icon: XCircle },
    { value: "completed", label: "Completed", icon: CheckCircle },
    { value: "failed", label: "Failed", icon: XCircle },
  ];

  const filteredOrders = orders.filter((order) => {
    const term = searchTerm.toLowerCase();
    return (
      order._id.toLowerCase().includes(term) ||
      order.username.toLowerCase().includes(term) ||
      order.email.toLowerCase().includes(term)
    );
  });

  const getStatusBadge = (status: Order["status"]) => {
    switch (status) {
      case "created":
        return (
          <Badge
            variant="outline"
            className="border-yellow-300 text-yellow-800 bg-yellow-50"
          >
            New Order
          </Badge>
        );

      case "packaging":
        return (
          <Badge
            variant="outline"
            className="border-blue-300 text-blue-800 bg-blue-50"
          >
            Packaging
          </Badge>
        );
      case "ready_to_ship":
        return (
          <Badge
            variant="outline"
            className="border-blue-300 text-blue-800 bg-blue-50"
          >
            Ready to Ship
          </Badge>
        );
      case "shipping":
        return (
          <Badge
            variant="outline"
            className="border-purple-300 text-purple-800 bg-purple-50"
          >
            Shipping
          </Badge>
        );
      case "delivered":
        return (
          <Badge
            variant="outline"
            className="border-green-300 text-green-800 bg-green-50"
          >
            Delivered
          </Badge>
        );
      case "completed":
        return (
          <Badge
            variant="outline"
            className="border-emerald-400 text-emerald-800 bg-emerald-50"
          >
            Completed
          </Badge>
        );
      case "returned":
        return (
          <Badge
            variant="outline"
            className="border-purple-300 text-purple-800 bg-purple-50"
          >
            Returned
          </Badge>
        );
      case "cancelled":
        return (
          <Badge
            variant="outline"
            className="border-red-300 text-red-800 bg-red-50"
          >
            Cancelled
          </Badge>
        );
      case "failed":
        return (
          <Badge
            variant="outline"
            className="border-red-300 text-red-800 bg-red-50"
          >
            Failed
          </Badge>
        );
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const handleUpdateStatus = async (
    orderId: string,
    newStatus: Order["status"],
  ) => {
    try {
      const success = await orderService.updateOrderStatus(orderId, newStatus);
      if (!success) {
        toast.error("Update failed");
        return;
      }

      toast.success(`Updated order status ${orderId}`);
      fetchOrders();
      fetchStats();

      if (selectedOrder && selectedOrder._id === orderId) {
        const updatedOrder = await orderService.getOrderById(orderId);
        setSelectedOrder(updatedOrder);
      }
    } catch {
      toast.error("An error occurred while updating");
    }
  };

  const openCancelDialog = (orderId: string) => {
    setOrderIdToCancel(orderId);
    setCancelReason("");
    setCancelDialogOpen(true);
  };

  const handleCancelWithReason = async () => {
    if (!orderIdToCancel) return;
    if (!cancelReason.trim()) {
      toast.error("Please provide a reason for cancellation");
      return;
    }
    setCancelProcessing(true);
    try {
      const success = await orderService.updateOrderStatus(
        orderIdToCancel,
        "cancelled",
        cancelReason.trim(),
      );
      if (success) {
        toast.success("Order cancelled successfully");
        fetchOrders();
        fetchStats();
        if (selectedOrder && selectedOrder._id === orderIdToCancel) {
          const updated = await orderService.getOrderById(orderIdToCancel);
          setSelectedOrder(updated);
        }
      } else {
        toast.error("Failed to cancel order");
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to cancel order");
    } finally {
      setCancelProcessing(false);
      setCancelDialogOpen(false);
      setOrderIdToCancel(null);
    }
  };

  const totalRevenue = stats?.totalRevenue || 0;

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading orders...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 relative">
      {showOrderDetails && (
        <OrderDetailsPopup
          order={selectedOrder}
          onClose={() => {
            setShowOrderDetails(false);
            setSelectedOrder(null);
          }}
        />
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Order Management</h1>
          <p className="text-gray-600">
            {filteredOrders.length} orders - Total revenue: $
            {totalRevenue.toFixed(2)}
            {stats && ` | Total orders: ${stats.totalOrders || 0}`}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        {statuses.slice(1).map((status) => {
          const Icon = status.icon;
          const count = stats?.counts?.[status.value] || 0;
          return (
            <Card key={status.value}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-gray-50">
                    <Icon className="h-5 w-5 text-gray-600" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold">{count}</div>
                    <div className="text-sm text-gray-600">{status.label}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by ID, customer name, or email..."
                  className="pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            <div className="flex w-[80%] gap-2 overflow-x-auto flex-wrap">
              {statuses.map((status) => {
                const Icon = status.icon;
                return (
                  <Button
                    key={status.value}
                    variant={
                      selectedStatus === status.value ? "default" : "outline"
                    }
                    size="sm"
                    onClick={() => setSelectedStatus(status.value)}
                    className="whitespace-nowrap cursor-pointer"
                  >
                    <Icon className="h-4 w-4 mr-2" />
                    {status.label}
                  </Button>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-4 font-medium text-gray-600">
                    Order ID
                  </th>
                  <th className="text-left p-4 font-medium text-gray-600">
                    Customer
                  </th>
                  <th className="text-left p-4 font-medium text-gray-600">
                    Quantity
                  </th>
                  <th className="text-left p-4 font-medium text-gray-600">
                    Total
                  </th>
                  <th className="text-left p-4 font-medium text-gray-600">
                    Payment Status
                  </th>
                  <th className="text-left p-4 font-medium text-gray-600">
                    Status
                  </th>
                  <th className="text-left p-4 font-medium text-gray-600">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((order) => (
                  <tr key={order._id} className="border-b hover:bg-gray-50">
                    <td className="p-4">
                      <div className="font-medium">
                        {order.orderId || order._id}
                      </div>
                      <div className="text-sm text-gray-500">
                        {order.paymentMethod}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="font-medium">{order.username}</div>
                      <div className="text-sm text-gray-500">{order.email}</div>
                    </td>
                    <td className="p-4">{order.items} products</td>
                    <td className="p-4 font-medium">
                      ${order.total.toFixed(2)}
                    </td>
                    <td className="p-4">
                      <PaymentStatusPill paymentStatus={order.paymentStatus} />
                    </td>
                    <td className="p-4">{getStatusBadge(order.status)}</td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewOrderDetails(order._id)}
                          disabled={loadingDetails}
                          className="cursor-pointer"
                        >
                          {loadingDetails &&
                          selectedOrder?._id === order._id ? (
                            <div className="h-4 w-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                        <DropdownMenu>
                          {["created", "packaging"].includes(order.status) && (
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                className="cursor-pointer"
                                size="sm"
                              >
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                          )}
                          <DropdownMenuContent align="end">
                            {order.status === "created" && (
                              <DropdownMenuItem
                                className="cursor-pointer"
                                onClick={() =>
                                  handleUpdateStatus(order._id, "packaging")
                                }
                              >
                                <Truck className="h-4 w-4 mr-2" />
                                Mark as Packaging
                              </DropdownMenuItem>
                            )}
                            {order.status === "packaging" && (
                              <DropdownMenuItem
                                className="cursor-pointer"
                                onClick={() =>
                                  handleUpdateStatus(order._id, "ready_to_ship")
                                }
                              >
                                <Truck className="h-4 w-4 mr-2" />
                                Mark as Ready to Ship
                              </DropdownMenuItem>
                            )}
                            {["created", "packaging", "ready_to_ship"].includes(
                              order.status,
                            ) && (
                              <DropdownMenuItem
                                className="cursor-pointer text-red-600"
                                onClick={() => openCancelDialog(order._id)}
                              >
                                <XCircle className="h-4 w-4 mr-2" />
                                Cancel Order
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {filteredOrders.length === 0 && (
        <div className="text-center py-12">
          <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No orders found
          </h3>
          <p className="text-gray-600">
            Try changing filters or search keywords
          </p>
        </div>
      )}

      {/* Cancel order dialog for seller */}
      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Order</AlertDialogTitle>
            <AlertDialogDescription>
              Please provide a reason for cancelling this order. The buyer will
              see it in their order details and in the notification/email.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="mt-2">
            <Textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Reason for cancellation"
              rows={4}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setCancelDialogOpen(false);
                setOrderIdToCancel(null);
              }}
            >
              Keep Order
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={handleCancelWithReason}
              disabled={cancelProcessing || !cancelReason.trim()}
            >
              {cancelProcessing ? "Cancelling..." : "Confirm Cancel"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
