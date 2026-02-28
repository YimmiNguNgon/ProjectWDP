import { useState } from "react";
import { Send, Megaphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import api from "@/lib/axios";

export default function AdminBroadcast() {
    const [open, setOpen] = useState(false);
    const [title, setTitle] = useState("");
    const [body, setBody] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSend = async () => {
        if (!title.trim() || !body.trim()) {
            toast.error("Please enter both title and content");
            return;
        }
        setLoading(true);
        try {
            const res = await api.post("/api/admin/notifications/broadcast", {
                title: title.trim(),
                body: body.trim(),
            });
            toast.success(`Notification sent to ${res.data.sentTo} users`);
            setTitle("");
            setBody("");
            setOpen(false);
        } catch (err: any) {
            toast.error(err.response?.data?.message || "Failed to send broadcast");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button
                    id="admin-broadcast-btn"
                    variant="outline"
                    size="sm"
                    className="gap-2 cursor-pointer"
                >
                    <Megaphone className="h-4 w-4" />
                    Send Broadcast
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Megaphone className="h-5 w-5" />
                        Send notification to all users
                    </DialogTitle>
                </DialogHeader>
                <div className="flex flex-col gap-4 py-2">
                    <div className="flex flex-col gap-1.5">
                        <Label htmlFor="broadcast-title">
                            Title <span className="text-destructive">*</span>
                        </Label>
                        <Input
                            id="broadcast-title"
                            placeholder="Example: Scheduled system maintenance"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            maxLength={100}
                        />
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <Label htmlFor="broadcast-body">
                            Content <span className="text-destructive">*</span>
                        </Label>
                        <Textarea
                            id="broadcast-body"
                            placeholder="Write the notification message for users..."
                            value={body}
                            onChange={(e) => setBody(e.target.value)}
                            rows={4}
                            maxLength={500}
                        />
                        <p className="text-xs text-muted-foreground text-right">
                            {body.length}/500
                        </p>
                    </div>
                </div>
                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={() => setOpen(false)}
                        className="cursor-pointer"
                    >
                        Cancel
                    </Button>
                    <Button
                        id="broadcast-send-btn"
                        onClick={handleSend}
                        disabled={loading}
                        className="gap-2 cursor-pointer"
                    >
                        <Send className="h-4 w-4" />
                        {loading ? "Sending..." : "Send now"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
