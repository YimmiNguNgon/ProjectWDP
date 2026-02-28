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
import {
  ChevronRight,
  Minus,
  Plus,
  Heart,
  UserPlus,
  UserCheck,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toggleWatchlist, getUserWatchlist } from "@/api/watchlist";
import { cn } from "@/lib/utils";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import axios from "@/lib/axios";
import { useCart } from "@/contexts/cart-context";

export interface ProductVariantOption {
  value: string;
  price?: number;
  quantity: number;
  sku?: string;
}

export interface ProductVariant {
  name: string;
  options: ProductVariantOption[];
}

export interface ProductVariantCombination {
  key: string;
  selections: { name: string; value: string }[];
  quantity: number;
  sku?: string;
}

export interface ProductDetail {
  _id: string;
  sellerId: string;
  title: string;
  images: string[];
  image: string;
  description: string;
  price: number;
  quantity: number;
  condition: string;
  status: string;
  averageRating: number;
  ratingCount: number;
  variants?: ProductVariant[];
  variantCombinations?: ProductVariantCombination[];
  createdAt: Date;
  updatedAt: Date;
  watchCount?: number;
  __v: number;
}

export default function ProductDetailPage() {
  const { productId } = useParams();
  const { addToCart } = useCart();

  const [product, setProduct] = useState<ProductDetail>();
  const [quantity, setQuantity] = useState(1);
  const [voucherCode, setVoucherCode] = useState("");
  const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>({});
  const [isWatched, setIsWatched] = useState(false);
  const [watchCount, setWatchCount] = useState(0);
  const [isFollowingSeller, setIsFollowingSeller] = useState(false);

  // Chat dialog states
  const [open, setOpen] = useState(false);
  const { payload, accessToken } = useAuth();
  const navigate = useNavigate();

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

    if (accessToken) {
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
              (seller: any) => seller._id === product.sellerId,
            );
            setIsFollowingSeller(isFollowing);
          })
          .catch((err) => console.error(err));
      }
    }
  }, [productId, product?.sellerId, accessToken]);

  const handleToggleFollowSeller = async () => {
    if (!product) return;
    if (!accessToken) {
      toast.error("Please sign in to follow seller");
      navigate("/auth/sign-in");
      return;
    }
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
      toast.error(
        err.response?.data?.message || "Failed to update follow status",
      );
    }
  };

  const handleToggleWatchlist = async () => {
    if (!product) return;
    if (!accessToken) {
      toast.error("Please sign in to add to watchlist");
      navigate("/auth/sign-in");
      return;
    }
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

  const selectedVariantPairs = Object.entries(selectedVariants)
    .filter(([, value]) => value)
    .map(([name, value]) => ({ name, value }));

  const getSelectedCombinationStock = () => {
    if (!product?.variantCombinations?.length) return product?.quantity || 0;
    if (!product?.variants?.length) return product?.quantity || 0;
    if (selectedVariantPairs.length !== product.variants.length) {
      return product?.quantity || 0;
    }

    const key = [...selectedVariantPairs]
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((p) => `${p.name}:${p.value}`)
      .join("|");
    const combo = product.variantCombinations.find((c) => c.key === key);
    return combo?.quantity || 0;
  };

  const getOptionAvailable = (variantName: string, optionValue: string) => {
    if (!product?.variantCombinations?.length) return true;
    const expected = selectedVariantPairs.filter((p) => p.name !== variantName);
    expected.push({ name: variantName, value: optionValue });

    return product.variantCombinations.some((combo) => {
      if ((combo.quantity || 0) <= 0) return false;
      return expected.every((item) =>
        combo.selections.some(
          (s) => s.name === item.name && s.value === item.value,
        ),
      );
    });
  };

  const selectedStock = getSelectedCombinationStock();
  const isExactVariantSelected =
    (product?.variants?.length || 0) > 0 &&
    selectedVariantPairs.length === (product?.variants?.length || 0);
  const maxSelectableQty = isExactVariantSelected
    ? selectedStock
    : product?.quantity || 0;

  useEffect(() => {
    const maxQty = Math.max(1, maxSelectableQty || 1);
    setQuantity((prev) => Math.max(1, Math.min(prev, maxQty)));
  }, [maxSelectableQty]);

  const handleQuantityChange = (delta: number) => {
    setQuantity((prev) =>
      Math.max(1, Math.min(Math.max(1, maxSelectableQty), prev + delta)),
    );
  };

  const handleJoinChat = () => {
    const sender = payload?.userId;
    const receiver = product?.sellerId;
    if (!sender || !receiver) {
      toast.error("Vui lòng đăng nhập để chat với seller");
      return;
    }
    // Seller không thể chat với chính mình
    if (sender === receiver || String(sender) === String(receiver)) {
      toast.info("Đây là sản phẩm của bạn");
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

    if (!accessToken) {
      toast.error("Please sign in to buy products");
      navigate("/auth/sign-in");
      return;
    }

    if ((product.variants?.length || 0) > 0 && selectedVariantPairs.length !== product.variants!.length) {
      toast.error("Please select all product variants");
      return;
    }

    try {
      // Create order with the product and quantity
      await api.post("/api/orders", {
        items: [
          {
            productId: product._id,
            quantity: quantity,
            selectedVariants: selectedVariantPairs,
          },
        ],
        voucherCode: voucherCode.trim() || undefined,
      });

      toast.success("Order created successfully!");
      // Navigate to purchase history
      window.location.href = "/my-ebay/activity/purchases";
    } catch (err: any) {
      console.error("Failed to create order:", err);
      toast.error(err.response?.data?.message || "Failed to create order");
    }
  };

  const handleAddToCart = async () => {
    if (!product) return;
    if (!accessToken) {
      toast.error("Please sign in to add to cart");
      navigate("/auth/sign-in");
      return;
    }
    if ((product.variants?.length || 0) > 0 && selectedVariantPairs.length !== product.variants!.length) {
      toast.error("Please select all product variants");
      return;
    }

    await addToCart(product._id, quantity, selectedVariantPairs);
  };

  const [selectedImageIdx, setSelectedImageIdx] = useState(0);

  // Danh sách ảnh hiển thị: ưu tiên images[], fallback sang image, cuối cùng placeholder
  const allImages: string[] = (() => {
    const arr: string[] = [];
    if (product?.images && product.images.length > 0) {
      product.images.forEach(u => { if (u) arr.push(u); });
    }
    if (product?.image && !arr.includes(product.image)) {
      arr.push(product.image);
    }
    return arr;
  })();
  const displayImage = allImages[selectedImageIdx] ?? null;

  return (
    <>
      <div className="w-full flex gap-4">
        <div className="relative w-3/4 flex flex-col gap-3">
          {/* Main image */}
          <div className="relative">
            <img
              src={displayImage ?? ""}
              alt={product?.title}
              className="aspect-square h-128 w-full object-contain rounded-lg bg-muted/30"
              onError={(e) => {
                const el = e.currentTarget;
                el.onerror = null; // prevent loop
                el.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400' fill='none' viewBox='0 0 24 24'%3E%3Crect width='24' height='24' fill='%23f3f4f6'/%3E%3Cpath stroke='%239ca3af' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2zm6-8a2 2 0 100-4 2 2 0 000 4z'/%3E%3C/svg%3E";
              }}
              style={{ display: 'block' }}
            />
            {!displayImage && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground bg-muted/30 rounded-lg">
                <svg className="h-16 w-16 mb-2 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2zm6-8a2 2 0 100-4 2 2 0 000 4z" />
                </svg>
                <p className="text-sm">Chưa có hình ảnh</p>
              </div>
            )}
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

          {/* Thumbnail strip */}
          {allImages.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {allImages.map((url, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setSelectedImageIdx(idx)}
                  className={`flex-shrink-0 w-16 h-16 rounded-md border-2 overflow-hidden transition-all ${idx === selectedImageIdx
                    ? 'border-primary ring-2 ring-primary/30'
                    : 'border-border hover:border-primary/50'
                    }`}
                >
                  <img
                    src={url}
                    alt={`${product?.title} ${idx + 1}`}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      const el = e.currentTarget;
                      el.onerror = null;
                      el.parentElement!.style.display = 'none';
                    }}
                  />
                </button>
              ))}
            </div>
          )}
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
                {/* Chỉ hiện Contact Seller khi KHÔNG phải sản phẩm của chính mình */}
                {(!payload?.userId || String(payload.userId) !== String(product?.sellerId)) && (
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
                )}
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
          {/* Variants - Đặc điểm sản phẩm */}
          {product?.variants && product.variants.length > 0 && (
            <div className="flex flex-col gap-3">
              {product.variants.map((variant) => (
                <div key={variant.name} className="flex flex-col gap-2">
                  <h3 className="text-sm font-semibold">
                    {variant.name}:
                    {selectedVariants[variant.name] && (
                      <span className="ml-2 font-normal text-muted-foreground">
                        {selectedVariants[variant.name]}
                      </span>
                    )}
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {variant.options.map((opt) => {
                      const optionAvailable = getOptionAvailable(variant.name, opt.value);
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() =>
                            setSelectedVariants((prev) => ({
                              ...prev,
                              [variant.name]: prev[variant.name] === opt.value ? '' : opt.value,
                            }))
                          }
                          className={`px-3 py-1.5 rounded-md border text-sm transition-all ${selectedVariants[variant.name] === opt.value
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border hover:border-primary"
                            } ${optionAvailable ? "cursor-pointer" : "opacity-40 cursor-not-allowed line-through"}`}
                          disabled={!optionAvailable}
                        >
                          {opt.value}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
          <Separator />
          <div className="flex flex-col gap-2">
            <Label className="font-bold text-lg">Voucher code:</Label>
            <Input
              type="text"
              placeholder="Enter voucher code (optional)"
              value={voucherCode}
              onChange={(e) => setVoucherCode(e.target.value.toUpperCase())}
              className="h-12"
            />
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
                max={Math.max(1, maxSelectableQty)}
                value={quantity}
                onChange={(e) =>
                  setQuantity(
                    Math.max(
                      1,
                      Math.min(Math.max(1, maxSelectableQty), parseInt(e.target.value) || 1),
                    ),
                  )
                }
                className="h-12 px-6 w-20 text-center"
              />
              <Button
                variant={"outline"}
                size={"icon"}
                onClick={() => handleQuantityChange(1)}
                disabled={quantity >= Math.max(1, maxSelectableQty)}
              >
                <Plus />
              </Button>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            In stock: {Math.max(0, maxSelectableQty)}
          </p>
          {/* Nút mua - ẩn khi là sản phẩm của chính mình */}
          {product?.sellerId && payload?.userId && String(product.sellerId) === String(payload.userId) ? (
            <div className="w-full text-center py-3 bg-muted rounded-md text-sm text-muted-foreground">
              Đây là sản phẩm của bạn
            </div>
          ) : (
            <>
              <Button
                variant={"default"}
                size={"lg"}
                className="w-full cursor-pointer"
                onClick={handleBuyNow}
                disabled={maxSelectableQty <= 0}
              >
                Buy it Now
              </Button>
              <Button
                variant={"outline"}
                size={"lg"}
                className="w-full cursor-pointer"
                onClick={handleAddToCart}
                disabled={maxSelectableQty <= 0}
              >
                Add to Cart
              </Button>
            </>
          )}
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

