"use client";

import { SellerFeedbackSection } from "@/components/feedback/seller-feedback-section";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Messages } from "@/components/chat/messages";
import {
  MessageContext,
  type Conversation,
  type Message,
} from "@/hooks/use-message";
import { useAuth } from "@/hooks/use-auth";
import api from "@/lib/axios";
import { ChevronRight, Minus, Plus, Heart, UserPlus, UserCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { toggleWatchlist, getUserWatchlist } from "@/api/watchlist";
import { cn } from "@/lib/utils";
import { Link, useParams } from "react-router-dom";
import { toast } from "sonner";
import axios from "@/lib/axios";

export interface ProductDetail {
  _id: string;
  sellerId: string;
  title: string;
  images: string[];
  description: string;
  price: number;
  quantity: number;
  condition: string;
  status: string;
  averageRating: number;
  ratingCount: number;
  createdAt: Date;
  updatedAt: Date;
  watchCount?: number;
  __v: number;
}

export default function ProductDetailPage() {
  const { productId } = useParams();

  const [product, setProduct] = useState<ProductDetail>();
  const [quantity, setQuantity] = useState(1);
  const [isWatched, setIsWatched] = useState(false);
  const [watchCount, setWatchCount] = useState(0);
  const [isFollowingSeller, setIsFollowingSeller] = useState(false);

  // Chat dialog states
  const [open, setOpen] = useState(false);
  const { payload } = useAuth();

  // Message context states
  const [participants, setParticipantsState] = useState<string[]>([]);
  const [conversation, setConversation] = useState<Conversation | undefined>();
  const [messages, setMessages] = useState<Message[] | undefined>();
  const [productRef, setProductRef] = useState<string | undefined>();
  const [productContext, setProductContext] = useState<
    ProductDetail | undefined
  >();

  useEffect(() => {
    api.get(`/api/products/${productId}`).then((res) => {
      setProduct(res.data.data);
      setWatchCount(res.data.data.watchCount || 0);
    });

    getUserWatchlist()
      .then((res) => {
        const watched = res.data.data.some(
          (item: any) => item.product._id === productId,
        );
        setIsWatched(watched);
      })
      .catch((err) => console.error(err));

    // Check if following seller
    if (product?.sellerId) {
      axios
        .get("/api/saved-sellers")
        .then((res) => {
          const savedSellers = res.data.data || [];
          const isFollowing = savedSellers.some(
            (seller: any) => seller._id === product.sellerId
          );
          setIsFollowingSeller(isFollowing);
        })
        .catch((err) => console.error(err));
    }
  }, [productId, product?.sellerId]);

  const handleToggleFollowSeller = async () => {
    if (!product) return;
    try {
      if (isFollowingSeller) {
        // Unfollow
        await axios.delete(`/api/saved-sellers/${product.sellerId}`);
        setIsFollowingSeller(false);
        toast.success("Unfollowed seller");
      } else {
        // Follow
        await axios.post("/api/saved-sellers", { sellerId: product.sellerId });
        setIsFollowingSeller(true);
        toast.success("Following seller");
      }
    } catch (err: any) {
      console.error("Failed to toggle follow seller:", err);
      toast.error(err.response?.data?.message || "Failed to update follow status");
    }
  };

  const handleToggleWatchlist = async () => {
    if (!product) return;
    try {
      const res = await toggleWatchlist(product._id);
      const newStatus = res.data.watched;
      setIsWatched(newStatus);
      setWatchCount((prev) => Math.max(0, prev + (newStatus ? 1 : -1)));
      toast.success(
        newStatus ? "Added to watchlist" : "Removed from watchlist",
      );
    } catch (err) {
      toast.error("Failed to update watchlist");
    }
  };

  const sellerDisplayName = product?.sellerId
    ? `Seller #${product.sellerId.slice(-5)}`
    : "Seller";

  const handleQuantityChange = (delta: number) => {
    setQuantity((prev) =>
      Math.max(1, Math.min(product?.quantity || 999, prev + delta)),
    );
  };

  const handleJoinChat = () => {
    const sender = payload?.userId;
    const receiver = product?.sellerId;
    if (!sender || !receiver) {
      toast.error("Vui lòng đăng nhập để chat với seller");
      return;
    }
    setParticipantsState([sender, receiver]);
    setProductRef(productId);
    setProductContext(product);
  };

  const handleBuyNow = async () => {
    if (!product) {
      toast.error("Product not found");
      return;
    }

    try {
      // Create order with the product and quantity
      await api.post("/api/orders", {
        items: [
          {
            productId: product._id,
            quantity: quantity,
          },
        ],
      });

      toast.success("Order created successfully!");
      // Navigate to purchase history
      window.location.href = "/my-ebay/activity/purchases";
    } catch (err: any) {
      console.error("Failed to create order:", err);
      toast.error(err.response?.data?.message || "Failed to create order");
    }
  };

  return (
    <>
      <div className="w-full flex gap-4">
        <div className="relative w-3/4">
          <img
            src={product?.images?.[0] || "/placeholder.png"}
            alt={product?.title}
            className="aspect-square h-128 w-full object-cover"
          />
          <Button
            size="icon"
            variant="secondary"
            className="absolute top-4 cursor-pointer right-4 h-10 w-auto min-w-[3.75rem] px-3 rounded-full shadow-md bg-white/80 hover:bg-white"
            onClick={handleToggleWatchlist}
          >
            <div className="flex items-center justify-center gap-1">
              <span className="text-sm font-semibold leading-none">
                {watchCount}
              </span>
              <Heart
                className={cn(
                  "h-5 w-5",
                  isWatched ? "fill-red-500 text-red-500" : "text-gray-600",
                )}
              />
            </div>
          </Button>
        </div>

        <div className="w-2/5 flex flex-col gap-4">
          <h1 className="text-2xl font-medium">{product?.title}</h1>
          <Separator />
          <Item
            variant={"muted"}
            className="bg-transparent [a]:hover:bg-transparent p-0"
          >
            <ItemMedia className="my-auto">
              <Link to={"#"} className="hover:bg-transparent">
                <div className="aspect-square h-14 bg-muted rounded-full"></div>
              </Link>
            </ItemMedia>
            <ItemContent>
              <Link to={"#"} className="hover:bg-transparent">
                <ItemTitle>{product?.sellerId}</ItemTitle>
              </Link>
              <ItemDescription className="inline-flex flex-nowrap gap-2 items-center">
                <span>Shop Desciption</span>
                {/* Chat Dialog */}
                <Dialog open={open} onOpenChange={setOpen}>
                  <DialogTrigger asChild>
                    <Button
                      variant="link"
                      className="p-0 h-fit"
                      onClick={handleJoinChat}
                    >
                      Contact Seller
                    </Button>
                  </DialogTrigger>
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
                      <Messages onCloseDialog={() => setOpen(false)} />
                    </MessageContext.Provider>
                  </DialogContent>
                </Dialog>
              </ItemDescription>
            </ItemContent>
            <ItemActions className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleToggleFollowSeller}
                className="gap-2"
              >
                {isFollowingSeller ? (
                  <>
                    <UserCheck className="h-4 w-4" />
                    Following
                  </>
                ) : (
                  <>
                    <UserPlus className="h-4 w-4" />
                    Follow Seller
                  </>
                )}
              </Button>
              <Link to={"#"} className="hover:bg-transparent">
                <ChevronRight className="size-6" />
              </Link>
            </ItemActions>
          </Item>
          <Separator />
          <div className="flex flex-col gap-2">
            <h2 className="text-sm text-muted-foreground">Product Price</h2>
            <h1 className="text-3xl font-bold">
              ${product?.price?.toFixed(2) || "0.00"}
            </h1>
          </div>
          <Separator />
          <div className="flex gap-4 items-center">
            <Label className="font-bold text-lg">Quantity:</Label>
            <div className="flex gap-2 items-center">
              <Button
                variant={"outline"}
                size={"icon"}
                onClick={() => handleQuantityChange(-1)}
                disabled={quantity <= 1}
              >
                <Minus />
              </Button>
              <Input
                type="number"
                required
                min={1}
                max={product?.quantity}
                value={quantity}
                onChange={(e) =>
                  setQuantity(Math.max(1, parseInt(e.target.value) || 1))
                }
                className="h-12 px-6 w-20 text-center"
              />
              <Button
                variant={"outline"}
                size={"icon"}
                onClick={() => handleQuantityChange(1)}
                disabled={quantity >= (product?.quantity || 999)}
              >
                <Plus />
              </Button>
            </div>
          </div>
          <Button
            variant={"default"}
            size={"lg"}
            className="w-full"
            onClick={handleBuyNow}
          >
            Buy it Now
          </Button>
          <Button variant={"outline"} size={"lg"} className="w-full">
            Add to Cart
          </Button>
          <Button
            variant={"outline"}
            size={"lg"}
            className="w-full gap-2 cursor-pointer"
            onClick={handleToggleWatchlist}
          >
            <Heart
              className={cn(
                "h-4 w-4",
                isWatched ? "fill-red-500 text-red-500" : "",
              )}
            />
            {isWatched ? "Remove from Watchlist" : "Add to Watchlist"}
          </Button>
        </div>
      </div>

      {/* BELOW: Seller feedback + Product ratings */}
      {product && (
        <>
          <SellerFeedbackSection
            sellerId={product.sellerId}
            sellerName={sellerDisplayName}
            productId={product._id}
          />

          {/* <ProductRatingsSection productId={product._id} /> */}
        </>
      )}
    </>
  );
}
