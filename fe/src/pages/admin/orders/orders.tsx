import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { ChevronDown, ChevronUp, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import api from "@/lib/axios";

interface AdminOrder {
  _id: string;
  status: string;
  totalAmount: number;
  paymentStatus: string;
  paymentMethod: string;
  createdAt: string;
  buyer: { _id: string; username: string; email: string } | null;
  seller: { _id: string; username: string; email: string } | null;
  shipper: { _id: string; username: string; email: string } | null;
  items: { title: string; quantity: number; unitPrice: number }[];
  shippingAddress?: { fullName?: string; city?: string; district?: string };
}

const STATUS_COLORS: Record<string, string> = {
  created: "bg-gray-100 text-gray-700",
  packaging: "bg-yellow-100 text-yellow-700",
  ready_to_ship: "bg-blue-100 text-blue-700",
  shipping: "bg-indigo-100 text-indigo-700",
  delivered: "bg-orange-100 text-orange-700",
  completed: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
  returned: "bg-purple-100 text-purple-700",
  failed: "bg-red-100 text-red-700",
};

const ALL_STATUSES = [
  "created", "packaging", "ready_to_ship", "shipping",
  "delivered", "completed", "cancelled", "returned", "failed",
];

export default function AdminOrders() {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, any> = { page, limit: 20 };
      if (statusFilter !== "all") params.status = statusFilter;
      if (search.trim()) params.search = search.trim();
      const res = await api.get("/api/admin/orders", { params });
      setOrders(res.data.orders);
      setTotal(res.data.total);
      setPages(res.data.pages);
    } catch {
      toast.error("Failed to load orders");
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, search]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleSearch = () => {
    setSearch(searchInput);
    setPage(1);
  };

  const toggleExpand = (id: string) =>
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Order Management</h1>
          <p className="text-sm text-gray-500 mt-1">{total} total orders</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-6 flex-wrap">
        <div className="flex gap-2 flex-1 min-w-[240px]">
          <Input
            placeholder="Search by Order ID..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="flex-1"
          />
          <Button variant="outline" size="icon" onClick={handleSearch}>
            <Search className="h-4 w-4" />
          </Button>
        </div>
        <Select
          value={statusFilter}
          onValueChange={(v) => { setStatusFilter(v); setPage(1); }}
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {ALL_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Orders list */}
      {loading ? (
        <div className="text-center py-16 text-gray-400">Loading...</div>
      ) : orders.length === 0 ? (
        <div className="text-center py-16 text-gray-400">No orders found.</div>
      ) : (
        <div className="space-y-2">
          {orders.map((order) => {
            const statusColor = STATUS_COLORS[order.status] || "bg-gray-100 text-gray-700";
            const isExpanded = expanded[order._id];

            return (
              <div key={order._id} className="bg-white border rounded-xl overflow-hidden shadow-sm">
                {/* Header row */}
                <div
                  className="flex items-center justify-between px-5 py-3 cursor-pointer hover:bg-gray-50"
                  onClick={() => toggleExpand(order._id)}
                >
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs text-gray-500">
                      #{order._id.slice(-8).toUpperCase()}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor}`}>
                      {order.status.replace(/_/g, " ").toUpperCase()}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      order.paymentStatus === "paid"
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-amber-100 text-amber-700"
                    }`}>
                      {order.paymentStatus?.toUpperCase()}
                    </span>
                  </div>
                  <div className="flex items-center gap-5 text-sm text-gray-600">
                    <span className="font-semibold">${order.totalAmount?.toFixed(2)}</span>
                    <span className="text-xs text-gray-400">
                      {new Date(order.createdAt).toLocaleDateString()}
                    </span>
                    <span className="text-xs text-gray-500">
                      Buyer: <b>{order.buyer?.username || "—"}</b>
                    </span>
                    {isExpanded
                      ? <ChevronUp className="h-4 w-4 text-gray-400" />
                      : <ChevronDown className="h-4 w-4 text-gray-400" />
                    }
                  </div>
                </div>

                {/* Expanded detail */}
                {isExpanded && (
                  <div className="border-t px-5 py-4 space-y-4 bg-gray-50">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                      <div>
                        <p className="text-xs text-gray-400 mb-0.5">Buyer</p>
                        <p className="font-medium">{order.buyer?.username || "—"}</p>
                        <p className="text-xs text-gray-400">{order.buyer?.email}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 mb-0.5">Seller</p>
                        <p className="font-medium">{order.seller?.username || "—"}</p>
                        <p className="text-xs text-gray-400">{order.seller?.email}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 mb-0.5">Shipper</p>
                        {order.shipper ? (
                          <>
                            <p className="font-medium">{order.shipper.username}</p>
                            <p className="text-xs text-gray-400">{order.shipper.email}</p>
                          </>
                        ) : (
                          <p className="font-medium text-gray-400 italic">Not assigned</p>
                        )}
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 mb-0.5">Shipping Address</p>
                        <p className="font-medium">
                          {order.shippingAddress?.fullName || "—"}
                        </p>
                        <p className="text-xs text-gray-400">
                          {[order.shippingAddress?.district, order.shippingAddress?.city]
                            .filter(Boolean)
                            .join(", ") || "—"}
                        </p>
                      </div>
                    </div>

                    {/* Items */}
                    <div>
                      <p className="text-xs text-gray-400 mb-2">Items</p>
                      <div className="space-y-1">
                        {order.items.map((item, i) => (
                          <div key={i} className="flex justify-between text-sm bg-white p-2 rounded border">
                            <span className="text-gray-700">{item.title || "—"}</span>
                            <span className="text-gray-500">
                              x{item.quantity} · ${((item.unitPrice || 0) * item.quantity).toFixed(2)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex gap-6 text-sm text-gray-600">
                      <span>Payment: <b className="capitalize">{order.paymentMethod}</b></span>
                      <span>Total: <b>${order.totalAmount?.toFixed(2)}</b></span>
                      <span>Ordered: <b>{new Date(order.createdAt).toLocaleString()}</b></span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex justify-center gap-2 mt-6">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Previous
          </Button>
          <span className="px-3 py-1 text-sm text-gray-600">{page} / {pages}</span>
          <Button variant="outline" size="sm" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
