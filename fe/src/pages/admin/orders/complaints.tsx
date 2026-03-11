import { useState, useEffect } from "react";
import api from "@/lib/axios";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { AlertTriangle, CheckCircle, XCircle } from "lucide-react";

export default function AdminComplaintsPage() {
    const [complaints, setComplaints] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedComplaint, setSelectedComplaint] = useState<any>(null);
    const [resolutionNote, setResolutionNote] = useState("");
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    useEffect(() => {
        fetchEscalatedComplaints();
    }, []);

    const fetchEscalatedComplaints = async () => {
        setLoading(true);
        try {
            const { data } = await api.get("/api/complaints/admin/sent");
            setComplaints(data.data || []);
        } catch (error) {
            console.error(error);
            toast.error("Failed to fetch escalated complaints");
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
            await api.post(`/api/complaints/admin/${selectedComplaint.id}/resolve`, {
                resolution,
                note: resolutionNote
            });
            
            toast.success(`Complaint marked as ${resolution}`);
            setIsDialogOpen(false);
            setResolutionNote("");
            fetchEscalatedComplaints();
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

    return (
        <div className="p-8">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">Escalated Buyer Complaints</h1>
            </div>

            {loading ? (
                <div>Loading escalated complaints...</div>
            ) : complaints.length === 0 ? (
                <div className="text-center py-12 text-gray-500 border rounded-lg bg-white">
                    <CheckCircle className="mx-auto h-8 w-8 mb-2 text-green-400" />
                    Hooray! No escalated complaints pending admin action right now.
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
                                <TableHead>Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {complaints.map((c) => (
                                <TableRow key={c.id}>
                                    <TableCell className="font-mono text-xs">{c.order?.slice(-8) || "N/A"}</TableCell>
                                    <TableCell className="font-medium text-blue-600">{c.buyer?.username || "Unknown"}</TableCell>
                                    <TableCell className="font-medium text-amber-600">{c.seller?.username || "Unknown"}</TableCell>
                                    <TableCell className="capitalize">{c.reason}</TableCell>
                                    <TableCell>
                                        <Badge variant="destructive" className="animate-pulse">
                                            {c.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <Button size="sm" onClick={() => openDialog(c)}>
                                            <AlertTriangle className="h-4 w-4 mr-2" />
                                            Adjudicate
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </Card>
            )}

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Admin Review Action</DialogTitle>
                        <DialogDescription>
                            If you approve this complaint, the seller's <strong className="text-red-500">Trust Score</strong> will be penalized. If you reject it, there is no penalty.
                        </DialogDescription>
                    </DialogHeader>

                    {selectedComplaint && (
                        <div className="space-y-4 my-2">
                            <div className="bg-gray-50 p-4 rounded-md text-sm">
                                <p><strong>Buyer:</strong> {selectedComplaint.buyer?.username}</p>
                                <p><strong>Seller:</strong> {selectedComplaint.seller?.username}</p>
                                <p><strong>Reason:</strong> {selectedComplaint.reason}</p>
                                <p className="mt-2"><strong>Buyer's Original Complaint:</strong></p>
                                <p className="text-gray-700 italic border-l-2 pl-2 mt-1">{selectedComplaint.content}</p>
                            </div>
                            
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Resolution Note (Mandatory)</label>
                                <Textarea 
                                    placeholder="Explain the reason for this decision. This will be visible to both buyer and seller."
                                    value={resolutionNote}
                                    onChange={(e) => setResolutionNote(e.target.value)}
                                />
                            </div>
                        </div>
                    )}
                    
                    <DialogFooter className="gap-2 sm:gap-0 mt-4">
                        <Button variant="outline" onClick={() => handleResolve("REJECTED")} className="w-full sm:w-auto border-red-200 text-red-600 hover:bg-red-50">
                            <XCircle className="w-4 h-4 mr-2" /> Reject Complaint
                        </Button>
                        <Button variant="default" onClick={() => handleResolve("APPROVED")} className="w-full sm:w-auto bg-green-600 hover:bg-green-700">
                            <CheckCircle className="w-4 h-4 mr-2" /> Approve & Penalize Seller
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
