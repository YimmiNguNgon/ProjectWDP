import { useState, useEffect } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import api from "@/lib/axios";
import { getOrderDetails } from "@/api/orders";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { ArrowLeft, ImagePlus, X, AlertCircle } from "lucide-react";

const COMPLAINT_REASONS = [
    { value: "question", label: "I have a question about the item"},
    { value: "late", label: "Late delivery"},
    { value: "return", label: "Issues with return/refund"},
    { value: "fraud", label: "Fraud or scam suspicion"},
    { value: "cancel", label: "Cancellation dispute"},
];

export default function CreateComplaintPage() {
    const navigate = useNavigate();
    const { orderId, productId: routeProductId } = useParams();
    const [searchParams] = useSearchParams();
    const productId = routeProductId || searchParams.get("productId");

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [order, setOrder] = useState<any>(null);
    const [product, setProduct] = useState<any>(null);

    // Form state
    const [reason, setReason] = useState(searchParams.get("reason") || "");
    const [content, setContent] = useState("");
    const [images, setImages] = useState<File[]>([]);
    const [imagePreviews, setImagePreviews] = useState<string[]>([]);

    useEffect(() => {
        if (orderId) fetchOrderDetails();
        if (productId) fetchProductDetails();
    }, [orderId, productId]);

    const fetchOrderDetails = async () => {
        try {
            setLoading(true);
            if (!orderId) return;
            const res = await getOrderDetails(orderId, { role: "buyer" });
            const orderData = Array.isArray(res.data) 
                ? res.data.find((o: any) => o._id === orderId) || res.data[0] 
                : res.data;
            setOrder(orderData);
        } catch (err: any) {
            toast.error("Failed to load order details");
            navigate("/my-ebay/activity/purchases");
        } finally {
            setLoading(false);
        }
    };

    const fetchProductDetails = async () => {
        try {
            const res = await api.get(`/api/products/${productId}`);
            setProduct(res.data.data || res.data);
        } catch (err) {
            console.error("Failed to fetch product", err);
        }
    };

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (images.length + files.length > 3) {
            toast.error("You can upload up to 3 images.");
            return;
        }
        const newImages = [...images, ...files];
        setImages(newImages);
        const newPreviews = files.map((file) => URL.createObjectURL(file));
        setImagePreviews([...imagePreviews, ...newPreviews]);
    };

    const removeImage = (index: number) => {
        const newImages = [...images];
        newImages.splice(index, 1);
        setImages(newImages);

        const newPreviews = [...imagePreviews];
        URL.revokeObjectURL(newPreviews[index]);
        newPreviews.splice(index, 1);
        setImagePreviews(newPreviews);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!reason) return toast.error("Please select a reason");
        if (content.length < 10) return toast.error("Please provide more detail (min 10 chars)");
        if (images.length === 0) return toast.error("Please upload at least one image as evidence");

        try {
            setSubmitting(true);
            
            // 1. Upload images
            const formData = new FormData();
            images.forEach((img) => formData.append("images", img));
            const uploadRes = await api.post("/api/upload/complaint-images", formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });
            const imageUrls = uploadRes.data.urls || [];

            // 2. Create complaint
            await api.post("/api/complaints", {
                orderId,
                sellerId: order.seller?._id,
                reason,
                content,
                attachments: imageUrls.map((url: string) => ({ url }))
            });

            toast.success("Complaint submitted successfully!");
            navigate("/my-ebay/complaints");
        } catch (err: any) {
            toast.error(err.response?.data?.message || "Failed to submit complaint");
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <div className="p-8 text-center">Loading...</div>;

    return (
        <div className="mx-auto max-w-2xl py-8 px-4">
            <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
                <ArrowLeft className="mr-2 h-4 w-4" /> Back
            </Button>

            <Card>
                <CardHeader>
                    <CardTitle className="text-2xl">Open a Complaint</CardTitle>
                    <div className="mt-2 flex items-center gap-4 p-4 bg-muted/30 rounded-lg">
                        {product?.image || product?.images?.[0] ? (
                            <img src={product.image || product.images[0]} className="h-16 w-16 object-cover rounded shadow-sm border bg-white" />
                        ) : (
                            <div className="h-16 w-16 bg-muted rounded flex items-center justify-center text-[10px] text-muted-foreground uppercase font-bold border">No Image</div>
                        )}
                        <div>
                            <p className="font-bold text-base leading-snug line-clamp-1">{product?.title || "Product Purchase"}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                                Order #{orderId?.slice(-8)} • Seller: <span className="text-blue-600 font-medium">{order?.seller?.username}</span>
                            </p>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-3">
                            <Label className="font-semibold">Reason for complaint</Label>
                            <RadioGroup value={reason} onValueChange={setReason}>
                                {COMPLAINT_REASONS.map((r) => (
                                    <div key={r.value} className="flex items-center space-x-2">
                                        <RadioGroupItem value={r.value} id={r.value} />
                                        <Label htmlFor={r.value} className="font-normal cursor-pointer">{r.label}</Label>
                                    </div>
                                ))}
                            </RadioGroup>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="content" className="font-semibold">Details</Label>
                            <Textarea 
                                id="content" 
                                placeholder="Describe the issue in detail..."
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                                rows={5}
                            />
                        </div>

                        <div className="space-y-4">
                            <Label className="font-semibold">Evidence (1-3 images)</Label>
                            <div className="flex flex-wrap gap-4 mt-2">
                                {imagePreviews.map((preview, idx) => (
                                    <div key={idx} className="relative w-24 h-24 border rounded bg-muted">
                                        <img src={preview} className="object-cover w-full h-full" />
                                        <button type="button" onClick={() => removeImage(idx)} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1"><X className="w-3 h-3" /></button>
                                    </div>
                                ))}
                                {images.length < 3 && (
                                    <label className="w-24 h-24 border-2 border-dashed rounded flex flex-col items-center justify-center cursor-pointer hover:bg-muted/50">
                                        <ImagePlus className="w-6 h-6 text-muted-foreground" />
                                        <span className="text-[10px] mt-1">Add Photo</span>
                                        <Input type="file" accept="image/*" multiple className="hidden" onChange={handleImageChange} />
                                    </label>
                                )}
                            </div>
                        </div>

                        <div className="bg-amber-50 p-4 rounded-lg flex gap-3 text-amber-800 text-sm border border-amber-200">
                            <AlertCircle className="h-5 w-5 shrink-0" />
                            <div>
                                <p className="font-semibold">Rules & Process:</p>
                                <ul className="list-disc list-inside mt-1 space-y-1">
                                    <li>Seller has 48 hours to respond.</li>
                                    <li>If not resolved, you can escalate to Admin.</li>
                                    <li>You can only open 3 complaints per month.</li>
                                </ul>
                            </div>
                        </div>

                        <Button type="submit" className="w-full" disabled={submitting}>
                            {submitting ? "Submitting..." : "Submit Complaint"}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
