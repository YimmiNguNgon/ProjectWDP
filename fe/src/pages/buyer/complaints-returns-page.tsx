import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import api from "@/lib/axios";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { AlertCircle, Package, ArrowRight } from "lucide-react";

export default function ComplaintsReturnsPage() {
    const [activeTab, setActiveTab] = useState<"complaints" | "returns">("returns");
    const [returns, setReturns] = useState<any[]>([]);
    const [complaints, setComplaints] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [returnsRes, complaintsRes] = await Promise.all([
                api.get("/api/refund/buyer").catch(() => ({ data: { data: [] } })),
                api.get("/api/complaints/my").catch(() => ({ data: { data: [] } }))
            ]);
            
            setReturns(returnsRes.data?.data || []);
            setComplaints(complaintsRes.data?.data || []);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold">Returns & Complaints</h1>
            
            {/* Tabs */}
            <div className="flex space-x-2 border-b">
                <button
                    onClick={() => setActiveTab("returns")}
                    className={`px-4 py-2 border-b-2 font-medium text-sm transition-colors ${
                        activeTab === "returns" 
                        ? "border-blue-600 text-blue-600" 
                        : "border-transparent text-gray-500 hover:text-gray-700"
                    }`}
                >
                    Returns & Refunds ({returns.length})
                </button>
                <button
                    onClick={() => setActiveTab("complaints")}
                    className={`px-4 py-2 border-b-2 font-medium text-sm transition-colors ${
                        activeTab === "complaints" 
                        ? "border-blue-600 text-blue-600" 
                        : "border-transparent text-gray-500 hover:text-gray-700"
                    }`}
                >
                    Complaints ({complaints.length})
                </button>
            </div>

            {loading ? (
                <div className="py-12 text-center text-gray-500">Loading...</div>
            ) : (
                <div className="space-y-4">
                    {activeTab === "returns" && (
                        returns.length === 0 ? (
                            <div className="text-center py-12 text-gray-500 border rounded-lg bg-gray-50">
                                <Package className="mx-auto h-8 w-8 mb-2 text-gray-400" />
                                No return requests found.
                            </div>
                        ) : (
                            returns.map((r) => (
                                <Card key={r._id} className="p-5 flex flex-col sm:flex-row gap-4 justify-between hover:shadow-md transition-shadow">
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-3">
                                            <span className="font-semibold text-lg hover:underline cursor-pointer">Order #{r.order?._id?.slice(-8) || "N/A"}</span>
                                            <Badge variant={r.status === "REJECTED" ? "destructive" : r.status === "APPROVED" || r.status === "AUTO_APPROVED" || r.status === "ADMIN_APPROVED" ? "default" : "secondary"} className="uppercase">
                                                {r.status.replace("_", " ")}
                                            </Badge>
                                        </div>
                                        <p className="text-sm text-gray-600">Reason: {r.reason}</p>
                                        <p className="text-xs text-gray-400">Requested on: {new Date(r.requestedAt).toLocaleDateString()}</p>
                                    </div>
                                    <div className="flex items-center sm:items-end">
                                        <Link 
                                            to={`/purchases/${typeof r.order === 'object' ? r.order._id : r.order}/return`}
                                            className="text-blue-600 hover:underline text-sm font-medium flex items-center gap-1"
                                        >
                                            View Details <ArrowRight className="h-4 w-4" />
                                        </Link>
                                    </div>
                                </Card>
                            ))
                        )
                    )}

                    {activeTab === "complaints" && (
                        complaints.length === 0 ? (
                            <div className="text-center py-12 text-gray-500 border rounded-lg bg-gray-50">
                                <AlertCircle className="mx-auto h-8 w-8 mb-2 text-gray-400" />
                                No complaints found.
                            </div>
                        ) : (
                            complaints.map((c) => (
                                <Card key={c.id} className="p-5 flex flex-col sm:flex-row gap-4 justify-between hover:shadow-md transition-shadow">
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-3">
                                            <span className="font-semibold text-lg hover:underline cursor-pointer">Order #{c.orderId?.slice(-8) || "N/A"}</span>
                                            <Badge variant="secondary" className="uppercase">{c.status}</Badge>
                                        </div>
                                        <p className="text-sm text-gray-800 font-medium">Reason: {c.reason}</p>
                                        <p className="text-sm text-gray-600 line-clamp-2">{c.content}</p>
                                        <p className="text-xs text-gray-400">Created on: {c.createdAt}</p>
                                    </div>
                                    <div className="flex items-center sm:items-end">
                                        <Link 
                                            to={`/my-ebay/activity/purchases`} 
                                            className="text-blue-600 hover:underline text-sm font-medium flex items-center gap-1"
                                        >
                                            View Purchase History <ArrowRight className="h-4 w-4" />
                                        </Link>
                                    </div>
                                </Card>
                            ))
                        )
                    )}
                </div>
            )}
        </div>
    );
}
