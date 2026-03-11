import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getAvailableOrders, acceptOrder, rejectOrder, type ShipperOrder } from "@/api/shipper";

export default function ShipperAvailableOrders() {
  const [orders, setOrders] = useState<ShipperOrder[]>([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

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
    } catch {
      toast.error("Failed to decline order");
    } finally {
      setActionLoading(null);
    }
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
        <div className="space-y-4">
          {orders.map((order) => {
            const addr = order.shippingAddress;
            const busy = actionLoading === order._id;
            return (
              <Card key={order._id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-mono text-gray-600">
                      #{order._id.slice(-8).toUpperCase()}
                    </CardTitle>
                    {order.status === "waiting_return_shipment" ? (
                      <Badge variant="outline" className="text-orange-700 border-orange-300 bg-orange-50">
                        Return Pick-up
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-blue-700 border-blue-300 bg-blue-50">
                        Ready to Ship
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
                      <p className="font-medium">
                        {[addr?.district, addr?.city].filter(Boolean).join(", ") || "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500">Total</p>
                      <p className="font-medium">${order.totalAmount.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Date</p>
                      <p className="font-medium">
                        {new Date(order.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="bg-orange-600 hover:bg-orange-700 text-white"
                      disabled={busy}
                      onClick={() => handleAccept(order._id)}
                    >
                      {busy ? "..." : "Accept"}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busy}
                      onClick={() => handleDecline(order._id)}
                    >
                      Decline
                    </Button>
                  </div>
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
