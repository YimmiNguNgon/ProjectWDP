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
  shipperStatus: string;
  maxOrders: number;
  assignedProvince: string;
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

const SHIPPER_STATUS_CONFIG: Record<string, { label: string; cls: string }> = {
  available:          { label: "Available",         cls: "bg-green-100 text-green-700 border-green-200" },
  pending_acceptance: { label: "Pending Pickup",    cls: "bg-blue-100 text-blue-700 border-blue-200" },
  shipping:           { label: "Shipping",          cls: "bg-purple-100 text-purple-700 border-purple-200" },
};

const ACCOUNT_STATUS_CONFIG: Record<string, { label: string; cls: string }> = {
  active:    { label: "Active",    cls: "bg-green-100 text-green-700" },
  banned:    { label: "Banned",    cls: "bg-red-100 text-red-700" },
  suspended: { label: "Suspended", cls: "bg-yellow-100 text-yellow-700" },
};

const ORDER_STATUS_CONFIG: Record<string, string> = {
  shipping:  "bg-purple-100 text-purple-700",
  delivered: "bg-green-100 text-green-700",
  completed: "bg-blue-100 text-blue-700",
  cancelled: "bg-red-100 text-red-700",
  pending_acceptance: "bg-blue-50 text-blue-600",
  queued:    "bg-gray-100 text-gray-600",
};

export default function AdminShipperManagement() {
  const [activeTab, setActiveTab] = useState<TabType>("shippers");
  const [shippers, setShippers] = useState<Shipper[]>([]);
  const [provinces, setProvinces] = useState<string[]>([]);
  const [provinceFilter, setProvinceFilter] = useState("all");
  const [orders, setOrders] = useState<ShipperOrder[]>([]);
  const [orderStatus, setOrderStatus] = useState("all");
  const [shipperId, setShipperId] = useState("all");
  const [loading, setLoading] = useState(false);

  const fetchShippers = () => {
    setLoading(true);
    api
      .get("/api/admin/shippers")
      .then((res) => setShippers(res.data.shippers))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchShippers();
    api
      .get("/api/admin/shippers/provinces")
      .then((res) => setProvinces(res.data.provinces))
      .catch(() => {});
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
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [activeTab, orderStatus, shipperId]);

  const filteredShippers =
    provinceFilter === "all"
      ? shippers
      : shippers.filter((s) => s.assignedProvince === provinceFilter);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Shipper Management</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage shipper availability and monitor delivery orders</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {(["shippers", "orders"] as TabType[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab
                ? "bg-primary text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {tab === "shippers" ? "Shippers" : "Shipper Orders"}
          </button>
        ))}
      </div>

      {/* ── Shippers Tab ── */}
      {activeTab === "shippers" && (
        <div className="space-y-4">
          {/* Province filter */}
          <div className="flex gap-3">
            <Select value={provinceFilter} onValueChange={setProvinceFilter}>
              <SelectTrigger className="w-56">
                <SelectValue placeholder="Tất cả tỉnh/thành" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả tỉnh/thành</SelectItem>
                {provinces.map((p) => (
                  <SelectItem key={p} value={p}>
                    {p}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="bg-white rounded-2xl border border-border/60 shadow-sm overflow-hidden">
            {loading ? (
              <div className="text-center py-12 text-muted-foreground">Loading...</div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="text-left px-5 py-3">Shipper</th>
                    <th className="text-left px-5 py-3">Tỉnh/Thành</th>
                    <th className="text-left px-5 py-3">Account</th>
                    <th className="text-right px-5 py-3">Accepted</th>
                    <th className="text-right px-5 py-3">Delivered</th>
                    <th className="text-right px-5 py-3">In Transit</th>
                    <th className="text-center px-5 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {filteredShippers.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-10 text-muted-foreground">
                        No shippers found
                      </td>
                    </tr>
                  ) : (
                    filteredShippers.map((s) => {
                      const acct = ACCOUNT_STATUS_CONFIG[s.status] ?? { label: s.status, cls: "bg-gray-100 text-gray-600" };

                      return (
                        <tr key={s._id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-5 py-3.5">
                            <p className="font-semibold text-foreground">{s.username}</p>
                            <p className="text-xs text-muted-foreground">{s.email}</p>
                          </td>
                          <td className="px-5 py-3.5">
                            <span className="text-xs text-muted-foreground">
                              {s.assignedProvince || "—"}
                            </span>
                          </td>
                          <td className="px-5 py-3.5">
                            <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${acct.cls}`}>
                              {acct.label}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-right font-medium">{s.totalAccepted}</td>
                          <td className="px-5 py-3.5 text-right text-green-600 font-medium">{s.delivered}</td>
                          <td className="px-5 py-3.5 text-right text-purple-600 font-medium">{s.inTransit}</td>
                          <td className="px-5 py-3.5 text-center">
                            {(() => {
                              const cfg = SHIPPER_STATUS_CONFIG[s.shipperStatus] ?? { label: s.shipperStatus, cls: "bg-gray-100 text-gray-600 border-gray-200" };
                              return (
                                <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium border ${cfg.cls}`}>
                                  {cfg.label}
                                </span>
                              );
                            })()}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ── Orders Tab ── */}
      {activeTab === "orders" && (
        <div className="space-y-4">
          <div className="flex gap-3">
            <Select value={orderStatus} onValueChange={setOrderStatus}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending_acceptance">Pending Acceptance</SelectItem>
                <SelectItem value="shipping">Shipping</SelectItem>
                <SelectItem value="delivered">Delivered</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>

            <Select value={shipperId} onValueChange={setShipperId}>
              <SelectTrigger className="w-52">
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

          <div className="bg-white rounded-2xl border border-border/60 shadow-sm overflow-hidden">
            {loading ? (
              <div className="text-center py-12 text-muted-foreground">Loading...</div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="text-left px-5 py-3">Order ID</th>
                    <th className="text-left px-5 py-3">Buyer</th>
                    <th className="text-left px-5 py-3">Seller</th>
                    <th className="text-left px-5 py-3">Shipper</th>
                    <th className="text-right px-5 py-3">Amount</th>
                    <th className="text-left px-5 py-3">Status</th>
                    <th className="text-left px-5 py-3">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {orders.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-10 text-muted-foreground">
                        No orders found
                      </td>
                    </tr>
                  ) : (
                    orders.map((o) => {
                      const statusCls = ORDER_STATUS_CONFIG[o.status] ?? "bg-gray-100 text-gray-600";
                      return (
                        <tr key={o._id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-5 py-3.5 font-mono text-xs text-muted-foreground">
                            #{o._id.slice(-8).toUpperCase()}
                          </td>
                          <td className="px-5 py-3.5">{o.buyer?.username || "—"}</td>
                          <td className="px-5 py-3.5">
                            {o.seller?.sellerInfo?.shopName || o.seller?.username || "—"}
                          </td>
                          <td className="px-5 py-3.5">{o.shipper?.username || "—"}</td>
                          <td className="px-5 py-3.5 text-right font-medium">
                            ${o.totalAmount.toFixed(2)}
                          </td>
                          <td className="px-5 py-3.5">
                            <Badge variant="outline" className={`text-xs ${statusCls}`}>
                              {o.status.replace(/_/g, " ")}
                            </Badge>
                          </td>
                          <td className="px-5 py-3.5 text-muted-foreground">
                            {new Date(o.createdAt).toLocaleDateString()}
                          </td>
                        </tr>
                      );
                    })
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
