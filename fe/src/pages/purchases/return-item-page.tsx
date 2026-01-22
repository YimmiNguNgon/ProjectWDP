import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { ArrowLeft } from 'lucide-react';

const RETURN_REASONS = [
    "Doesn't fit",
    "Changed my mind",
    "Found a better price",
    "Ordered by mistake",
    "Item not as described",
    "Item defective or doesn't work",
    "Missing parts or accessories",
    "Arrived damaged",
    "Wrong item sent",
    "Other",
];

export default function ReturnItemPage() {
    const navigate = useNavigate();
    const [reason, setReason] = useState('');
    const [details, setDetails] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!reason) {
            toast.error('Please select a reason for return');
            return;
        }

        setLoading(true);

        // Simulate API call
        setTimeout(() => {
            toast.success('Return request submitted successfully!');
            setLoading(false);
            navigate('/my-ebay/activity/purchases');
        }, 1000);
    };

    return (
        <div className="mx-auto max-w-3xl py-8">
            <Button
                variant="ghost"
                onClick={() => navigate(-1)}
                className="mb-4"
            >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to purchases
            </Button>

            <Card>
                <CardHeader>
                    <CardTitle className="text-2xl">Return this item</CardTitle>
                    <p className="text-sm text-muted-foreground">
                        Tell us why you're returning this item
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
                                            {r}
                                        </Label>
                                    </div>
                                ))}
                            </RadioGroup>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="details" className="text-base font-semibold">
                                Additional details (optional)
                            </Label>
                            <Textarea
                                id="details"
                                placeholder="Tell us more about why you're returning this item..."
                                value={details}
                                onChange={(e) => setDetails(e.target.value)}
                                rows={4}
                                className="resize-none"
                            />
                            <p className="text-xs text-muted-foreground">
                                This information helps us improve our service
                            </p>
                        </div>

                        <div className="rounded-lg bg-blue-50 p-4 text-sm">
                            <h4 className="font-semibold mb-2">What happens next?</h4>
                            <ul className="space-y-1 text-muted-foreground">
                                <li>• We'll review your return request</li>
                                <li>• The seller will be notified</li>
                                <li>• You'll receive a return shipping label via email</li>
                                <li>• Once the seller receives the item, you'll get a refund</li>
                            </ul>
                        </div>

                        <div className="flex gap-3">
                            <Button
                                type="submit"
                                className="flex-1"
                                disabled={loading || !reason}
                            >
                                {loading ? 'Submitting...' : 'Submit return request'}
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => navigate(-1)}
                                disabled={loading}
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
