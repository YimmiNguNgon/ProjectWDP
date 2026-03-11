import { useState, useEffect } from "react";
import api from "@/lib/axios";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { AlertCircle, FileText } from "lucide-react";

export default function SellerComplaintsPage() {
    const [complaints, setComplaints] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedComplaint, setSelectedComplaint] = useState<any>(null);
    const [replyNote, setReplyNote] = useState("");
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    useEffect(() => {
        fetchComplaints();
    }, []);

    const fetchComplaints = async () => {
        setLoading(true);
        try {
            const { data } = await api.get("/api/complaints/seller/all");
            setComplaints(data.data || []);
        } catch (error) {
            console.error(error);
            toast.error("Failed to load complaints");
        } finally {
            setLoading(false);
        }
    };

    const handleReply = async () => {
        if (!replyNote.trim()) {
            toast.error("Please enter a reply message");
            return;
        }

        try {
            await api.post(`/api/complaints/seller/${selectedComplaint.id}/handle`, {
                note: replyNote
            });
            toast.success("Reply submitted successfully. The complaint remains OPEN until resolved.");
            setIsDialogOpen(false);
            setReplyNote("");
            fetchComplaints();
        } catch (error) {
            console.error(error);
            toast.error("Failed to submit reply");
        }
    };

    const openDialog = (complaint: any) => {
        setSelectedComplaint(complaint);
        setReplyNote("");
        setIsDialogOpen(true);
    };

    return (
        <div className="p-8">
            <h1 className="text-2xl font-bold mb-6">Order Complaints from Buyers</h1>

            {loading ? (
                <div>Loading complaints...</div>
            ) : complaints.length === 0 ? (
                <div className="text-center py-12 text-gray-500 border rounded-lg bg-white">
                    <AlertCircle className="mx-auto h-8 w-8 mb-2 text-gray-400" />
                    No complaints found.
                </div>
            ) : (
                <Card>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Order ID</TableHead>
                                <TableHead>Buyer</TableHead>
                                <TableHead>Reason</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Created</TableHead>
                                <TableHead>Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {complaints.map((c) => (
                                <TableRow key={c.id}>
                                    <TableCell className="font-mono text-xs">{c.orderId?.slice(-8) || "N/A"}</TableCell>
                                    <TableCell>{c.buyer?.username || "Unknown"}</TableCell>
                                    <TableCell className="capitalize">{c.reason}</TableCell>
                                    <TableCell>
                                        <Badge variant={c.status === "OPEN" ? "destructive" : "secondary"}>
                                            {c.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>{new Date(c.createdAt).toLocaleDateString()}</TableCell>
                                    <TableCell>
                                        <Button variant="outline" size="sm" onClick={() => openDialog(c)}>
                                            <FileText className="h-4 w-4 mr-2" />
                                            View & Reply
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
                        <DialogTitle>Complaint Details</DialogTitle>
                        <DialogDescription>
                            Review the buyer's complaint and provide your response.
                        </DialogDescription>
                    </DialogHeader>
                    {selectedComplaint && (
                        <div className="space-y-4 my-2">
                            <div className="bg-gray-50 p-4 rounded-md text-sm">
                                <p><strong>Buyer:</strong> {selectedComplaint.buyer?.username}</p>
                                <p><strong>Reason:</strong> {selectedComplaint.reason}</p>
                                <p className="mt-2"><strong>Content:</strong></p>
                                <p className="text-gray-700 italic border-l-2 pl-2 mt-1">{selectedComplaint.content}</p>
                            </div>
                            
                            {selectedComplaint.status === "OPEN" && (
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Your Reply Note</label>
                                    <Textarea 
                                        placeholder="Explain your side or offer a solution to the buyer..."
                                        value={replyNote}
                                        onChange={(e) => setReplyNote(e.target.value)}
                                    />
                                </div>
                            )}

                            {selectedComplaint.status !== "OPEN" && (
                                <div className="text-sm text-yellow-600 bg-yellow-50 p-3 rounded">
                                    This complaint is currently {selectedComplaint.status} and cannot be replied to from this screen.
                                </div>
                            )}
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                        {selectedComplaint?.status === "OPEN" && (
                            <Button onClick={handleReply}>Submit Reply</Button>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
