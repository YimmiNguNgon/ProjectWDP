import { useState, useEffect } from "react";
import api from "@/lib/axios";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { AlertTriangle, CheckCircle, XCircle, RefreshCw } from "lucide-react";

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  // Uppercase (model enum)
  OPEN: { label: "Open", className: "bg-yellow-100 text-yellow-800" },
  SENT_TO_ADMIN: { label: "Sent to Admin", className: "bg-red-100 text-red-800" },
  RESOLVED: { label: "Resolved", className: "bg-green-100 text-green-800" },
  CLOSED: { label: "Closed", className: "bg-gray-100 text-gray-600" },
  // Legacy lowercase values in DB
  open: { label: "Open", className: "bg-yellow-100 text-yellow-800" },
  sent_to_admin: { label: "Sent to Admin", className: "bg-red-100 text-red-800" },
  resolved: { label: "Resolved", className: "bg-green-100 text-green-800" },
  closed: { label: "Closed", className: "bg-gray-100 text-gray-600" },
  // Old legacy statuses from previous schema
  agreed: { label: "Seller Agreed", className: "bg-blue-100 text-blue-800" },
  rejected: { label: "Rejected", className: "bg-gray-100 text-gray-800" },
};

export default function AdminComplaintsPage() {
    const [complaints, setComplaints] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedComplaint, setSelectedComplaint] = useState<any>(null);
    const [resolutionNote, setResolutionNote] = useState("");
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [statusFilter, setStatusFilter] = useState("all");

    useEffect(() => {
        fetchComplaints();
    }, [statusFilter]);

    const fetchComplaints = async () => {
        setLoading(true);
        try {
            const params: Record<string, string> = {};
            if (statusFilter !== "all") params.status = statusFilter;
            const { data } = await api.get("/api/complaints/admin/sent", { params });
            setComplaints(data.data || []);
        } catch (error) {
            console.error(error);
            toast.error("Failed to fetch complaints");
        } finally {
            setLoading(false);
        }
    };

    const handleResolve = async (resolution: "APPROVED" | "REJECTED") => {
        if (!resolutionNote.trim()) {
            toast.error("An admin resolution note is required to finalize this dispute.");
            return;
        }

        try {
            await api.post(`/api/complaints/admin/${selectedComplaint._id || selectedComplaint.id}/resolve`, {
                resolution,
                note: resolutionNote
            });

            toast.success(`Complaint marked as ${resolution}`);
            setIsDialogOpen(false);
            setResolutionNote("");
            fetchComplaints();
        } catch (error) {
            console.error(error);
            toast.error("Failed to resolve complaint");
        }
    };

    const openDialog = (complaint: any) => {
        setSelectedComplaint(complaint);
        setResolutionNote("");
        setIsDialogOpen(true);
    };

    const canAdjudicate = (status: string) =>
        status?.toUpperCase() === "SENT_TO_ADMIN";

    return (
        <div className="p-8">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">Complaints Management</h1>
                <div className="flex items-center gap-3">
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-48">
                            <SelectValue placeholder="Filter by status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Complaints</SelectItem>
                            <SelectItem value="OPEN">Open</SelectItem>
                            <SelectItem value="SENT_TO_ADMIN">Sent to Admin</SelectItem>
                            <SelectItem value="RESOLVED">Resolved</SelectItem>
                            <SelectItem value="CLOSED">Closed</SelectItem>
                        </SelectContent>
                    </Select>
                    <Button variant="outline" size="icon" onClick={fetchComplaints}>
                        <RefreshCw className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {loading ? (
                <div className="text-center py-12 text-gray-500">Loading complaints...</div>
            ) : complaints.length === 0 ? (
                <div className="text-center py-12 text-gray-500 border rounded-lg bg-white">
                    <CheckCircle className="mx-auto h-8 w-8 mb-2 text-green-400" />
                    No complaints found for the selected filter.
                </div>
            ) : (
                <Card>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Order ID</TableHead>
                                <TableHead>Buyer</TableHead>
                                <TableHead>Seller</TableHead>
                                <TableHead>Reason</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Created</TableHead>
                                <TableHead>Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {complaints.map((c) => {
                                const orderId = c.order?._id?.toString() || c.order?.toString() || "";
                                const badge = STATUS_BADGE[c.status] ?? { label: c.status, className: "bg-gray-100 text-gray-700" };
                                return (
                                    <TableRow key={c.id || c._id}>
                                        <TableCell className="font-mono text-xs">
                                            {orderId ? `#${orderId.slice(-8).toUpperCase()}` : "N/A"}
                                        </TableCell>
                                        <TableCell className="font-medium text-blue-600">
                                            {c.buyer?.username || "Unknown"}
                                        </TableCell>
                                        <TableCell className="font-medium text-amber-600">
                                            {c.seller?.username || "Unknown"}
                                        </TableCell>
                                        <TableCell className="capitalize">{c.reason?.replace(/_/g, " ")}</TableCell>
                                        <TableCell>
                                            <Badge className={badge.className}>
                                                {badge.label}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-xs text-muted-foreground">
                                            {c.createdAt}
                                        </TableCell>
                                        <TableCell>
                                            <Button
                                                size="sm"
                                                variant={canAdjudicate(c.status) ? "default" : "outline"}
                                                onClick={() => openDialog(c)}
                                            >
                                                <AlertTriangle className="h-4 w-4 mr-2" />
                                                {canAdjudicate(c.status) ? "Adjudicate" : "View"}
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </Card>
            )}

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>
                            {selectedComplaint && canAdjudicate(selectedComplaint.status)
                                ? "Admin Review Action"
                                : "Complaint Detail"}
                        </DialogTitle>
                        <DialogDescription>
                            {selectedComplaint && canAdjudicate(selectedComplaint.status)
                                ? "If you approve this complaint, the seller's Trust Score will be penalized."
                                : "Details of this complaint."}
                        </DialogDescription>
                    </DialogHeader>

                    {selectedComplaint && (
                        <div className="space-y-4 my-2">
                            <div className="bg-gray-50 p-4 rounded-md text-sm space-y-1">
                                <p><strong>Buyer:</strong> {selectedComplaint.buyer?.username}</p>
                                <p><strong>Seller:</strong> {selectedComplaint.seller?.username}</p>
                                <p><strong>Reason:</strong> <span className="capitalize">{selectedComplaint.reason?.replace(/_/g, " ")}</span></p>
                                <p><strong>Status:</strong> {STATUS_BADGE[selectedComplaint.status]?.label || selectedComplaint.status}</p>
                                <p className="mt-2"><strong>Complaint:</strong></p>
                                <p className="text-gray-700 italic border-l-2 pl-2 mt-1">{selectedComplaint.content}</p>

                                {/* Evidence Images */}
                                {selectedComplaint.images && selectedComplaint.images.length > 0 && (
                                    <div className="mt-3">
                                        <p className="font-semibold mb-2">Evidence ({selectedComplaint.images.length} photo{selectedComplaint.images.length > 1 ? "s" : ""})</p>
                                        <div className="flex flex-wrap gap-2">
                                            {selectedComplaint.images.map((img: { url: string }, idx: number) => (
                                                <a
                                                    key={idx}
                                                    href={img.url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="block w-20 h-20 rounded border bg-white overflow-hidden hover:opacity-80 hover:ring-2 hover:ring-blue-400 transition-all"
                                                    title="Click to view full size"
                                                >
                                                    <img
                                                        src={img.url}
                                                        alt={`Evidence ${idx + 1}`}
                                                        className="w-full h-full object-cover"
                                                    />
                                                </a>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {selectedComplaint.resolutionNote && (
                                    <>
                                        <p className="mt-2"><strong>Resolution Note:</strong></p>
                                        <p className="text-gray-700 italic border-l-2 pl-2 mt-1">{selectedComplaint.resolutionNote}</p>
                                    </>
                                )}
                            </div>

                            {canAdjudicate(selectedComplaint.status) && (
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Resolution Note (Required)</label>
                                    <Textarea
                                        placeholder="Explain the reason for this decision. This will be visible to both buyer and seller."
                                        value={resolutionNote}
                                        onChange={(e) => setResolutionNote(e.target.value)}
                                    />
                                </div>
                            )}
                        </div>
                    )}

                    <DialogFooter className="gap-2 sm:gap-0 mt-4">
                        {selectedComplaint && canAdjudicate(selectedComplaint.status) ? (
                            <>
                                <Button variant="outline" onClick={() => handleResolve("REJECTED")} className="w-full sm:w-auto border-red-200 text-red-600 hover:bg-red-50">
                                    <XCircle className="w-4 h-4 mr-2" /> Reject Complaint
                                </Button>
                                <Button variant="default" onClick={() => handleResolve("APPROVED")} className="w-full sm:w-auto bg-green-600 hover:bg-green-700">
                                    <CheckCircle className="w-4 h-4 mr-2" /> Approve & Penalize Seller
                                </Button>
                            </>
                        ) : (
                            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                                Close
                            </Button>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
