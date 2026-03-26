import { CheckCircle2, Truck, Package, Clock, XCircle, RotateCcw } from "lucide-react";

interface TimelineEntry {
  status: string;
  timestamp: string;
  note?: string;
}

interface ShippingTimelineProps {
  statusHistory: TimelineEntry[];
  currentStatus: string;
}

const STATUS_INFO: Record<string, { label: string; description: string }> = {
  created:                      { label: "Order Placed",              description: "Order placed successfully, waiting for seller to confirm." },
  packaging:                    { label: "Packaging",                 description: "Seller is preparing and packing your order." },
  ready_to_ship:                { label: "Finding Shipper",           description: "Order is packed. The system is looking for an available shipper." },
  queued:                       { label: "In Queue",                  description: "Waiting for an available shipper in the seller's area." },
  pending_acceptance:           { label: "Shipper Assigned",          description: "A shipper has been assigned and is confirming the pickup." },
  shipping:                     { label: "Out for Pickup",            description: "Shipper is heading to the seller's address to collect the package." },
  in_transit:                   { label: "In Transit",                description: "Package is in transit to your area. Assigning a local delivery shipper." },
  delivery_queued:              { label: "Awaiting Delivery Shipper", description: "Looking for a shipper in your area to handle last-mile delivery." },
  pending_delivery_acceptance:  { label: "Delivery Shipper Assigned", description: "A delivery shipper has been assigned and is confirming." },
  delivering:                   { label: "Out for Delivery",          description: "Shipper is on the way to your address. Please keep your phone available." },
  delivered:                    { label: "Delivered",                 description: "Package delivered successfully." },
  completed:                    { label: "Completed",                 description: "Order has been completed. Thank you for your purchase!" },
  cancelled:                    { label: "Cancelled",                 description: "This order has been cancelled." },
  cancel_requested:             { label: "Cancellation Requested",   description: "Buyer has requested to cancel this order." },
  failed:                       { label: "Delivery Failed",           description: "Delivery was unsuccessful. The issue is being resolved." },
  waiting_return_shipment:      { label: "Awaiting Return Pickup",    description: "Waiting for a shipper to collect the return package from the buyer." },
  return_shipping:              { label: "Return In Transit",         description: "Return package is on its way back to the seller." },
  delivered_to_seller:          { label: "Returned to Seller",        description: "Return package has been successfully delivered to the seller." },
  returned:                     { label: "Return Completed",          description: "Order has been returned successfully." },
};

const TERMINAL_STATUSES = new Set(["delivered", "completed", "cancelled", "returned", "delivered_to_seller"]);
const RETURN_STATUSES   = new Set(["waiting_return_shipment", "return_shipping", "delivered_to_seller", "returned"]);

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const mo = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${hh}:${mm} ${dd}-${mo}-${yyyy}`;
}

function EntryIcon({ status, isFirst }: { status: string; isFirst: boolean }) {
  if (isFirst) {
    if (TERMINAL_STATUSES.has(status)) {
      return (
        <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center shadow-sm">
          <CheckCircle2 className="w-5 h-5 text-white" />
        </div>
      );
    }
    if (status === "cancelled") {
      return (
        <div className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center shadow-sm">
          <XCircle className="w-5 h-5 text-white" />
        </div>
      );
    }
    if (RETURN_STATUSES.has(status)) {
      return (
        <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center shadow-sm">
          <RotateCcw className="w-5 h-5 text-white" />
        </div>
      );
    }
    if (status === "delivering" || status === "shipping" || status === "in_transit") {
      return (
        <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center shadow-sm">
          <Truck className="w-5 h-5 text-white" />
        </div>
      );
    }
    if (status === "packaging" || status === "ready_to_ship") {
      return (
        <div className="w-8 h-8 rounded-full bg-yellow-500 flex items-center justify-center shadow-sm">
          <Package className="w-5 h-5 text-white" />
        </div>
      );
    }
    return (
      <div className="w-8 h-8 rounded-full bg-gray-400 flex items-center justify-center shadow-sm">
        <Clock className="w-5 h-5 text-white" />
      </div>
    );
  }
  return (
    <div className="w-3 h-3 rounded-full bg-gray-300 border-2 border-gray-400 mt-2.5 mx-2.5" />
  );
}

export default function ShippingTimeline({ statusHistory }: ShippingTimelineProps) {
  if (!statusHistory || statusHistory.length === 0) return null;

  // Sắp xếp mới nhất lên đầu
  const sorted = [...statusHistory].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  );

  return (
    <div className="mt-4 mb-2">
      <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
        Shipping History
      </h4>

      <div className="relative">
        {sorted.map((entry, idx) => {
          const isFirst = idx === 0;
          const info = STATUS_INFO[entry.status] ?? {
            label: entry.status.replace(/_/g, " "),
            description: "",
          };

          return (
            <div key={idx} className="flex gap-3 relative">
              {/* Đường kẻ dọc */}
              {idx < sorted.length - 1 && (
                <div
                  className="absolute left-4 top-8 bottom-0 w-px bg-gray-200"
                  style={{ transform: "translateX(-50%)" }}
                />
              )}

              {/* Icon */}
              <div className="flex-shrink-0 flex flex-col items-center" style={{ width: 32 }}>
                <EntryIcon status={entry.status} isFirst={isFirst} />
              </div>

              {/* Nội dung */}
              <div className={`pb-5 flex-1 min-w-0 ${idx < sorted.length - 1 ? "" : "pb-1"}`}>
                <div className="flex items-baseline gap-2 flex-wrap">
                  <span
                    className={`text-sm font-semibold ${
                      isFirst ? "text-gray-900" : "text-gray-600"
                    }`}
                  >
                    {info.label}
                  </span>
                  <span className="text-xs text-gray-400 whitespace-nowrap">
                    {formatDateTime(entry.timestamp)}
                  </span>
                </div>
                {info.description && (
                  <p className="text-xs text-gray-500 mt-0.5">{info.description}</p>
                )}
                {entry.note && (
                  <p className="text-xs text-gray-400 mt-0.5 italic">
                    {entry.note}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
