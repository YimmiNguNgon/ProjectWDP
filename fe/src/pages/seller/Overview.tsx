import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  Package,
  ShoppingBag,
  DollarSign,
  Star,
  TrendingUp,
  RefreshCw,
  ShieldCheck,
  Pencil,
  Check,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/use-auth";
import api from "@/lib/axios";
import { toast } from "sonner";

interface Province { code: number; name: string; }
interface District { code: number; name: string; }
interface Ward { code: number; name: string; }

interface RecentOrder {
  _id: string;
  orderId: string;
  customer: string | { _id: string; username: string; email: string };
  totalAmount: number;
  status: string;
  date: string;
}

interface InventoryData {
  totalProducts: number;
  activeProducts: number;
  lowStockCount: number;
  outOfStock: number;
}

interface DashboardStats {
  pendingOrders: number;
  totalRevenue: number;
  completedOrders: number;
}

const STATUS_STYLE: Record<string, string> = {
  delivered: "bg-green-100 text-green-800",
  paid: "bg-blue-100 text-blue-800",
  processing: "bg-blue-100 text-blue-800",
  shipping: "bg-cyan-100 text-cyan-800",
  pending_acceptance: "bg-orange-100 text-orange-800",
  ready_to_ship: "bg-yellow-100 text-yellow-800",
  created: "bg-yellow-100 text-yellow-800",
  cancelled: "bg-red-100 text-red-800",
  returned: "bg-orange-100 text-orange-800",
  completed: "bg-green-100 text-green-800",
  failed: "bg-red-100 text-red-800",
};

const STATUS_LABEL: Record<string, string> = {
  delivered: "Completed",
  paid: "Paid",
  processing: "Processing",
  shipping: "Shipping",
  pending_acceptance: "Waiting Shipper",
  ready_to_ship: "Waiting",
  created: "Created",
  cancelled: "Cancelled",
  returned: "Returned",
  completed: "Completed",
  failed: "Failed",
};

export default function SellerOverview() {
  const { user } = useAuth();

  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [inventory, setInventory] = useState<InventoryData | null>(null);
  const [stats, setStats] = useState<DashboardStats>({
    pendingOrders: 0,
    totalRevenue: 0,
    completedOrders: 0,
  });
  const [loading, setLoading] = useState(true);

  // Description state
  const [description, setDescription] = useState("");
  const [editingDesc, setEditingDesc] = useState(false);
  const [descDraft, setDescDraft] = useState("");
  const [savingDesc, setSavingDesc] = useState(false);

  // Shop address state
  const [shopAddress, setShopAddress] = useState("");         // city name (for routing)
  const [shopAddressDetail, setShopAddressDetail] = useState(""); // detail string
  const [editingAddr, setEditingAddr] = useState(false);
  const [savingAddr, setSavingAddr] = useState(false);

  // Cascading address selects
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [wards, setWards] = useState<Ward[]>([]);
  const [selProvince, setSelProvince] = useState("");
  const [selDistrict, setSelDistrict] = useState("");
  const [selWard, setSelWard] = useState("");
  const [selStreet, setSelStreet] = useState("");
  const [selProvinceCode, setSelProvinceCode] = useState<number | null>(null);
  const [selDistrictCode, setSelDistrictCode] = useState<number | null>(null);

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      try {
        const [ordersRes, inventoryRes, orderStatsRes, revenueRes] = await Promise.allSettled([
          api.get("/api/orders", { params: { role: "seller", limit: 5 } }),
          api.get("/api/products/seller/inventory"),
          api.get("/api/orders/stats"),
          api.get("/api/revenue/seller"),
        ]);

        // Xử lý orders (This is just for the Recent Orders list)
        if (ordersRes.status === "fulfilled") {
          const data = ordersRes.value.data;
          const orders: RecentOrder[] = (data.data ?? []).slice(0, 5);
          setRecentOrders(orders);
        }

        // Xử lý Dashboard Stats
        let pending = 0;
        let completed = 0;
        let revenue = 0;

        if (orderStatsRes.status === "fulfilled") {
          const sData = orderStatsRes.value.data.data;
          pending = sData?.pendingOrders ?? 0;
          completed = sData?.completedOrders ?? 0;
        }

        if (revenueRes.status === "fulfilled") {
          revenue = revenueRes.value.data.totalNet ?? 0;
        }

        setStats({
          pendingOrders: pending,
          completedOrders: completed,
          totalRevenue: revenue,
        });

        // Xử lý inventory
        if (inventoryRes.status === "fulfilled") {
          setInventory(inventoryRes.value.data.data);
        }
      } catch (err) {
        console.error("[Overview] Fetch error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, []);

  useEffect(() => {
    api.get("/api/users/me").then((res) => {
      const info = res.data?.user?.sellerInfo ?? res.data?.sellerInfo ?? {};
      setDescription(info.productDescription ?? "");
      setShopAddress(info.shopAddress ?? "");
      setShopAddressDetail(info.shopAddressDetail ?? "");
    }).catch(() => {});
  }, []);

  // Load provinces on mount
  useEffect(() => {
    fetch("https://provinces.open-api.vn/api/?depth=1")
      .then((r) => r.json())
      .then((data: Province[]) => setProvinces(data))
      .catch(() => {});
  }, []);

  // Load districts when province changes
  const fetchDistricts = useCallback((provinceCode: number) => {
    setDistricts([]);
    setWards([]);
    setSelDistrict("");
    setSelDistrictCode(null);
    setSelWard("");
    fetch(`https://provinces.open-api.vn/api/p/${provinceCode}?depth=2`)
      .then((r) => r.json())
      .then((data: { districts: District[] }) => setDistricts(data.districts || []))
      .catch(() => {});
  }, []);

  // Load wards when district changes
  const fetchWards = useCallback((districtCode: number) => {
    setWards([]);
    setSelWard("");
    fetch(`https://provinces.open-api.vn/api/d/${districtCode}?depth=2`)
      .then((r) => r.json())
      .then((data: { wards: Ward[] }) => setWards(data.wards || []))
      .catch(() => {});
  }, []);

  const handleOpenEditAddr = () => {
    // Pre-fill from current saved detail if possible
    setSelStreet("");
    setSelProvince(shopAddress);
    setSelDistrict("");
    setSelWard("");
    setSelProvinceCode(null);
    setSelDistrictCode(null);
    setDistricts([]);
    setWards([]);
    setEditingAddr(true);
  };

  const handleSaveDescription = async () => {
    setSavingDesc(true);
    try {
      await api.put("/api/users/update-user-profile", {
        username: user?.username ?? "",
        productDescription: descDraft,
      });
      setDescription(descDraft);
      setEditingDesc(false);
      toast.success("Description updated");
    } catch {
      toast.error("Failed to update description");
    } finally {
      setSavingDesc(false);
    }
  };

  const handleSaveAddress = async () => {
    if (!selProvince) { toast.error("Please select a province/city"); return; }
    setSavingAddr(true);
    const detailParts = [selStreet, selWard, selDistrict].filter(Boolean);
    const detail = detailParts.join(", ");
    try {
      await api.put("/api/users/update-user-profile", {
        username: user?.username ?? "",
        shopAddress: selProvince,
        shopAddressDetail: detail,
      });
      setShopAddress(selProvince);
      setShopAddressDetail(detail);
      setEditingAddr(false);
      toast.success("Shop address updated");
    } catch {
      toast.error("Failed to update address");
    } finally {
      setSavingAddr(false);
    }
  };

  const isProbation = user?.sellerStage === "PROBATION";
  const avgRating = user?.sellerInfo?.avgRating ?? 0;
  const shopName = user?.sellerInfo?.shopName ?? user?.username ?? "";

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Overview</h1>
          <p className="text-gray-600">
            Shop: <strong>{shopName}</strong>
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => window.location.reload()}
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>


      <Card className="border-blue-200 bg-gradient-to-r from-blue-50 via-cyan-50 to-white">
        <CardContent className="py-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <ShieldCheck className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="font-semibold text-gray-900">
                  Seller Score Center
                </p>
                <p className="text-xs text-gray-600 mt-1">
                  View score breakdown, moderation impact, and warning signals.
                </p>
              </div>
            </div>
            <Button asChild className="bg-blue-600 hover:bg-blue-700">
              <Link to="/seller/trust-score">View score</Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-7 w-24 bg-muted animate-pulse rounded" />
            ) : (
              <>
                <div className="text-2xl font-bold">
                  ${stats.totalRevenue.toFixed(2)}
                </div>
                <div className="text-xs text-muted-foreground">
                  From {stats.completedOrders} completed orders
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Pending Orders
            </CardTitle>
            <ShoppingBag className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-7 w-16 bg-muted animate-pulse rounded" />
            ) : (
              <>
                <div className="text-2xl font-bold">{stats.pendingOrders}</div>
                <div className="text-xs text-muted-foreground">
                  Orders awaiting processing
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Active Products
            </CardTitle>
            <Package className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            {loading || !inventory ? (
              <div className="h-7 w-20 bg-muted animate-pulse rounded" />
            ) : (
              <>
                <div className="text-2xl font-bold">
                  {inventory.activeProducts}/{inventory.totalProducts}
                </div>
                <div className="text-xs text-muted-foreground">
                  Active Products
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Average Rating
            </CardTitle>
            <Star className="h-4 w-4 text-yellow-600 fill-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {avgRating > 0 ? avgRating.toFixed(1) : "--"}/5
            </div>
            <div className="text-xs text-muted-foreground">
              {avgRating > 0 ? "Average Rating" : "No Ratings Yet"}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Seller stage progress (nếu PROBATION) */}
      {isProbation && user?.sellerInfo && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Upgrade Progress to NORMAL stage
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                {
                  label: "Completed Orders",
                  value: user.sellerInfo.successOrders ?? 0,
                  target: 20,
                  unit: "",
                  suffix: "/20",
                },
                {
                  label: "Average Rating",
                  value: avgRating,
                  target: 4.5,
                  unit: "⭐",
                  suffix: "/4.5",
                },
                {
                  label: "Refund rate",
                  value: user.sellerInfo.refundRate ?? 0,
                  target: 5,
                  unit: "%",
                  suffix: "< 5%",
                  lowerIsBetter: true,
                },
              ].map((item) => {
                const ok = item.lowerIsBetter
                  ? item.value < item.target
                  : item.value >= item.target;
                return (
                  <div
                    key={item.label}
                    className="flex flex-col gap-1 p-3 rounded-lg border bg-muted/30"
                  >
                    <span className="text-xs text-muted-foreground">
                      {item.label}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`text-lg font-bold ${ok ? "text-green-600" : "text-amber-600"}`}
                      >
                        {typeof item.value === "number"
                          ? item.value % 1 === 0
                            ? item.value
                            : item.value.toFixed(1)
                          : item.value}
                        {item.unit}
                      </span>
                      <Badge
                        variant={ok ? "default" : "secondary"}
                        className={`text-xs ${ok ? "bg-green-100 text-green-700 hover:bg-green-100" : ""}`}
                      >
                        {ok ? "✓" : item.suffix}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Shop Description */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Shop Description</CardTitle>
          {!editingDesc && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => { setDescDraft(description); setEditingDesc(true); }}
            >
              <Pencil className="h-4 w-4" />
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {editingDesc ? (
            <div className="space-y-2">
              <Textarea
                value={descDraft}
                onChange={(e) => setDescDraft(e.target.value)}
                placeholder="Describe your shop to buyers..."
                rows={4}
                className="resize-none"
                maxLength={500}
              />
              <p className="text-xs text-muted-foreground text-right">{descDraft.length}/500</p>
              <div className="flex gap-2">
                <Button size="sm" onClick={handleSaveDescription} disabled={savingDesc}>
                  <Check className="h-4 w-4 mr-1" />
                  Save
                </Button>
                <Button size="sm" variant="outline" onClick={() => setEditingDesc(false)}>
                  <X className="h-4 w-4 mr-1" />
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground whitespace-pre-line">
              {description || "No description yet. Click the edit button to add one."}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Shop Address */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Shop Address</CardTitle>
          {!editingAddr && (
            <Button variant="ghost" size="icon" onClick={handleOpenEditAddr}>
              <Pencil className="h-4 w-4" />
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {editingAddr ? (
            <div className="space-y-3">
              {/* Province */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Province / City <span className="text-red-500">*</span></label>
                <select
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-400"
                  value={selProvinceCode ?? ""}
                  onChange={(e) => {
                    const code = Number(e.target.value);
                    const found = provinces.find((p) => p.code === code);
                    setSelProvinceCode(code || null);
                    setSelProvince(found?.name ?? "");
                    if (code) fetchDistricts(code);
                  }}
                >
                  <option value="">Select province / city</option>
                  {provinces.map((p) => (
                    <option key={p.code} value={p.code}>{p.name}</option>
                  ))}
                </select>
              </div>
              {/* District */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">District</label>
                <select
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-400 disabled:bg-gray-50 disabled:text-gray-400"
                  value={selDistrictCode ?? ""}
                  disabled={districts.length === 0}
                  onChange={(e) => {
                    const code = Number(e.target.value);
                    const found = districts.find((d) => d.code === code);
                    setSelDistrictCode(code || null);
                    setSelDistrict(found?.name ?? "");
                    if (code) fetchWards(code);
                  }}
                >
                  <option value="">Select district</option>
                  {districts.map((d) => (
                    <option key={d.code} value={d.code}>{d.name}</option>
                  ))}
                </select>
              </div>
              {/* Ward */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Ward / Commune</label>
                <select
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-400 disabled:bg-gray-50 disabled:text-gray-400"
                  value={selWard}
                  disabled={wards.length === 0}
                  onChange={(e) => setSelWard(e.target.value)}
                >
                  <option value="">Select ward / commune</option>
                  {wards.map((w) => (
                    <option key={w.code} value={w.name}>{w.name}</option>
                  ))}
                </select>
              </div>
              {/* Street */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Street / House number</label>
                <input
                  type="text"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                  placeholder="e.g. 123 Nguyen Trai"
                  value={selStreet}
                  onChange={(e) => setSelStreet(e.target.value)}
                />
              </div>
              {/* Preview */}
              {selProvince && (
                <p className="text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2">
                  📍 {[selStreet, selWard, selDistrict, selProvince].filter(Boolean).join(", ")}
                </p>
              )}
              <div className="flex gap-2 pt-1">
                <Button size="sm" onClick={handleSaveAddress} disabled={savingAddr}>
                  <Check className="h-4 w-4 mr-1" />
                  Save
                </Button>
                <Button size="sm" variant="outline" onClick={() => setEditingAddr(false)}>
                  <X className="h-4 w-4 mr-1" />
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              {shopAddress
                ? [shopAddressDetail, shopAddress].filter(Boolean).join(", ")
                : "No address yet. Click the edit button to add one."}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Recent orders */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Orders</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div
                  key={i}
                  className="h-14 bg-muted animate-pulse rounded-lg"
                />
              ))}
            </div>
          ) : recentOrders.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <ShoppingBag className="h-10 w-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No orders yet</p>
              <p className="text-xs mt-1">
                Orders will appear here when customers purchase your products
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentOrders.map((order) => (
                <div
                  key={order._id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/30 transition-colors"
                >
                  <div>
                    <div className="font-medium text-sm">
                      {order.orderId ||
                        `#${String(order._id).slice(-6).toUpperCase()}`}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {typeof order.customer === "object" ? order.customer.username : order.customer}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium text-sm">
                      ${(order.totalAmount ?? 0).toFixed(2)}
                    </div>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full inline-block ${STATUS_STYLE[order.status] ?? "bg-gray-100 text-gray-700"}`}
                    >
                      {STATUS_LABEL[order.status] ?? order.status}
                    </span>
                  </div>
                </div>
              ))}
              <Link
                to="/seller/orders"
                className="block text-center text-primary hover:text-primary/80 text-sm mt-2"
              >
                View All Orders →
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
