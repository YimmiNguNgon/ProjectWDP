import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/axios';

interface SellerReplyDialogProps {
    review: any;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
}

export default function SellerReplyDialog({ review, open, onOpenChange, onSuccess }: SellerReplyDialogProps) {
    const [response, setResponse] = useState(review?.sellerResponse || '');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async () => {
        if (!response.trim()) {
            toast.error('Please enter a response');
            return;
        }

        if (response.length > 500) {
            toast.error('Response must be 500 characters or less');
            return;
        }

        try {
            setLoading(true);
            const res = await api.post(`/api/v1/reviews/${review._id}/seller-response`, {
                response: response.trim()
            });

            if (res.data.warning) {
                toast.warning(res.data.warning);
            } else {
                toast.success(res.data.message);
            }

            onSuccess();
            onOpenChange(false);
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Failed to post response');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!confirm('Are you sure you want to delete your response?')) {
            return;
        }

        try {
            setLoading(true);
            await api.delete(`/api/v1/reviews/${review._id}/seller-response`);
            toast.success('Response deleted successfully');
            onSuccess();
            onOpenChange(false);
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Failed to delete response');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>
                        {review?.sellerResponse ? 'Edit Your Response' : 'Reply to Feedback'}
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                    {/* Original Feedback */}
                    <div className="bg-gray-50 p-4 rounded-lg">
                        <p className="text-sm font-semibold mb-2">Buyer's Feedback:</p>
                        <div className="flex items-center gap-2 mb-2">
                            <span className="text-2xl">{'⭐'.repeat(review?.rating || 0)}</span>
                            <span className="text-sm text-muted-foreground">
                                ({review?.rating}/5)
                            </span>
                        </div>
                        <p className="text-sm">{review?.comment || 'No comment'}</p>
                        <p className="text-xs text-muted-foreground mt-2">
                            By: {review?.reviewer?.username} • {new Date(review?.createdAt).toLocaleDateString()}
                        </p>
                    </div>

                    {/* Response Form */}
                    <div>
                        <label className="text-sm font-medium mb-2 block">
                            Your Response
                        </label>
                        <Textarea
                            placeholder="Write a professional response to explain the situation..."
                            value={response}
                            onChange={(e) => setResponse(e.target.value)}
                            rows={6}
                            maxLength={500}
                            className="resize-none"
                        />
                        <p className="text-sm text-muted-foreground mt-1 text-right">
                            {response.length}/500 characters
                        </p>
                    </div>

                    {/* Guidelines */}
                    <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                            <strong>Guidelines for Professional Responses:</strong>
                            <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
                                <li>Be professional and courteous</li>
                                <li>Explain the situation factually</li>
                                <li>Avoid personal attacks or offensive language</li>
                                <li>Don't share contact information (phone, email)</li>
                                <li>Focus on resolving the issue</li>
                            </ul>
                        </AlertDescription>
                    </Alert>

                    {/* Example */}
                    <Alert className="bg-green-50 border-green-200">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <AlertDescription>
                            <strong className="text-green-900">Good Example:</strong>
                            <p className="text-sm text-green-800 mt-1">
                                "We sincerely apologize for the delay. The item was shipped on time but was held up in customs. We've issued a full refund and improved our shipping process. Thank you for your patience."
                            </p>
                        </AlertDescription>
                    </Alert>

                    {/* Actions */}
                    <div className="flex justify-between gap-2">
                        <div>
                            {review?.sellerResponse && (
                                <Button
                                    variant="destructive"
                                    onClick={handleDelete}
                                    disabled={loading}
                                >
                                    Delete Response
                                </Button>
                            )}
                        </div>
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                onClick={() => onOpenChange(false)}
                                disabled={loading}
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={handleSubmit}
                                disabled={loading || !response.trim()}
                            >
                                {loading ? 'Posting...' : review?.sellerResponse ? 'Update Response' : 'Post Response'}
                            </Button>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
