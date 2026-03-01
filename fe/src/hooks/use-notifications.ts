import { useState, useEffect, useCallback, useRef } from "react";
import api from "@/lib/axios";
import { toast } from "sonner";

export interface AppNotification {
  _id: string;
  type: string;
  title: string;
  body: string;
  link: string;
  isRead: boolean;
  createdAt: string;
  metadata?: Record<string, unknown>;
}

export function useNotifications(
  socket?: { on: Function; off: Function } | undefined,
) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const fetchedRef = useRef(false);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/api/notifications", {
        params: { limit: 30 },
      });
      setNotifications(res.data.data);
      setUnreadCount(res.data.unreadCount);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!fetchedRef.current) {
      fetchedRef.current = true;
      fetchNotifications();
    }
  }, [fetchNotifications]);

  useEffect(() => {
    if (!socket) return;

    const TYPE_ICONS: Record<string, string> = {
      seller_application_approved: "\u2705",
      seller_application_rejected: "\u274C",
      new_message: "\uD83D\uDCAC",
      order_placed: "\uD83D\uDCE6",
      order_status_changed: "\uD83D\uDE9A",
      new_review: "\u2B50",
      user_banned: "\uD83D\uDD12",
      user_unbanned: "\uD83D\uDD13",
      product_warning: "\u26A0\uFE0F",
      admin_broadcast: "\uD83D\uDCE2",
      cart_item_out_of_stock: "\uD83D\uDEAB",
      cart_item_price_changed: "\uD83D\uDCB2",
    };

    const handleNotification = (notif: AppNotification) => {
      const normalizedNotif =
        notif.type === "cart_item_out_of_stock"
          ? {
              ...notif,
              title: "A cart item is out of stock",
              body: "A product in your cart is out of stock",
              link: "/cart",
            }
          : notif.type === "cart_item_price_changed"
            ? {
                ...notif,
                link: "/cart",
              }
          : notif;

      setNotifications((prev) => [normalizedNotif, ...prev]);
      setUnreadCount((prev) => prev + 1);

      const icon = TYPE_ICONS[normalizedNotif.type] || "\uD83D\uDD14";

      if (normalizedNotif.type === "admin_broadcast") {
        toast(normalizedNotif.title, {
          description: normalizedNotif.body,
          icon,
          duration: 8000,
          style: {
            borderLeft: "4px solid hsl(var(--primary))",
          },
        });
      } else {
        toast(normalizedNotif.title, {
          description: normalizedNotif.body,
          icon,
          duration: 5000,
        });
      }
    };

    socket.on("notification", handleNotification);
    return () => {
      socket.off("notification", handleNotification);
    };
  }, [socket]);

  const markAsRead = useCallback(async (id: string) => {
    try {
      await api.patch(`/api/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, isRead: true } : n)),
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch {
      // silent
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    try {
      await api.patch("/api/notifications/read-all");
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch {
      // silent
    }
  }, []);

  const deleteNotification = useCallback(async (id: string) => {
    try {
      await api.delete(`/api/notifications/${id}`);
      setNotifications((prev) => {
        const notif = prev.find((n) => n._id === id);
        if (notif && !notif.isRead) setUnreadCount((c) => Math.max(0, c - 1));
        return prev.filter((n) => n._id !== id);
      });
    } catch {
      // silent
    }
  }, []);

  return {
    notifications,
    unreadCount,
    loading,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  };
}
