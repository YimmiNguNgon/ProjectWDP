import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import type { Order } from "@/api/orders";

interface OrderDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: Order | null;
}

export function OrderDetailsDialog({ open, onOpenChange, order }: OrderDetailsDialogProps) {
  if (!order) return null;

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Asia/Ho_Chi_Minh",
    });

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "delivered":
        return "text-green-600 bg-green-50";
      case "shipped":
        return "text-blue-600 bg-blue-50";
      case "paid":
        return "text-purple-600 bg-purple-50";
      case "cancelled":
        return "text-red-600 bg-red-50";
      default:
        return "text-gray-600 bg-gray-50";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Order Details</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Order Number</p>
              <p className="font-mono font-semibold">{order._id}</p>
            </div>
            <div className={`px-4 py-2 rounded-full font-semibold ${getStatusColor(order.status)}`}>
              {order.status.toUpperCase()}
            </div>
          </div>

          <Separator />

          <div className="grid grid-cols-2 gap-6">
            <div>
              <p className="text-sm font-semibold text-muted-foreground mb-2">ORDER DATE</p>
              <p>{formatDate(order.createdAt)}</p>
            </div>
            <div>
              <p className="text-sm font-semibold text-muted-foreground mb-2">ORDER TOTAL</p>
              <p className="text-2xl font-bold">${order.totalAmount.toFixed(2)}</p>
            </div>
          </div>

          <Separator />

          <div className="grid grid-cols-2 gap-6">
            <div>
              <p className="text-sm font-semibold text-muted-foreground mb-2">BUYER</p>
              <p className="font-medium">{order.buyer.username}</p>
              <p className="text-xs text-muted-foreground">ID: {order.buyer._id}</p>
            </div>
            <div>
              <p className="text-sm font-semibold text-muted-foreground mb-2">SELLER</p>
              <p className="font-medium">{order.seller.username}</p>
              <p className="text-xs text-muted-foreground">ID: {order.seller._id}</p>
            </div>
          </div>

          <Separator />

          <div>
            <p className="text-sm font-semibold text-muted-foreground mb-4">ORDER ITEMS</p>
            <div className="space-y-4">
              {order.items.map((item, index) => (
                <div key={index} className="flex gap-4 p-4 bg-muted/50 rounded-lg">
                  <div className="h-20 w-20 bg-muted rounded flex items-center justify-center flex-shrink-0">
                    {item.productId?.image || item.productId?.images?.[0] ? (
                      <img
                        src={item.productId.image || item.productId.images?.[0]}
                        alt={item.title}
                        className="h-full w-full object-cover rounded"
                      />
                    ) : (
                      <span className="text-xs text-muted-foreground">No image</span>
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{item.productId?.title || item.title}</p>
                    <p className="text-sm text-muted-foreground mt-1">Quantity: {item.quantity}</p>
                    <p className="text-sm font-semibold mt-2">
                      ${item.unitPrice.toFixed(2)} x {item.quantity} = ${
                        (item.unitPrice * item.quantity).toFixed(2)
                      }
                    </p>
                    {item.selectedVariants && item.selectedVariants.length > 0 && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Variant: {item.selectedVariants.map((v) => `${v.name}: ${v.value}`).join(", ")}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Subtotal</span>
              <span>${(order.subtotalAmount ?? order.totalAmount).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Voucher Discount</span>
              <span className="text-green-600">
                -${(order.discountAmount ?? order.voucher?.discountAmount ?? 0).toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Shipping</span>
              <span className="text-green-600">FREE</span>
            </div>
            <Separator />
            <div className="flex justify-between text-lg font-bold">
              <span>Total</span>
              <span>${order.totalAmount.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
