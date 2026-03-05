import { useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, useAnimation } from "framer-motion";
import {
  CheckCircle2,
  ShoppingBag,
  Settings2,
  Truck,
  PackageCheck,
  Star,
  ShoppingCart,
  ReceiptText,
  MapPin,
} from "lucide-react";
import { Button } from "@/components/ui/button";

type CheckoutSuccessState = {
  orderGroupId?: string;
  orders?: {
    _id: string;
    totalAmount: number;
    subtotalAmount?: number;
    discountAmount?: number;
    status: string;
  }[];
  totalAmount?: number;
  subtotalAmount?: number;
  discountAmount?: number;
  shippingPrice?: number;
  shippingAddress?: {
    fullName: string;
    phone: string;
    country?: string;
    city?: string;
    district?: string;
    ward?: string;
    street?: string;
    detail?: string;
  };
  paymentMethod?: string;
};

function Particle({ x, y, color }: { x: number; y: number; color: string }) {
  return (
    <motion.div
      className="absolute w-2 h-2 rounded-full"
      style={{ left: "50%", top: "20%", backgroundColor: color }}
      initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
      animate={{ x, y, opacity: 0, scale: 0 }}
      transition={{
        duration: 1.2,
        ease: "easeOut",
        delay: Math.random() * 0.4,
      }}
    />
  );
}

const PARTICLES = Array.from({ length: 24 }, (_, i) => ({
  id: i,
  x: (Math.random() - 0.5) * 300,
  y: -(Math.random() * 250 + 50),
  color: ["#3b82f6", "#60a5fa", "#93c5fd", "#1d4ed8", "#bfdbfe", "#2563eb"][
    i % 6
  ],
}));

const STEPS = [
  { key: "created", label: "Order Placed", Icon: ShoppingBag },
  { key: "processing", label: "Processing", Icon: Settings2 },
  { key: "shipped", label: "Shipping", Icon: Truck },
  { key: "delivered", label: "Delivered", Icon: PackageCheck },
  { key: "completed", label: "Completed", Icon: Star },
];

const STATUS_RANK: Record<string, number> = {
  created: 0,
  processing: 1,
  shipped: 2,
  delivered: 3,
  completed: 4,
};

const FadeIn = ({
  children,
  delay = 0,
  y = 24,
}: {
  children: React.ReactNode;
  delay?: number;
  y?: number;
}) => (
  <motion.div
    initial={{ opacity: 0, y }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] }}
  >
    {children}
  </motion.div>
);

export default function CheckoutSuccessPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const state = location.state as CheckoutSuccessState | null;

  const orders = state?.orders ?? [];
  const total =
    state?.totalAmount ?? orders.reduce((s, o) => s + o.totalAmount, 0);
  const subtotal = state?.subtotalAmount ?? total;
  const discount = state?.discountAmount ?? 0;
  const shippingPrice = state?.shippingPrice ?? 0;
  const shippingAddress = state?.shippingAddress;
  const paymentMethod = state?.paymentMethod ?? "COD";
  const orderGroupId = state?.orderGroupId ?? orders[0]?._id ?? "";

  const overallStatus = (() => {
    if (orders.length === 0) return "processing";
    let minRank = 4;
    for (const o of orders) {
      const rank = STATUS_RANK[o.status?.toLowerCase()] ?? 0;
      if (rank < minRank) minRank = rank;
    }
    return STEPS[minRank]?.key ?? "processing";
  })();

  const overallRank = STATUS_RANK[overallStatus] ?? 0;

  const getStepState = (stepKey: string): "done" | "active" | "pending" => {
    const rank = STATUS_RANK[stepKey] ?? 0;
    if (rank < overallRank) return "done";
    if (rank === overallRank) return "active";
    return "pending";
  };

  const shortId = orderGroupId ? orderGroupId.slice(0, 8).toUpperCase() : "—";

  const particleControls = useAnimation();
  const triggered = useRef(false);
  useEffect(() => {
    if (!triggered.current) {
      triggered.current = true;
      particleControls.start("visible");
    }
  }, [particleControls]);

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8">
      {/* ─── Confetti (fixed overlay) ─── */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        {PARTICLES.map((p) => (
          <Particle key={p.id} x={p.x} y={p.y} color={p.color} />
        ))}
      </div>

      <motion.div
        className="w-full max-w-2xl"
        initial="hidden"
        animate="visible"
        variants={{
          hidden: {},
          visible: { transition: { staggerChildren: 0.12 } },
        }}
      >
        {/* ─── Checkmark ─── */}
        <FadeIn delay={0.1}>
          <div className="flex justify-center mb-8">
            <div className="relative">
              <motion.div
                className="absolute inset-0 rounded-full"
                initial={{ scale: 0.8, opacity: 0.6 }}
                animate={{ scale: 1.75, opacity: 0 }}
                transition={{
                  duration: 1.4,
                  repeat: Infinity,
                  ease: "easeOut",
                }}
              />
              <motion.div
                className="relative w-24 h-24 rounded-full bg-blue-600 flex items-center justify-center shadow-2xl shadow-blue-200"
                initial={{ scale: 0, rotate: -30 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{
                  type: "spring",
                  stiffness: 220,
                  damping: 14,
                  delay: 0.15,
                }}
              >
                <motion.div
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.45, duration: 0.35 }}
                >
                  <CheckCircle2 className="w-14 h-14 text-white stroke-[1.5]" />
                </motion.div>
              </motion.div>
            </div>
          </div>
        </FadeIn>

        {/* ─── Title ─── */}
        <FadeIn delay={0.25}>
          <div className="text-center mb-3">
            <h1 className="text-5xl md:text-6xl font-bold text-blue-900 mb-2">
              Place Order Successfully!
            </h1>
            <p className="text-xl text-blue-400">
              Thank you for shopping with us!
            </p>
          </div>
        </FadeIn>

        {/* ─── MERGED CARD: Info + Progress ─── */}
        <FadeIn delay={0.4} y={20}>
          <div className="bg-white rounded-2xl shadow-lg p-8 mb-6">
            {/* 3-col info row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                {
                  icon: <ReceiptText className="w-6 h-6 text-blue-600" />,
                  label: "Order ID",
                  value: `#${shortId}`,
                  mono: true,
                  valueClass: "text-lg font-semibold text-blue-900",
                },
                {
                  icon: (
                    <Settings2 className="w-6 h-6 text-blue-600 animate-spin [animation-duration:4s]" />
                  ),
                  label: "Status",
                  value:
                    overallStatus === "processing"
                      ? "Processing"
                      : overallStatus === "created"
                        ? "Order Placed"
                        : overallStatus === "shipped"
                          ? "Shipping"
                          : overallStatus === "delivered"
                            ? "Delivered"
                            : "Completed",
                  mono: false,
                  valueClass: "text-lg font-semibold text-blue-600",
                },
                {
                  icon: <Truck className="w-6 h-6 text-blue-600" />,
                  label: "Delivery",
                  value: "3–5 days",
                  mono: false,
                  valueClass: "text-lg font-semibold text-blue-900",
                },
              ].map((card, i) => (
                <motion.div
                  key={card.label}
                  className="flex flex-col items-center text-center"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 + i * 0.1 }}
                >
                  <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center mb-3">
                    {card.icon}
                  </div>
                  <p className="text-sm text-muted-foreground mb-1">
                    {card.label}
                  </p>
                  <p
                    className={`${card.valueClass} ${card.mono ? "font-mono" : ""}`}
                  >
                    {card.value}
                  </p>
                </motion.div>
              ))}
            </div>

            {/* Divider */}
            <div className="mt-8 pt-8 border-t border-blue-50">
              <h3 className="font-semibold text-blue-900 mb-6 text-xl">
                Order Progress
              </h3>

              {/* Horizontal step list */}
              <div className="relative flex items-start justify-between font-sans">
                {/* Connector line */}
                <div className="absolute top-[28px] left-8 right-8 h-0.5 bg-blue-100 z-0" />

                {STEPS.map((step, index) => {
                  const stepState = getStepState(step.key);
                  const isDone = stepState === "done";
                  const isActive = stepState === "active";
                  const { Icon } = step;

                  return (
                    <motion.div
                      key={step.key}
                      className="relative z-10 flex flex-col items-center gap-3 flex-1"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.6 + index * 0.1 }}
                    >
                      {isDone ? (
                        <div className="h-14 w-14 rounded-full bg-blue-600 border-2 border-blue-600 flex items-center justify-center shadow-md shadow-blue-200">
                          <Icon className="h-6 w-6 text-white" />
                        </div>
                      ) : isActive ? (
                        <motion.div
                          className="h-14 w-14 rounded-full bg-blue-50 border-2 border-blue-500 flex items-center justify-center ring-4 ring-blue-100"
                          animate={{ scale: [1, 1.06, 1] }}
                          transition={{ repeat: Infinity, duration: 1.8 }}
                        >
                          <Icon className="h-6 w-6 text-blue-600" />
                        </motion.div>
                      ) : (
                        <div className="h-14 w-14 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center">
                          <Icon className="h-6 w-6 text-slate-300" />
                        </div>
                      )}
                      <span
                        className={`text-sm font-semibold text-center leading-tight tracking-wide ${
                          isDone
                            ? "text-blue-700"
                            : isActive
                              ? "text-blue-600"
                              : "text-slate-300"
                        }`}
                      >
                        {step.label}
                      </span>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </div>
        </FadeIn>

        {/* ─── Order Summary ─── */}
        <FadeIn delay={0.65} y={20}>
          <div className="bg-white rounded-2xl shadow-lg p-8 mb-6">
            <h3 className="font-semibold text-blue-900 mb-4 text-xl">
              Order Summary
            </h3>
            <div className="space-y-3 mb-6 pb-6 border-b border-blue-50 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground text-lg">Products</span>
                <span className="text-blue-900 text-lg">
                  ${subtotal.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground text-lg">Shipping</span>
                <span
                  className={
                    shippingPrice > 0
                      ? "text-blue-900 font-medium text-lg"
                      : "text-emerald-600 font-medium text-lg"
                  }
                >
                  {shippingPrice > 0 ? `$${shippingPrice.toFixed(2)}` : "Free"}
                </span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground text-lg">
                    Discount
                  </span>
                  <span className="text-blue-600 font-medium text-md">
                    −${discount.toFixed(2)}
                  </span>
                </div>
              )}
            </div>
            <div className="flex justify-between text-xl font-bold">
              <span className="text-blue-900">Total</span>
              <span className="text-blue-700 text-2xl font-extrabold">
                ${total.toFixed(2)}
              </span>
            </div>
          </div>
        </FadeIn>

        {/* ─── Shipping Address ─── */}
        {shippingAddress && (
          <FadeIn delay={0.7} y={20}>
            <div className="bg-white rounded-2xl shadow-lg p-8 mb-6">
              <h3 className="font-semibold text-blue-900 mb-4 text-xl flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                Shipping Address
              </h3>
              <div className="bg-blue-50/50 rounded-lg p-4 border border-blue-100">
                <p className="font-bold text-lg text-blue-900">
                  {shippingAddress.fullName}
                </p>
                <p className="text-muted-foreground">{shippingAddress.phone}</p>
                <p className="mt-2 text-blue-800/80 leading-relaxed">
                  {shippingAddress.detail && `${shippingAddress.detail}, `}
                  {shippingAddress.street && `${shippingAddress.street}, `}
                  {shippingAddress.ward && `${shippingAddress.ward}, `}
                  {shippingAddress.district && `${shippingAddress.district}, `}
                  {shippingAddress.city}
                </p>
              </div>
            </div>
          </FadeIn>
        )}

        {/* ─── CTA Buttons ─── */}
        <FadeIn delay={0.8} y={16}>
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-10">
            <Button
              size="lg"
              className="px-8 rounded-full text-md cursor-pointer cursor-pointer font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-200"
              onClick={() =>
                navigate(
                  orderGroupId
                    ? `/purchases/${orderGroupId}`
                    : "/my-ebay/activity/purchases",
                )
              }
            >
              <ReceiptText className="w-4 h-4 mr-2" />
              Track Order
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="px-8 rounded-full text-md cursor-pointer cursor-pointer font-semibold border-2 border-blue-200 text-blue-700 hover:bg-blue-50 hover:text-blue-500"
              onClick={() => navigate("/products")}
            >
              <ShoppingCart className="w-4 h-4 mr-2" />
              Continue Shopping
            </Button>
          </div>
        </FadeIn>

        {/* ─── Footer note ─── */}
        <FadeIn delay={0.9}>
          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              Have questions?{" "}
              <button
                className="text-blue-600 hover:underline font-medium"
                onClick={() => navigate("/contact")}
              >
                Contact us
              </button>
            </p>
          </div>
        </FadeIn>
      </motion.div>
    </div>
  );
}
