import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import api from "@/lib/axios";

interface Shipper {
  _id: string;
  username: string;
  email: string;
  status: string;
  isAvailable: boolean;
  createdAt: string;
  totalAccepted: number;
  delivered: number;
  completed: number;
  inTransit: number;
}

interface ShipperOrder {
  _id: string;
  status: string;
  totalAmount: number;
  createdAt: string;
  buyer?: { username: string };
  seller?: { username: string; sellerInfo?: { shopName?: string } };
  shipper?: { username: string };
}

type TabType = "shippers" | "orders";

export default function AdminShipperManagement() {
  const [activeTab, setActiveTab] = useState<TabType>("shippers");
  const [shippers, setShippers] = useState<Shipper[]>([]);
  const [orders, setOrders] = useState<ShipperOrder[]>([]);
  const [orderStatus, setOrderStatus] = useState("all");
  const [shipperId, setShipperId] = useState("all");
  const [loading, setLoading] = useState(false);

  const fetchShippers = () => {
    setLoading(true);
    api
      .get("/api/admin/shippers")
      .then((res) => setShippers(res.data.shippers))
      .catch(() => { })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchShippers();
  }, []);

  useEffect(() => {
    if (activeTab === "orders") {
      setLoading(true);
      const params: Record<string, string> = {};
      if (orderStatus !== "all") params.status = orderStatus;
      if (shipperId !== "all") params.shipperId = shipperId;
      api
        .get("/api/admin/shipper-orders", { params })
        .then((res) => setOrders(res.data.orders))
        .catch(() => { })
        .finally(() => setLoading(false));
    }
  }, [activeTab, orderStatus, shipperId]);

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      active: "bg-green-100 text-green-700",
      banned: "bg-red-100 text-red-700",
      suspended: "bg-yellow-100 text-yellow-700",
      shipping: "bg-purple-100 text-purple-700",
      delivered: "bg-green-100 text-green-700",
    };
    return map[status] || "bg-gray-100 text-gray-700";
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Shipper Management</h1>

      <div className="flex gap-2 mb-6">
        {(["shippers", "orders"] as TabType[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === tab
              ? "bg-blue-600 text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
          >
            {tab === "shippers" ? "Shippers" : "Shipper Orders"}
          </button>
        ))}
      </div>

      {activeTab === "shippers" && (
        <div className="overflow-x-auto">
          {loading ? (
            <div className="text-center py-12 text-gray-500">Loading...</div>
          ) : (
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b">
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Username</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Email</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Account Status</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Availability</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Total Accepted</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Delivered</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Completed</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">In Transit</th>
                </tr>
              </thead>
              <tbody>
                {shippers.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-8 text-gray-500">
                      No shippers found
                    </td>
                  </tr>
                ) : (
                  shippers.map((s) => (
                    <tr key={s._id} className="border-b hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium">{s.username}</td>
                      <td className="px-4 py-3 text-gray-600">{s.email}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusBadge(s.status)}`}>
                          {s.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          s.isAvailable
                            ? "bg-green-100 text-green-700"
                            : "bg-orange-100 text-orange-700"
                        }`}>
                          {s.isAvailable ? "Available" : "Delivering"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">{s.totalAccepted}</td>
                      <td className="px-4 py-3 text-right text-green-600">{s.delivered}</td>
                      <td className="px-4 py-3 text-right text-blue-600">{s.completed}</td>
                      <td className="px-4 py-3 text-right text-purple-600">{s.inTransit}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      )}

      {activeTab === "orders" && (
        <div>
          <div className="flex gap-4 mb-4">
            <Select value={orderStatus} onValueChange={setOrderStatus}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="shipping">Shipping</SelectItem>
                <SelectItem value="delivered">Delivered</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>

            <Select value={shipperId} onValueChange={setShipperId}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="All Shippers" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Shippers</SelectItem>
                {shippers.map((s) => (
                  <SelectItem key={s._id} value={s._id}>
                    {s.username}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="overflow-x-auto">
            {loading ? (
              <div className="text-center py-12 text-gray-500">Loading...</div>
            ) : (
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b">
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Order ID</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Buyer</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Seller</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Shipper</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">Amount</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-8 text-gray-500">
                        No orders found
                      </td>
                    </tr>
                  ) : (
                    orders.map((o) => (
                      <tr key={o._id} className="border-b hover:bg-gray-50">
                        <td className="px-4 py-3 font-mono text-xs text-gray-600">
                          #{o._id.slice(-8).toUpperCase()}
                        </td>
                        <td className="px-4 py-3">{o.buyer?.username || "—"}</td>
                        <td className="px-4 py-3">
                          {o.seller?.sellerInfo?.shopName || o.seller?.username || "—"}
                        </td>
                        <td className="px-4 py-3">{o.shipper?.username || "—"}</td>
                        <td className="px-4 py-3 text-right">${o.totalAmount.toFixed(2)}</td>
                        <td className="px-4 py-3">
                          <Badge variant="outline" className={`text-xs ${statusBadge(o.status)}`}>
                            {o.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                          {new Date(o.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
