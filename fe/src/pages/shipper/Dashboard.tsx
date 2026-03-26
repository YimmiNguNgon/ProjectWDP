import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Truck,
  CheckCircle,
  Package,
  Clock,
  ArrowRight,
  MapPin,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  getShipperStats,
  type ShipperStats,
} from "@/api/shipper";

export default function ShipperDashboard() {
  const [stats, setStats] = useState<ShipperStats>({
    delivered: 0,
    inTransit: 0,
    totalAccepted: 0,
    isAvailable: true,
    shipperStatus: "available",
    assignedProvince: "",
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getShipperStats()
      .then((res) => setStats(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Shipper Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">Manage your deliveries</p>
      </div>

      {/* Province Info */}
      {!loading && stats.assignedProvince && (
        <div className="flex items-center gap-3 bg-blue-50 border border-blue-100 rounded-xl px-5 py-3">
          <MapPin className="h-4 w-4 text-blue-500 shrink-0" />
          <p className="text-sm text-blue-700">
            Assigned area:{" "}
            <span className="font-semibold">{stats.assignedProvince}</span>
          </p>
        </div>
      )}


      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <Card className="border-0 ring-1 ring-gray-100 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">In Transit</CardTitle>
            <div className="w-9 h-9 rounded-lg bg-orange-50 flex items-center justify-center">
              <Truck className="h-5 w-5 text-orange-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-600">
              {loading ? "—" : stats.inTransit}
            </div>
            <p className="text-xs text-gray-400 mt-1">Orders currently on the way</p>
          </CardContent>
        </Card>

        <Card className="border-0 ring-1 ring-gray-100 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Delivered</CardTitle>
            <div className="w-9 h-9 rounded-lg bg-green-50 flex items-center justify-center">
              <CheckCircle className="h-5 w-5 text-green-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              {loading ? "—" : stats.delivered}
            </div>
            <p className="text-xs text-gray-400 mt-1">Successfully delivered</p>
          </CardContent>
        </Card>

        <Card className="border-0 ring-1 ring-gray-100 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Total Accepted</CardTitle>
            <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
              <Package className="h-5 w-5 text-blue-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">
              {loading ? "—" : stats.totalAccepted}
            </div>
            <p className="text-xs text-gray-400 mt-1">All time</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-2">
        <Card className="border-0 ring-1 ring-gray-100 shadow-sm hover:ring-orange-200 transition-all">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-orange-50 flex items-center justify-center shrink-0">
                <Package className="h-6 w-6 text-orange-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900">Available Orders</p>
                <p className="text-sm text-gray-500">Browse and accept new delivery orders</p>
              </div>
              <Link to="/shipper/available">
                <Button size="sm" className="bg-orange-600 hover:bg-orange-700 shrink-0">
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 ring-1 ring-gray-100 shadow-sm hover:ring-blue-200 transition-all">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                <Clock className="h-6 w-6 text-blue-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900">My Deliveries</p>
                <p className="text-sm text-gray-500">Track and update your active orders</p>
              </div>
              <Link to="/shipper/my-orders">
                <Button size="sm" variant="outline" className="shrink-0">
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
