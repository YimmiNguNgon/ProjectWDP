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
  created:                      { label: "Đơn hàng đã được tạo",          description: "Đơn hàng đã đặt thành công, chờ người bán xác nhận" },
  packaging:                    { label: "Đang đóng gói",                  description: "Người bán đang chuẩn bị và đóng gói hàng" },
  ready_to_ship:                { label: "Sẵn sàng giao",                  description: "Đơn hàng sẵn sàng, hệ thống đang tìm shipper" },
  queued:                       { label: "Đang tìm shipper lấy hàng",      description: "Hệ thống đang tìm shipper khu vực người bán" },
  pending_acceptance:           { label: "Chờ shipper xác nhận lấy hàng",  description: "Đã phân công shipper, chờ shipper xác nhận" },
  shipping:                     { label: "Đang lấy hàng từ người bán",     description: "Shipper đang đến lấy hàng tại địa chỉ người bán" },
  in_transit:                   { label: "Đang vận chuyển đến khu vực bạn",description: "Hàng đã đến khu vực giao hàng, đang bàn giao shipper địa phương" },
  delivery_queued:              { label: "Chờ shipper giao hàng",          description: "Đang tìm shipper khu vực của bạn để giao hàng" },
  pending_delivery_acceptance:  { label: "Chờ shipper giao xác nhận",      description: "Đã phân công shipper giao hàng, chờ xác nhận" },
  delivering:                   { label: "Đang vận chuyển",                description: "Shipper đang trên đường giao hàng đến bạn, vui lòng chú ý điện thoại" },
  delivered:                    { label: "Đã giao hàng",                   description: "Giao hàng thành công" },
  completed:                    { label: "Hoàn tất",                       description: "Đơn hàng đã hoàn tất" },
  cancelled:                    { label: "Đã hủy",                         description: "Đơn hàng đã bị hủy" },
  cancel_requested:             { label: "Yêu cầu hủy đơn",               description: "Người mua yêu cầu hủy đơn hàng" },
  failed:                       { label: "Giao hàng thất bại",             description: "Giao hàng không thành công, đang xử lý" },
  waiting_return_shipment:      { label: "Chờ lấy hàng hoàn trả",         description: "Đang chờ shipper đến lấy hàng hoàn trả người bán" },
  return_shipping:              { label: "Đang hoàn hàng",                 description: "Hàng đang được vận chuyển trả về người bán" },
  delivered_to_seller:          { label: "Đã hoàn về người bán",           description: "Hàng đã được trả về người bán thành công" },
  returned:                     { label: "Hoàn hàng thành công",           description: "Đơn hàng đã hoàn trả thành công" },
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
        Lịch sử vận chuyển
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
