import { useEffect, useState, useCallback, useContext } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell } from "lucide-react";
import { getAvailableOrders, acceptOrder, rejectOrder, type ShipperOrder } from "@/api/shipper";
import { SocketContext } from "@/hooks/use-socket";

export default function ShipperAvailableOrders() {
  const [orders, setOrders] = useState<ShipperOrder[]>([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const socketCtx = useContext(SocketContext);

  const fetchOrders = useCallback(async (p: number) => {
    setLoading(true);
    try {
      const res = await getAvailableOrders(p);
      setOrders(res.data.orders);
      setPages(res.data.pages);
      setTotal(res.data.total);
    } catch {
      toast.error("Failed to load available orders");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders(page);
  }, [fetchOrders, page]);

  // Real-time: refresh khi có đơn mới được assign
  useEffect(() => {
    const socket = socketCtx?.socket;
    if (!socket) return;

    const handleNotification = (data: { type: string }) => {
      if (data.type === "order_assigned") {
        fetchOrders(1);
        setPage(1);
      }
    };

    socket.on("notification", handleNotification);
    return () => { socket.off("notification", handleNotification); };
  }, [socketCtx?.socket, fetchOrders]);

  const handleAccept = async (orderId: string) => {
    setActionLoading(orderId);
    try {
      await acceptOrder(orderId);
      toast.success("Order accepted! Check My Deliveries.");
      setOrders((prev) => prev.filter((o) => o._id !== orderId));
      setTotal((t) => t - 1);
    } catch (err: any) {
      const msg = err?.response?.data?.message || "Failed to accept order";
      toast.error(msg);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDecline = async (orderId: string) => {
    setActionLoading(orderId);
    try {
      await rejectOrder(orderId);
      toast.info("Order declined.");
      setOrders((prev) => prev.filter((o) => o._id !== orderId));
      setTotal((t) => t - 1);
    } catch (err: any) {
      const msg = err?.response?.data?.message || "Failed to decline order";
      toast.error(msg);
    } finally {
      setActionLoading(null);
    }
  };

  const pendingOrders = orders.filter((o) => o.status === "pending_acceptance");
  const openOrders = orders.filter((o) => o.status !== "pending_acceptance");

  const renderOrderCard = (order: ShipperOrder, isPending: boolean) => {
    const addr = order.shippingAddress;
    const busy = actionLoading === order._id;
    return (
      <Card key={order._id} className={isPending ? "border-orange-200 bg-orange-50/30" : ""}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-mono text-gray-600">
              #{order._id.slice(-8).toUpperCase()}
            </CardTitle>
            {isPending ? (
              <Badge className="bg-orange-100 text-orange-700 border border-orange-300">
                Awaiting Your Acceptance
              </Badge>
            ) : order.status === "waiting_return_shipment" ? (
              <Badge variant="outline" className="text-purple-700 border-purple-300 bg-purple-50">
                Return Pick-up
              </Badge>
            ) : (
              <Badge variant="outline" className="text-blue-700 border-blue-300 bg-blue-50">
                Waiting
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 text-sm">
            <div>
              <p className="text-gray-500">Seller</p>
              <p className="font-medium">
                {order.seller?.sellerInfo?.shopName || order.seller?.username || "—"}
              </p>
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
                {new Date(order.createdAt).toLocaleDateString()}
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

          <div className="flex gap-2">
            <Button
              size="sm"
              className="bg-orange-600 hover:bg-orange-700 text-white"
              disabled={busy}
              onClick={() => handleAccept(order._id)}
            >
              {busy ? "..." : "Accept"}
            </Button>
            {order.status === "pending_acceptance" && (
              <Button
                size="sm"
                variant="outline"
                disabled={busy}
                onClick={() => handleDecline(order._id)}
              >
                Decline
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Available Orders</h1>
        <span className="text-sm text-gray-500">{total} orders waiting</span>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading...</div>
      ) : orders.length === 0 ? (
        <div className="text-center py-12 text-gray-500">No available orders at the moment.</div>
      ) : (
        <div className="space-y-6">
          {/* Pending acceptance - assigned to this shipper */}
          {pendingOrders.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Bell className="h-4 w-4 text-orange-600" />
                <h2 className="text-base font-semibold text-orange-700">
                  Assigned to You — Pending Acceptance ({pendingOrders.length})
                </h2>
              </div>
              <div className="space-y-3">
                {pendingOrders.map((order) => renderOrderCard(order, true))}
              </div>
            </div>
          )}

          {/* Open orders - available for any shipper */}
          {openOrders.length > 0 && (
            <div>
              {pendingOrders.length > 0 && (
                <h2 className="text-base font-semibold text-gray-700 mb-3">
                  Open Orders ({openOrders.length})
                </h2>
              )}
              <div className="space-y-3">
                {openOrders.map((order) => renderOrderCard(order, false))}
              </div>
            </div>
          )}
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
