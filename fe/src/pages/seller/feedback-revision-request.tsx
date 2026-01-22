import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertCircle, CheckCircle, ArrowLeft, Send } from 'lucide-react';
import { toast } from 'sonner';
import { createRevisionRequest, validateMessage } from '@/api/feedbackRevision';
import api from '@/lib/axios';

export default function FeedbackRevisionRequestPage() {
    const { reviewId } = useParams();
    const navigate = useNavigate();

    const [review, setReview] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    // Form state
    const [reason, setReason] = useState('refund');
    const [message, setMessage] = useState('');
    const [resolutionType, setResolutionType] = useState('');
    const [resolutionProof, setResolutionProof] = useState('');

    // Validation state
    const [messageValidation, setMessageValidation] = useState<any>(null);
    const [validating, setValidating] = useState(false);

    // Load review
    useEffect(() => {
        const loadReview = async () => {
            try {
                const res = await api.get(`/api/reviews/${reviewId}`);
                setReview(res.data.data);
            } catch (err: any) {
                console.error(err);
                toast.error(err.response?.data?.message || 'Failed to load review');
                navigate('/seller/feedback');
            } finally {
                setLoading(false);
            }
        };

        if (reviewId) {
            loadReview();
        }
    }, [reviewId, navigate]);

    // Validate message on change
    useEffect(() => {
        const timer = setTimeout(async () => {
            if (message.trim().length > 0) {
                setValidating(true);
                try {
                    const res = await validateMessage(message);
                    setMessageValidation(res.data.data);
                } catch (err) {
                    console.error(err);
                } finally {
                    setValidating(false);
                }
            } else {
                setMessageValidation(null);
            }
        }, 500);

        return () => clearTimeout(timer);
    }, [message]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!message.trim()) {
            toast.error('Please enter a message');
            return;
        }

        if (messageValidation && !messageValidation.isValid) {
            toast.error('Your message contains prohibited content. Please revise it.');
            return;
        }

        setSubmitting(true);

        try {
            const res = await createRevisionRequest({
                reviewId: reviewId!,
                reason,
                message,
                resolutionType,
                resolutionProof
            });

            if (res.data.warning) {
                toast.warning(res.data.warning);
            } else {
                toast.success('Revision request sent successfully');
            }

            navigate('/seller/feedback-requests');
        } catch (err: any) {
            console.error(err);
            toast.error(err.response?.data?.message || 'Failed to send request');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="p-6 max-w-4xl mx-auto">
                <p className="text-center text-muted-foreground">Loading...</p>
            </div>
        );
    }

    if (!review) {
        return null;
    }

    return (
        <div className="p-6 max-w-4xl mx-auto">
            <Button
                variant="ghost"
                onClick={() => navigate('/seller/feedback')}
                className="mb-4"
            >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Feedback
            </Button>

            <Card>
                <CardHeader>
                    <CardTitle>Request Feedback Revision</CardTitle>
                    <CardDescription>
                        Ask the buyer to revise their feedback after resolving the issue
                    </CardDescription>
                </CardHeader>

                <CardContent>
                    {/* Review Info */}
                    <div className="mb-6 p-4 bg-muted rounded-lg">
                        <h3 className="font-semibold mb-2">Current Feedback</h3>
                        <div className="flex items-center gap-2 mb-2">
                            <span className="text-2xl">{'⭐'.repeat(review.rating)}</span>
                            <span className="text-muted-foreground">({review.rating}/5)</span>
                        </div>
                        <p className="text-sm text-muted-foreground">{review.comment}</p>
                        <p className="text-xs text-muted-foreground mt-2">
                            By: {review.reviewer?.username} • {new Date(review.createdAt).toLocaleDateString()}
                        </p>
                    </div>

                    {/* Important Notice */}
                    <Alert className="mb-6">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                            <strong>Important:</strong> You can only request revision once per review.
                            Make sure you have resolved the issue before sending this request.
                        </AlertDescription>
                    </Alert>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Reason */}
                        <div>
                            <Label htmlFor="reason">Reason for Revision *</Label>
                            <Select value={reason} onValueChange={setReason}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="refund">Full Refund Issued</SelectItem>
                                    <SelectItem value="replacement">Replacement Sent</SelectItem>
                                    <SelectItem value="resolved">Issue Resolved</SelectItem>
                                    <SelectItem value="misunderstanding">Misunderstanding</SelectItem>
                                    <SelectItem value="other">Other</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Resolution Type */}
                        <div>
                            <Label htmlFor="resolutionType">Resolution Type</Label>
                            <Select value={resolutionType} onValueChange={setResolutionType}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select resolution type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="full_refund">Full Refund</SelectItem>
                                    <SelectItem value="partial_refund">Partial Refund</SelectItem>
                                    <SelectItem value="replacement_sent">Replacement Sent</SelectItem>
                                    <SelectItem value="issue_resolved">Issue Resolved</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Resolution Proof */}
                        <div>
                            <Label htmlFor="resolutionProof">Resolution Proof</Label>
                            <Input
                                id="resolutionProof"
                                placeholder="e.g., Refunded $100 on Dec 15"
                                value={resolutionProof}
                                onChange={(e) => setResolutionProof(e.target.value)}
                            />
                        </div>

                        {/* Message */}
                        <div>
                            <Label htmlFor="message">Message to Buyer *</Label>
                            <Textarea
                                id="message"
                                placeholder="Explain how you resolved the issue and politely ask for revision..."
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                rows={6}
                                className="resize-none"
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                                {message.length}/1000 characters
                            </p>
                        </div>

                        {/* Validation Warning */}
                        {validating && (
                            <Alert>
                                <AlertCircle className="h-4 w-4" />
                                <AlertDescription>Checking message...</AlertDescription>
                            </Alert>
                        )}

                        {messageValidation && !messageValidation.isValid && (
                            <Alert variant="destructive">
                                <AlertCircle className="h-4 w-4" />
                                <AlertDescription>
                                    <strong>Warning:</strong> Your message may violate eBay's feedback policy.
                                    <br />
                                    <span className="text-sm">
                                        Detected: {messageValidation.violations.join(', ')}
                                    </span>
                                    <br />
                                    <span className="text-xs">
                                        Keywords: {messageValidation.detectedKeywords.join(', ')}
                                    </span>
                                </AlertDescription>
                            </Alert>
                        )}

                        {messageValidation && messageValidation.isValid && (
                            <Alert className="border-green-500 bg-green-50">
                                <CheckCircle className="h-4 w-4 text-green-600" />
                                <AlertDescription className="text-green-800">
                                    Message looks good! No policy violations detected.
                                </AlertDescription>
                            </Alert>
                        )}

                        {/* Guidelines */}
                        <Alert>
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>
                                <strong>Guidelines:</strong>
                                <ul className="list-disc list-inside text-sm mt-2 space-y-1">
                                    <li>Be polite and professional</li>
                                    <li>Explain how you resolved the issue</li>
                                    <li>Do NOT threaten or pressure the buyer</li>
                                    <li>Do NOT make revision conditional on refund/replacement</li>
                                    <li>The buyer is NOT required to revise</li>
                                </ul>
                            </AlertDescription>
                        </Alert>

                        {/* Submit */}
                        <div className="flex gap-3">
                            <Button
                                type="submit"
                                disabled={submitting || (messageValidation && !messageValidation.isValid)}
                                className="flex-1"
                            >
                                {submitting ? (
                                    'Sending...'
                                ) : (
                                    <>
                                        <Send className="w-4 h-4 mr-2" />
                                        Send Request
                                    </>
                                )}
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => navigate('/seller/feedback')}
                            >
                                Cancel
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
