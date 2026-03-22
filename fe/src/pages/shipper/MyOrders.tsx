import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getMyOrders, markDelivered, type ShipperOrder } from "@/api/shipper";

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  shipping: { label: "In Transit", className: "text-purple-700 border-purple-300 bg-purple-50" },
  delivered: { label: "Delivered", className: "text-green-700 border-green-300 bg-green-50" },
  completed: { label: "Completed", className: "text-blue-700 border-blue-300 bg-blue-50" },
  return_shipping: { label: "Returning to Seller", className: "text-orange-700 border-orange-300 bg-orange-50" },
  delivered_to_seller: { label: "Returned to Seller", className: "text-emerald-700 border-emerald-300 bg-emerald-50" },
};

type StatusFilter = "all" | "shipping" | "delivered" | "completed";

export default function ShipperMyOrders() {
  const [orders, setOrders] = useState<ShipperOrder[]>([]);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchOrders = useCallback(async (p: number, status: StatusFilter) => {
    setLoading(true);
    try {
      const params: Record<string, any> = { page: p };
      if (status !== "all") params.status = status;
      const res = await getMyOrders(params);
      setOrders(res.data.orders);
      setPages(res.data.pages);
      setTotal(res.data.total);
    } catch {
      toast.error("Failed to load orders");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders(page, statusFilter);
  }, [fetchOrders, page, statusFilter]);

  const handleStatusChange = (s: StatusFilter) => {
    setStatusFilter(s);
    setPage(1);
  };

  const handleMarkDelivered = async (orderId: string) => {
    setActionLoading(orderId);
    try {
      const res = await markDelivered(orderId);
      toast.success("Order marked as delivered!");
      setOrders((prev) =>
        prev.map((o) => (o._id === orderId ? res.data.order : o)),
      );
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to update order");
    } finally {
      setActionLoading(null);
    }
  };

  const tabs: { label: string; value: StatusFilter }[] = [
    { label: "All", value: "all" },
    { label: "In Transit", value: "shipping" },
    { label: "Delivered", value: "delivered" },
    { label: "Completed", value: "completed" },
  ];

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">My Deliveries</h1>
        <span className="text-sm text-gray-500">{total} orders</span>
      </div>

      <div className="flex gap-2 mb-6">
        {tabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => handleStatusChange(tab.value)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              statusFilter === tab.value
                ? "bg-orange-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading...</div>
      ) : orders.length === 0 ? (
        <div className="text-center py-12 text-gray-500">No orders found.</div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => {
            const addr = order.shippingAddress;
            const cfg = STATUS_CONFIG[order.status] || {
              label: order.status,
              className: "text-gray-600 border-gray-300 bg-gray-50",
            };
            const busy = actionLoading === order._id;
            return (
              <Card key={order._id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-mono text-gray-600">
                      #{order._id.slice(-8).toUpperCase()}
                    </CardTitle>
                    <Badge variant="outline" className={cfg.className}>
                      {cfg.label}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 text-sm">
                    <div>
                      <p className="text-gray-500">Buyer</p>
                      <p className="font-medium">{order.buyer?.username || "—"}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Delivery Address</p>
                      <p className="font-medium">{addr?.fullName || "—"}</p>
                      <p className="text-xs text-gray-400">
                        {[addr?.street, addr?.ward, addr?.district, addr?.city].filter(Boolean).join(", ") || "—"}
                      </p>
                      {addr?.phone && <p className="text-xs text-gray-400">{addr.phone}</p>}
                    </div>
                    <div>
                      <p className="text-gray-500">Total</p>
                      <p className="font-medium text-orange-600">${order.totalAmount.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Date</p>
                      <p className="font-medium">
                        {new Date(order.updatedAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  {/* Items */}
                  {order.items && order.items.length > 0 && (
                    <div className="mb-4 border rounded-lg overflow-hidden">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide px-3 py-2 bg-gray-50 border-b">
                        Items ({order.items.length})
                      </p>
                      <div className="divide-y">
                        {order.items.map((item, i) => (
                          <div key={i} className="flex items-center justify-between px-3 py-2 text-sm">
                            <span className="text-gray-800 flex-1 mr-2">{item.title || "—"}</span>
                            <span className="text-gray-500 whitespace-nowrap">
                              x{item.quantity} · <span className="font-medium">${(item.unitPrice * item.quantity).toFixed(2)}</span>
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {(order.status === "shipping" || order.status === "return_shipping") && (
                    <Button
                      size="sm"
                      className="bg-green-600 hover:bg-green-700 text-white"
                      disabled={busy}
                      onClick={() => handleMarkDelivered(order._id)}
                    >
                      {busy ? "..." : order.status === "return_shipping" ? "Mark Returned to Seller" : "Mark Delivered"}
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {pages > 1 && (
        <div className="flex justify-center gap-2 mt-6">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Previous
          </Button>
          <span className="px-3 py-1 text-sm text-gray-600">
            {page} / {pages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= pages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
