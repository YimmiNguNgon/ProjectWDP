import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/lib/axios";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Messages } from "@/components/chat/messages";
import { MessageContext, type Conversation, type Message } from "@/hooks/use-message";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { DollarSign, Truck, Package, ThumbsUp } from "lucide-react";
import { OrderDetailsDialog } from "@/components/orders/order-details-dialog";
import {
  getOrderDetails,
  saveSeller as saveSellerApi,
  unsaveSeller as unsaveSellerApi,
  getSavedSellers,
  hideOrder as hideOrderApi
} from "@/api/orders";

type OrderItem = {
  productId: {
    _id: string;
    title: string;
    price: number;
    imageUrl?: string;
  };
  title: string;
  price: number;
  quantity: number;
};

type Order = {
  _id: string;
  buyer: { _id: string; username: string };
  seller: { _id: string; username: string };
  items: OrderItem[];
  totalAmount: number;
  status: string;
  createdAt: string;
};

type PurchaseRow = {
  orderId: string;
  orderDate: string;
  totalAmount: number;
  sellerId: string;
  sellerName: string;
  productId: string;
  productTitle: string;
  productPrice: number;
  quantity: number;
  status: string;
};

export default function PurchaseHistoryPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showOrderDetails, setShowOrderDetails] = useState(false);
  const [savedSellers, setSavedSellers] = useState<Set<string>>(new Set());
  const [processingActions, setProcessingActions] = useState<Set<string>>(new Set());

  // Chat dialog states
  const [chatOpen, setChatOpen] = useState(false);
  const { payload } = useAuth();

  // Message context states
  const [participants, setParticipantsState] = useState<string[]>([]);
  const [conversation, setConversation] = useState<Conversation | undefined>();
  const [messages, setMessages] = useState<Message[] | undefined>();
  const [productRef, setProductRef] = useState<string | undefined>();
  const [productContext, setProductContext] = useState<any>();

  const navigate = useNavigate();

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setLoading(true);
        // Only fetch orders where user is the buyer
        const res = await api.get("/api/orders?role=buyer");
        const data: Order[] = res.data?.data || [];
        setOrders(data);
      } catch (err) {
        console.error("Failed to load orders", err);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, []);

  // Fetch saved sellers
  useEffect(() => {
    const fetchSavedSellers = async () => {
      try {
        const res = await getSavedSellers();
        const sellerIds = new Set(res.data.map(seller => seller._id));
        setSavedSellers(sellerIds);
      } catch (err) {
        console.error("Failed to load saved sellers", err);
      }
    };

    fetchSavedSellers();
  }, []);

  // Handler: View order details
  const handleViewOrderDetails = async (orderId: string) => {
    try {
      const res = await getOrderDetails(orderId);
      setSelectedOrder(res.data);
      setShowOrderDetails(true);
    } catch (err) {
      console.error("Failed to load order details", err);
      toast.error("Failed to load order details");
    }
  };

  // Handler: Save/Unsave seller
  const handleToggleSaveSeller = async (sellerId: string, sellerName: string) => {
    const actionKey = `save-${sellerId}`;
    if (processingActions.has(actionKey)) return;

    try {
      setProcessingActions(prev => new Set(prev).add(actionKey));

      if (savedSellers.has(sellerId)) {
        await unsaveSellerApi(sellerId);
        setSavedSellers(prev => {
          const newSet = new Set(prev);
          newSet.delete(sellerId);
          return newSet;
        });
        toast.success(`Unsaved seller: ${sellerName}`);
      } else {
        await saveSellerApi(sellerId);
        setSavedSellers(prev => new Set(prev).add(sellerId));
        toast.success(`Saved seller: ${sellerName}`);
      }
    } catch (err: any) {
      console.error("Failed to save/unsave seller", err);
      toast.error(err.response?.data?.message || "Failed to update saved seller");
    } finally {
      setProcessingActions(prev => {
        const newSet = new Set(prev);
        newSet.delete(actionKey);
        return newSet;
      });
    }
  };

  // Handler: Hide order
  const handleHideOrder = async (orderId: string) => {
    const actionKey = `hide-${orderId}`;
    if (processingActions.has(actionKey)) return;

    try {
      setProcessingActions(prev => new Set(prev).add(actionKey));
      await hideOrderApi(orderId);

      // Remove order from UI
      setOrders(prev => prev.filter(order => order._id !== orderId));

      toast.success("Order hidden from list", {
        action: {
          label: "Undo",
          onClick: () => {
            // Refresh to restore
            window.location.reload();
          },
        },
      });
    } catch (err: any) {
      console.error("Failed to hide order", err);
      toast.error(err.response?.data?.message || "Failed to hide order");
    } finally {
      setProcessingActions(prev => {
        const newSet = new Set(prev);
        newSet.delete(actionKey);
        return newSet;
      });
    }
  };

  // Handler: Open chat with seller
  const handleContactSeller = (sellerId: string, productId: string) => {
    const sender = payload?.userId;
    if (!sender) {
      toast.error('Vui lòng đăng nhập để chat với seller');
      return;
    }

    // Find product from orders
    const product = orders
      .flatMap(o => o.items)
      .find(item => item.productId?._id === productId);

    setParticipantsState([sender, sellerId]);
    setProductRef(productId);
    setProductContext(product?.productId);
    setChatOpen(true);
  };

  const rows: PurchaseRow[] = useMemo(() => {
    const list: PurchaseRow[] = [];
    orders.forEach((order) => {
      order.items.forEach((item) => {
        list.push({
          orderId: order._id,
          orderDate: order.createdAt,
          totalAmount: order.totalAmount,
          sellerId: order.seller._id,
          sellerName: order.seller.username,
          productId: item.productId?._id || "",
          productTitle: item.productId?.title || item.title,
          productPrice: item.price,
          quantity: item.quantity,
          status: order.status,
        });
      });
    });

    return list.sort(
      (a, b) =>
        new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime()
    );
  }, [orders]);

  const filteredRows = rows.filter((row) =>
    row.productTitle.toLowerCase().includes(search.toLowerCase())
  );

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      timeZone: "Asia/Ho_Chi_Minh",
    });

  const shortOrderNumber = (id: string) =>
    id.length > 10 ? id.slice(0, 2) + "-" + id.slice(-8) : id;

  return (
    <div className="flex gap-8 px-8 py-6">
      {/* LEFT: sidebar My eBay */}
      <aside className="w-56 text-sm">
        <h2 className="mb-4 text-lg font-semibold">My EFPT</h2>

        <div className="mb-4 flex gap-4 text-xs">
          <button className="border-b-2 border-black pb-1 font-medium">
            Activity
          </button>
          {/* <button className="pb-1 text-muted-foreground">Messages</button>
          <button className="pb-1 text-muted-foreground">Account</button> */}
        </div>

        <nav className="space-y-1">
          <div className="font-medium text-muted-foreground">Activity</div>
          <button
            className="w-full rounded px-2 py-1 text-left hover:bg-muted"
            onClick={() => toast.info('Summary feature coming soon!')}
          >
            Summary
          </button>
          <button
            className="w-full rounded px-2 py-1 text-left hover:bg-muted"
            onClick={() => toast.info('Recently viewed feature coming soon!')}
          >
            Recently viewed
          </button>
          <button
            className="w-full rounded px-2 py-1 text-left hover:bg-muted"
            onClick={() => toast.info('Bids & offers feature coming soon!')}
          >
            Bids &amp; offers
          </button>
          <button className="w-full rounded bg-muted px-2 py-1 text-left font-semibold">
            Purchases
          </button>
          <button
            className="w-full rounded px-2 py-1 text-left hover:bg-muted"
            onClick={() => navigate('/messages')}
          >
            Messages
          </button>
          <button
            className="w-full rounded px-2 py-1 text-left hover:bg-muted"
            onClick={() => navigate('/complaints')}
          >
            Returns &amp; complaints
          </button>
          <button
            className="w-full rounded px-2 py-1 text-left hover:bg-muted"
            onClick={() => toast.info('Watchlist feature coming soon!')}
          >
            Watchlist
          </button>
          <button
            className="w-full rounded px-2 py-1 text-left hover:bg-muted"
            onClick={() => toast.info('Saved searches feature coming soon!')}
          >
            Saved searches
          </button>
          <button
            className="w-full rounded px-2 py-1 text-left hover:bg-muted"
            onClick={() => toast.info('Saved sellers feature coming soon!')}
          >
            Saved sellers
          </button>
        </nav>
      </aside>

      {/* RIGHT: purchases list */}
      <main className="flex-1">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Orders</h1>
          <div className="flex items-center gap-2">
            <Input
              placeholder="Search your orders"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-64"
            />
            <Button variant="default">Search</Button>
          </div>
        </div>

        <div className="mb-4 flex flex-wrap items-center gap-6 text-xs text-muted-foreground">
          <div>
            See orders from: <button className="underline">Last 60 days</button>
          </div>
          <div>
            Filter by: <button className="underline">All</button>
          </div>
        </div>

        <Separator className="mb-4" />

        {loading ? (
          <p className="text-sm text-muted-foreground">
            Loading your orders...
          </p>
        ) : filteredRows.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            You don&apos;t have any purchases yet.
          </p>
        ) : (
          <div className="space-y-4">
            {filteredRows.map((row) => (
              <Card key={`${row.orderId}-${row.productId}`}>
                <CardContent className="space-y-3 p-4">
                  {/* HEADER: ORDER DATE | ORDER NUMBER | SOLD BY | ORDER TOTAL | ITEM PRICE */}
                  <div className="grid grid-cols-[1.2fr_1.1fr_1.1fr_1.1fr_0.8fr] gap-6 text-[11px] font-semibold uppercase text-muted-foreground">
                    <div>Order date</div>
                    <div>Order number</div>
                    <div>Sold by</div>
                    <div>Order total</div>
                    <div>Item price</div>
                  </div>

                  {/* VALUE ROW (ngang) */}
                  <div className="grid grid-cols-[1.2fr_1.1fr_1.1fr_1.1fr_0.8fr] gap-6 text-xs">
                    <div>{formatDate(row.orderDate)}</div>
                    <div>{shortOrderNumber(row.orderId)}</div>
                    <div>
                      <button className="text-blue-600 underline">
                        {row.sellerName}
                      </button>
                    </div>

                    {/* ORDER TOTAL + ICON giống hình */}
                    <div className="flex flex-col gap-1 font-semibold">
                      <span>US ${row.totalAmount.toFixed(2)}</span>
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <DollarSign className="h-3 w-3" />
                        <Package className="h-3 w-3" />
                        <Truck className="h-3 w-3" />
                        <ThumbsUp className="h-3 w-3" />
                      </div>
                    </div>

                    {/* ITEM PRICE */}
                    <div className="font-semibold">
                      US ${row.productPrice.toFixed(2)}
                    </div>
                  </div>

                  <Separator />

                  {/* HÀNG CHÍNH: ảnh + title + Delivered + nút bên phải */}
                  <div className="mt-2 flex flex-wrap items-start justify-between gap-4">
                    {/* LEFT: ảnh sản phẩm */}
                    <div className="flex gap-3">
                      <div className="flex h-24 w-24 items-center justify-center rounded border bg-muted overflow-hidden">
                        {row.productId && orders.find(o => o._id === row.orderId)?.items.find(item => item.productId?._id === row.productId)?.productId?.imageUrl ? (
                          <img
                            src={orders.find(o => o._id === row.orderId)?.items.find(item => item.productId?._id === row.productId)?.productId?.imageUrl}
                            alt={row.productTitle}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <span className="text-xs text-muted-foreground text-center px-2">No image</span>
                        )}
                      </div>
                    </div>

                    {/* MIDDLE: title + Delivered on ...  (cùng hàng với ảnh) */}
                    <div className="flex-1 space-y-2 text-sm">
                      <div className="font-medium leading-snug">
                        {row.productTitle}
                      </div>
                      {/* có thể thêm item ID nếu muốn */}
                      {/* <div className="text-xs text-muted-foreground">
                        (item ID ...)
                      </div> */}

                      {/* Delivered on ... */}
                      <div className="flex items-start gap-2 text-xs">
                        <span className="mt-1 inline-block h-3 w-3 rounded-full bg-emerald-500" />
                        <div>
                          <div className="font-medium text-emerald-700">
                            Delivered on {formatDate(row.orderDate)}
                          </div>
                          <div className="text-muted-foreground">
                            Tracking number: —
                          </div>
                          <div className="text-muted-foreground">
                            This item has been delivered.
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* RIGHT: cột nút y như eBay */}
                    <div className="flex flex-col items-end gap-2 text-sm">
                      <Button
                        size="sm"
                        className="w-40 rounded-none bg-blue-600 text-white hover:bg-blue-700"
                        type="button"
                        onClick={() => navigate(`/purchases/${row.orderId}/return/${row.productId}`)}
                      >
                        Return this item
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        className="w-40 rounded-none border-blue-600 text-blue-600 hover:bg-blue-50"
                        type="button"
                        onClick={() => navigate(`/products?search=${encodeURIComponent(row.productTitle)}`)}
                      >
                        View similar items
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        className="w-40 rounded-none border-blue-600 text-blue-600 hover:bg-blue-50"
                        type="button"
                        onClick={() =>
                          navigate(
                            `/purchases/${row.orderId}/feedback/${row.productId}`
                          )
                        }
                      >
                        Leave feedback
                      </Button>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            size="sm"
                            variant="outline"
                            className="w-40 rounded-none border-blue-600 text-blue-600 hover:bg-blue-50"
                            type="button"
                          >
                            More actions ▾
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                          align="end"
                          className="w-52 text-xs"
                        >
                          <DropdownMenuItem onClick={() => handleViewOrderDetails(row.orderId)}>
                            View order details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleContactSeller(row.sellerId, row.productId)}>Contact seller</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => navigate(`/purchases/${row.orderId}/complaint/${row.productId}?reason=not_received`)}>
                            I didn&apos;t receive it
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => navigate(`/products?seller=${row.sellerId}`)}>
                            View seller&apos;s other items
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => navigate('/sell/create', { state: { prefillData: { title: row.productTitle } } })}>
                            Sell this item
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleToggleSaveSeller(row.sellerId, row.sellerName)}
                            disabled={processingActions.has(`save-${row.sellerId}`)}
                          >
                            {savedSellers.has(row.sellerId) ? 'Unsave this seller' : 'Save this seller'}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleHideOrder(row.orderId)}
                            disabled={processingActions.has(`hide-${row.orderId}`)}
                          >
                            Hide order
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>

                      <button
                        className="mt-1 text-xs text-blue-600 underline"
                        onClick={() => toast.info('Add note feature coming soon!')}
                      >
                        Add note
                      </button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* Order Details Dialog */}
      <OrderDetailsDialog
        open={showOrderDetails}
        onOpenChange={setShowOrderDetails}
        order={selectedOrder}
      />

      {/* Chat Dialog */}
      <Dialog open={chatOpen} onOpenChange={setChatOpen}>
        <DialogContent
          className="h-fit overflow-auto flex flex-col p-0 gap-0 left-[unset] right-0 top-[unset] bottom-0 translate-0 m-4"
          aria-describedby=""
          showCloseButton={false}
        >
          <DialogTitle hidden>Chat box</DialogTitle>
          <MessageContext.Provider
            value={{
              participants,
              setParticipants: setParticipantsState,
              conversation,
              setConversation,
              messages,
              setMessages,
              productRef,
              setProductRef,
              product: productContext,
            }}
          >
            <Messages onCloseDialog={() => setChatOpen(false)} />
          </MessageContext.Provider>
        </DialogContent>
      </Dialog>
    </div>
  );
}
