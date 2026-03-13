import { useState, useEffect } from "react";
import api from "@/lib/axios";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { AlertCircle, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

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
                <div className="grid gap-4">
                    {complaints.map((c) => {
                        const firstItem = c.order?.items?.[0];
                        const productImg = firstItem?.productId?.images?.[0] || firstItem?.image || "";
                        const productTitle = firstItem?.productId?.title || firstItem?.title || "Unknown Product";
                        
                        return (
                            <Card key={c.id} className="overflow-hidden border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                                <div className="p-5 flex flex-col md:flex-row justify-between md:items-center gap-4">
                                    <div className="flex-1 space-y-3">
                                        <div className="flex items-center gap-3">
                                            <Badge 
                                                variant="outline" 
                                                className={cn(
                                                    "capitalize",
                                                    c.status?.toUpperCase() === "OPEN" ? "bg-red-50 text-red-700 border-red-200" :
                                                    c.status?.toUpperCase() === "SENT_TO_ADMIN" ? "bg-amber-50 text-amber-700 border-amber-200" :
                                                    "bg-blue-50 text-blue-700 border-blue-200"
                                                )}
                                            >
                                                {c.status?.replace(/_/g, ' ')}
                                            </Badge>
                                            <span className="text-sm font-semibold">
                                                Order #{c.orderId?.slice(-8)?.toUpperCase() || "N/A"}
                                            </span>
                                            <span className="text-sm text-gray-500 whitespace-nowrap hidden sm:inline-block">
                                                {c.createdAt}
                                            </span>
                                        </div>

                                        <div className="flex items-start gap-3 mt-2 border p-3 rounded-lg bg-gray-50/50">
                                            {productImg ? (
                                                <img src={productImg} alt="Product" className="w-12 h-12 rounded object-cover flex-shrink-0 border bg-white" />
                                            ) : (
                                                <div className="w-12 h-12 rounded bg-gray-100 flex items-center justify-center flex-shrink-0 border">
                                                    <span className="text-[10px] text-gray-400">No img</span>
                                                </div>
                                            )}
                                            <div className="flex flex-col">
                                                <span className="text-sm font-medium line-clamp-1">{productTitle}</span>
                                                <span className="text-xs text-gray-500 mt-1">
                                                    <span className="font-semibold text-gray-900">{c.buyer?.username || "Unknown"}</span> submitted a complaint for <span className="font-semibold text-gray-900 capitalize">{c.reason}</span>
                                                </span>
                                            </div>
                                        </div>

                                        {c.status?.toUpperCase() === "OPEN" && (
                                            <div className="flex items-center text-xs text-red-600 font-medium bg-red-50 w-fit px-2 py-1 rounded">
                                                <AlertCircle className="w-3.5 h-3.5 justify-center mr-1" />
                                                Action Required: Please reply to this complaint.
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex flex-col items-end gap-2 min-w-max">
                                        <span className="text-xs text-gray-400 sm:hidden">
                                            {c.createdAt}
                                        </span>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="hover:bg-blue-50 hover:text-blue-600 transition-colors"
                                            onClick={() => openDialog(c)}
                                        >
                                            <FileText className="w-4 h-4 mr-2" />
                                            View & Reply
                                        </Button>
                                    </div>
                                </div>
                            </Card>
                        );
                    })}
                </div>
            )}

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent showCloseButton={false} className="max-w-4xl sm:max-w-4xl md:max-w-5xl p-0 overflow-hidden border-0 shadow-2xl rounded-xl w-[95vw] h-[90vh] sm:h-[600px] flex flex-col">
                    <DialogTitle className="sr-only">Complaint Details</DialogTitle>
                    {selectedComplaint && (() => {
                        const firstItem = selectedComplaint.order?.items?.[0];
                        const productImg = firstItem?.productId?.images?.[0] || firstItem?.image || "";
                        const productTitle = firstItem?.productId?.title || firstItem?.title || "Unknown Product";

                        return (
                            <div className="flex flex-col md:flex-row h-full overflow-hidden">
                                {/* Left Side: Context */}
                                <div className="w-full md:w-[35%] bg-gray-50/80 border-r border-gray-200 p-6 flex flex-col overflow-y-auto">
                                    <div className="mb-6">
                                        <Badge 
                                            variant="outline" 
                                            className={cn(
                                                "capitalize mb-3",
                                                selectedComplaint.status?.toUpperCase() === "OPEN" ? "bg-red-50 text-red-700 border-red-200" :
                                                selectedComplaint.status?.toUpperCase() === "SENT_TO_ADMIN" ? "bg-amber-50 text-amber-700 border-amber-200" :
                                                "bg-blue-50 text-blue-700 border-blue-200"
                                            )}
                                        >
                                            {selectedComplaint.status?.replace(/_/g, ' ')}
                                        </Badge>
                                        <h2 className="text-2xl font-semibold text-gray-900 mb-1">Complaint Details</h2>
                                        <p className="text-sm text-gray-500 font-mono">Order #{selectedComplaint.orderId?.slice(-8).toUpperCase()}</p>
                                    </div>

                                    <div className="space-y-6">
                                        {/* Product Info */}
                                        <div className="bg-white p-4 rounded-lg border border-gray-100 shadow-sm flex gap-4 items-center">
                                            {productImg ? (
                                                <img src={productImg} alt="Product" className="w-14 h-14 rounded-md object-cover border" />
                                            ) : (
                                                <div className="w-14 h-14 rounded-md bg-gray-100 border flex items-center justify-center">
                                                    <span className="text-xs text-gray-400">No img</span>
                                                </div>
                                            )}
                                            <div className="flex-1">
                                                <h4 className="text-sm font-semibold text-gray-900 line-clamp-2">{productTitle}</h4>
                                                <p className="text-xs text-gray-500 mt-1">Price: ${firstItem?.unitPrice || selectedComplaint.order?.totalAmount || "0"} x {firstItem?.quantity || 1}</p>
                                            </div>
                                        </div>

                                        {/* Buyer Info */}
                                        <div>
                                            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Customer</h4>
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm">
                                                    {selectedComplaint.buyer?.username?.[0]?.toUpperCase() || "U"}
                                                </div>
                                                <span className="text-sm font-medium text-gray-900">{selectedComplaint.buyer?.username || "Unknown"}</span>
                                            </div>
                                        </div>

                                        {/* Original Incident */}
                                        <div>
                                            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Issue Reported</h4>
                                            <div className="bg-orange-50/50 p-4 rounded-lg border border-orange-100">
                                                <div className="font-medium text-orange-900 capitalize text-sm mb-2 text-wrap break-words">{selectedComplaint.reason}</div>
                                                <p className="text-sm text-gray-700 italic border-l-2 border-orange-200 pl-3 mt-2">{selectedComplaint.content}</p>
                                            </div>
                                        </div>

                                        {/* Evidence */}
                                        {selectedComplaint.images && selectedComplaint.images.length > 0 && (
                                            <div>
                                                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Evidence ({selectedComplaint.images.length})</h4>
                                                <div className="flex flex-wrap gap-2">
                                                    {selectedComplaint.images.map((img: any, idx: number) => (
                                                        <div key={idx} className="w-16 h-16 rounded border bg-white cursor-pointer hover:opacity-80 transition-opacity" onClick={() => window.open(img.url, "_blank")}>
                                                            <img src={img.url} className="w-full h-full object-cover rounded" alt="Evidence" />
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Right Side: Conversation Timeline */}
                                <div className="w-full md:w-[65%] flex flex-col bg-white overflow-hidden max-h-[90vh]">
                                    <div className="p-5 border-b border-gray-100 flex justify-between items-center shadow-[0_4px_15px_-10px_rgba(0,0,0,0.1)] z-10">
                                        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                                            Conversation Timeline
                                        </h3>
                                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-gray-100 rounded-full" onClick={() => setIsDialogOpen(false)}>✕</Button>
                                    </div>

                                    {/* Timeline Area (chat-style) */}
                                    <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-gray-50/30">
                                        {/* Initial state implicitly shown inside the chat */}
                                        <div className="flex justify-center cursor-default">
                                            <div className="bg-gray-100 text-gray-500 text-[11px] px-3 py-1 rounded-full text-center uppercase tracking-wide font-medium">
                                                Complaint Opened - {selectedComplaint.createdAt}
                                            </div>
                                        </div>

                                        {selectedComplaint.history?.map((entry: any, index: number) => {
                                            const isBuyer = entry.actionBy === selectedComplaint.buyer?._id || entry.action === "CREATED";
                                            const isSystem = entry.actionBy === null || entry.action === "ESCALATED" || entry.action === "RESOLVED";
                                            
                                            // Handle System Actions
                                            if (isSystem) {
                                                return (
                                                    <div key={index} className="flex justify-center opacity-80 cursor-default">
                                                        <div className="bg-purple-100 text-purple-700 text-[11px] px-3 py-1 rounded-full text-center uppercase tracking-widest font-semibold">
                                                            ★ {entry.action?.replace(/_/g, " ")} - {entry.at}
                                                        </div>
                                                    </div>
                                                );
                                            }

                                            // Render as buyer (left) or seller (right)
                                            return (
                                                <div key={index} className={cn("flex w-full", isBuyer ? "justify-start" : "justify-end")}>
                                                    <div className={cn("max-w-[75%] rounded-2xl p-4 flex flex-col gap-1", isBuyer ? "bg-white border border-gray-200 shadow-sm rounded-tl-sm" : "bg-blue-600 text-white rounded-tr-sm shadow-md")}>
                                                        <div className={cn("text-xs font-semibold flex justify-between gap-4 border-b pb-2 mb-1", isBuyer ? "text-gray-900 border-gray-100" : "text-blue-50 border-blue-500/50")}>
                                                            <span>{isBuyer ? selectedComplaint.buyer?.username : "You"}</span>
                                                            <span className={cn("opacity-70 font-normal", isBuyer && "text-gray-500")}>{entry.at}</span>
                                                        </div>
                                                        <p className={cn("text-sm leading-relaxed", !isBuyer && "font-light")}>
                                                            {entry.note || (entry.action === "CREATED" ? "Opened the complaint with evidence." : entry.action)}
                                                        </p>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                        
                                        {(!selectedComplaint.history || selectedComplaint.history.length === 0) && (
                                            <div className="text-center text-gray-500 italic text-sm mt-10">
                                                No further conversation.
                                            </div>
                                        )}
                                    </div>

                                    {/* Action Area */}
                                    <div className="p-5 bg-white border-t border-gray-100 z-10 shadow-[0_-10px_15px_-10px_rgba(0,0,0,0.05)]">
                                        {selectedComplaint.status?.toUpperCase() === "OPEN" ? (
                                            <div className="flex flex-col space-y-3">
                                                <Textarea 
                                                    placeholder="Type your reply to the customer..."
                                                    value={replyNote}
                                                    onChange={(e) => setReplyNote(e.target.value)}
                                                    className="resize-none min-h-[100px] text-sm bg-gray-50 border-gray-200 focus:bg-white focus:ring-1 focus:border-blue-500 shadow-inner rounded-xl p-3"
                                                />
                                                <div className="flex justify-between items-center bg-transparent mt-1">
                                                    <div className="hidden sm:flex items-center text-[11px] text-amber-700 bg-amber-50 px-2 py-1 rounded flex-shrink-0">
                                                        <AlertCircle className="w-3.5 h-3.5 mr-1.5 opacity-80" /> Complaint stays open till admin reviews.
                                                    </div>
                                                    <div className="flex gap-2 w-full sm:w-auto ml-auto">
                                                        <Button variant="ghost" onClick={() => setIsDialogOpen(false)} className="text-gray-600 hover:text-gray-900 rounded-lg">Cancel</Button>
                                                        <Button onClick={handleReply} className="px-6 rounded-lg bg-blue-600 hover:bg-blue-700 shadow-primary/30 shadow-md">Send Reply</Button>
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-center justify-center p-3 py-4 bg-gray-50 rounded-xl text-center border border-dashed border-gray-200">
                                                <div className="text-sm text-gray-600 font-medium flex items-center gap-2">
                                                    Complaint is <Badge variant="secondary" className="px-2">{selectedComplaint.status}</Badge> and closed to replies.
                                                </div>
                                                {selectedComplaint.status?.toUpperCase() === "RESOLVED" && (
                                                    <span className="text-xs font-semibold text-green-600 mt-2 bg-green-50 px-2.5 py-1 rounded-full border border-green-200">
                                                        Decision has been finalized by Admin.
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })()}
                </DialogContent>
            </Dialog>
        </div>
    );
}
