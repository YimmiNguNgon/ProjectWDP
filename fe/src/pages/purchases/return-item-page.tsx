import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "@/lib/axios";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ArrowLeft, AlertCircle } from "lucide-react";

const RETURN_REASONS = [
    "ITEM_NOT_RECEIVED",
    "ITEM_DAMAGED",
    "WRONG_ITEM",
    "NOT_AS_DESCRIBED",
    "CHANGE_OF_MIND",
    "OTHER",
];

const REASON_LABELS: Record<string, string> = {
    ITEM_NOT_RECEIVED: "Item not received",
    ITEM_DAMAGED: "Arrived damaged or defective",
    WRONG_ITEM: "Wrong item sent",
    NOT_AS_DESCRIBED: "Item not as described",
    CHANGE_OF_MIND: "Changed my mind / Ordered by mistake",
    OTHER: "Other",
};

export default function ReturnItemPage() {
    const navigate = useNavigate();
    const { orderId } = useParams();

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    // Request form state
    const [reason, setReason] = useState("");
    const [description, setDescription] = useState("");

    // Existing refund request state
    const [existingRefund, setExistingRefund] = useState<any>(null);

    useEffect(() => {
        fetchRefundDetails();
    }, [orderId]);

    const fetchRefundDetails = async () => {
        try {
            setLoading(true);
            const res = await api.get(`/api/refund/order/${orderId}`);
            if (res.data?.data) {
                setExistingRefund(res.data.data);
            }
        } catch (err: any) {
            console.error("Failed to load refund details:", err);
            // It might just not exist, which is fine (404/Empty data).
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!reason) {
            toast.error("Please select a reason for return");
            return;
        }

        try {
            setSubmitting(true);
            await api.post("/api/refund/request", {
                orderId,
                reason,
                description,
            });
            toast.success("Return request submitted successfully!");
            fetchRefundDetails(); // Refresh to show details view
        } catch (err: any) {
            console.error("Failed to submit return:", err);
            toast.error(err.response?.data?.message || "Failed to submit return request");
        } finally {
            setSubmitting(false);
        }
    };

    const handleDispute = async () => {
        try {
            setSubmitting(true);
            await api.post(`/api/refund/${existingRefund._id}/dispute`);
            toast.success("Dispute submitted to Admin for review.");
            fetchRefundDetails();
        } catch (err: any) {
            toast.error(err.response?.data?.message || "Failed to open dispute");
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return <div className="p-8 text-center text-muted-foreground">Loading details...</div>;
    }

    return (
        <div className="mx-auto max-w-3xl py-8 px-4">
            <Button
                variant="ghost"
                onClick={() => navigate("/my-ebay/activity/purchases")}
                className="mb-4"
            >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to purchases
            </Button>

            {!existingRefund ? (
                // --- CREATE REFUND FORM ---
                <Card>
                    <CardHeader>
                        <CardTitle className="text-2xl">Return this order</CardTitle>
                        <p className="text-sm text-muted-foreground">
                            Tell us why you're returning these items
                        </p>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="space-y-3">
                                <Label className="text-base font-semibold">
                                    Why are you returning this?
                                </Label>
                                <RadioGroup value={reason} onValueChange={setReason}>
                                    {RETURN_REASONS.map((r) => (
                                        <div key={r} className="flex items-center space-x-2">
                                            <RadioGroupItem value={r} id={r} />
                                            <Label htmlFor={r} className="font-normal cursor-pointer">
                                                {REASON_LABELS[r]}
                                            </Label>
                                        </div>
                                    ))}
                                </RadioGroup>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="description" className="text-base font-semibold">
                                    Additional details
                                </Label>
                                <Textarea
                                    id="description"
                                    placeholder="Tell us more about why you're returning this order..."
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    rows={4}
                                    className="resize-none"
                                    required
                                />
                            </div>

                            <div className="rounded-lg bg-blue-50 p-4 text-sm">
                                <h4 className="font-semibold mb-2">What happens next?</h4>
                                <ul className="space-y-1 text-muted-foreground">
                                    <li>• The seller will be notified of your request</li>
                                    <li>• They have 48 hours to approve or reject your return</li>
                                    <li>• If they do not respond within 48h, it is auto-approved</li>
                                    <li>• If rejected, you can open a Dispute and Admin will step in</li>
                                </ul>
                            </div>

                            <div className="flex gap-3">
                                <Button
                                    type="submit"
                                    className="flex-1"
                                    disabled={submitting || !reason}
                                >
                                    {submitting ? "Submitting..." : "Submit return request"}
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => navigate(-1)}
                                    disabled={submitting}
                                >
                                    Cancel
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            ) : (
                // --- EXISTING REFUND DETAILS ---
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-2xl">Return Details</CardTitle>
                            <Badge
                                variant={
                                    existingRefund.status === "APPROVED" || existingRefund.status === "AUTO_APPROVED" || existingRefund.status === "ADMIN_APPROVED" ? "default" :
                                        existingRefund.status === "REJECTED" || existingRefund.status === "ADMIN_REJECTED" ? "destructive" :
                                            "secondary"
                                }
                                className="text-sm px-3 py-1 uppercase"
                            >
                                {existingRefund.status.replace("_", " ")}
                            </Badge>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="grid gap-4 md:grid-cols-2">
                            <div>
                                <h4 className="font-medium text-sm text-muted-foreground">Reason</h4>
                                <p className="mt-1 font-semibold">{REASON_LABELS[existingRefund.reason] || existingRefund.reason}</p>
                            </div>
                            <div>
                                <h4 className="font-medium text-sm text-muted-foreground">Requested At</h4>
                                <p className="mt-1">{new Date(existingRefund.requestedAt).toLocaleString()}</p>
                            </div>
                        </div>

                        <div>
                            <h4 className="font-medium text-sm text-muted-foreground">Buyer Description</h4>
                            <p className="mt-1 bg-muted p-3 rounded-md text-sm">
                                {existingRefund.description || "No description provided."}
                            </p>
                        </div>

                        {existingRefund.sellerNote && (
                            <div>
                                <h4 className="font-medium text-sm text-muted-foreground">Seller Response</h4>
                                <p className="mt-1 bg-amber-50 dark:bg-amber-900/20 p-3 rounded-md text-sm border border-amber-200">
                                    {existingRefund.sellerNote}
                                </p>
                            </div>
                        )}

                        {existingRefund.adminNote && (
                            <div>
                                <h4 className="font-medium text-sm text-muted-foreground pb-2 flex items-center gap-2">
                                    <AlertCircle className="w-4 h-4 text-primary" /> Admin Final Verdict
                                </h4>
                                <p className="bg-primary/10 p-3 rounded-md text-sm border border-primary/20">
                                    {existingRefund.adminNote}
                                </p>
                            </div>
                        )}

                    </CardContent>

                    {/* Buyer actions for existing refund */}
                    <CardFooter className="bg-muted/30 pt-4 flex gap-3 flex-wrap">
                        {existingRefund.status === "REJECTED" && (
                            <div className="w-full">
                                <div className="mb-4 text-sm text-destructive font-medium flex items-center gap-2">
                                    <AlertCircle className="w-4 h-4" />
                                    The seller rejected your return request. If you believe this is unfair, you can open a dispute.
                                </div>
                                <Button
                                    onClick={handleDispute}
                                    disabled={submitting}
                                    variant="destructive"
                                >
                                    {submitting ? "Processing..." : "Open Dispute (Involve Admin)"}
                                </Button>
                            </div>
                        )}

                        {(existingRefund.status === "APPROVED" || existingRefund.status === "AUTO_APPROVED" || existingRefund.status === "ADMIN_APPROVED") && (
                            <div className="w-full text-sm text-green-700 font-medium">
                                ✓ This return has been approved. The seller will complete your refund shortly.
                            </div>
                        )}
                    </CardFooter>
                </Card>
            )}
        </div>
    );
}
