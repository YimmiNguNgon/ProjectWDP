import { useNavigate } from "react-router-dom";
import { Bell, Check, Trash2, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { useNotifications, type AppNotification } from "@/hooks/use-notifications";
import { cn } from "@/lib/utils";

const TYPE_ICONS: Record<string, string> = {
    seller_application_approved: "\u2705",
    seller_application_rejected: "\u274C",
    new_message: "\uD83D\uDCAC",
    order_placed: "\uD83D\uDCE6",
    order_status_changed: "\uD83D\uDE9A",
    new_review: "\u2B50",
    user_banned: "\uD83D\uDD12",
    user_unbanned: "\uD83D\uDD13",
    product_created: "\uD83C\uDFF7\uFE0F",
    product_warning: "\u26A0\uFE0F",
    admin_broadcast: "\uD83D\uDCE2",
    cart_item_out_of_stock: "\uD83D\uDEAB",
    cart_item_price_changed: "\uD83D\uDCB2",
};

function timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return "Just now";
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    const d = Math.floor(h / 24);
    return `${d}d ago`;
}

function getNotificationDisplayContent(notif: AppNotification) {
    if (notif.type === "cart_item_out_of_stock") {
        return {
            title: "A cart item is out of stock",
            body: "A product in your cart is out of stock",
        };
    }
    return {
        title: notif.title,
        body: notif.body,
    };
}

interface NotificationBellProps {
    socket?: { on: Function; off: Function } | undefined;
}

export default function NotificationBell({ socket }: NotificationBellProps) {
    const navigate = useNavigate();
    const {
        notifications,
        unreadCount,
        loading,
        markAsRead,
        markAllAsRead,
        deleteNotification,
    } = useNotifications(socket);

    const handleClick = (notif: AppNotification) => {
        if (!notif.isRead) markAsRead(notif._id);
        if (
            notif.type === "cart_item_out_of_stock" ||
            notif.type === "cart_item_price_changed"
        ) {
            navigate("/cart");
            return;
        }
        if (notif.link) navigate(notif.link);
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <button
                    id="notification-bell-btn"
                    className="relative hover:opacity-70 cursor-pointer"
                    aria-label="Notifications"
                >
                    <Bell className="size-4" />
                    {unreadCount > 0 && (
                        <span className="absolute -top-1.5 -right-1.5 h-4 min-w-4 px-0.5 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center leading-none">
                            {unreadCount > 99 ? "99+" : unreadCount}
                        </span>
                    )}
                </button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-80 p-0 max-h-[480px] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm">Notifications</span>
                        {unreadCount > 0 && (
                            <Badge variant="secondary" className="text-xs h-5 px-1.5">
                                {unreadCount} new
                            </Badge>
                        )}
                    </div>
                    {unreadCount > 0 && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs cursor-pointer gap-1"
                            onClick={markAllAsRead}
                        >
                            <CheckCheck className="h-3 w-3" />
                            Mark all as read
                        </Button>
                    )}
                </div>

                <Separator />

                {/* List */}
                <div className="overflow-y-auto flex-1">
                    {loading && notifications.length === 0 ? (
                        <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                            Loading...
                        </div>
                    ) : notifications.length === 0 ? (
                        <div className="px-4 py-8 text-center">
                            <Bell className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
                            <p className="text-sm text-muted-foreground">No notifications yet</p>
                        </div>
                    ) : (
                        notifications.map((notif) => {
                            const isBroadcast = notif.type === "admin_broadcast";
                            const display = getNotificationDisplayContent(notif);
                            return (
                                <div
                                    key={notif._id}
                                    className={cn(
                                        "flex items-start gap-3 px-4 py-3 cursor-pointer group transition-colors border-l-2",
                                        isBroadcast
                                            ? notif.isRead
                                                ? "border-l-primary/40 bg-primary/3 hover:bg-primary/8"
                                                : "border-l-primary bg-primary/10 hover:bg-primary/15"
                                            : notif.isRead
                                                ? "border-l-transparent hover:bg-muted/50"
                                                : "border-l-transparent bg-primary/5 hover:bg-primary/10"
                                    )}
                                    onClick={() => handleClick(notif)}
                                >
                                    {/* Icon */}
                                    <div className="text-lg flex-shrink-0 mt-0.5">
                                        {TYPE_ICONS[notif.type] || "\uD83D\uDD14"}
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                                            <p
                                                className={cn(
                                                    "text-sm leading-snug",
                                                    notif.isRead ? "font-normal text-foreground" : "font-semibold text-foreground"
                                                )}
                                            >
                                                {display.title}
                                            </p>
                                            {isBroadcast && (
                                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-primary text-primary-foreground leading-none flex-shrink-0">
                                                    ADMIN
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                                            {display.body}
                                        </p>
                                        <p className="text-[11px] text-muted-foreground/70 mt-1">
                                            {timeAgo(notif.createdAt)}
                                        </p>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                                        {!notif.isRead && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    markAsRead(notif._id);
                                                }}
                                                className="p-1 rounded hover:bg-muted cursor-pointer"
                                                title="Mark as read"
                                            >
                                                <Check className="h-3 w-3 text-muted-foreground" />
                                            </button>
                                        )}
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                deleteNotification(notif._id);
                                            }}
                                            className="p-1 rounded hover:bg-muted cursor-pointer"
                                            title="Delete"
                                        >
                                            <Trash2 className="h-3 w-3 text-muted-foreground" />
                                        </button>
                                    </div>

                                    {/* Unread dot */}
                                    {!notif.isRead && (
                                        <div className={cn(
                                            "w-2 h-2 rounded-full flex-shrink-0 mt-1.5",
                                            isBroadcast ? "bg-primary" : "bg-primary"
                                        )} />
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
