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
import api from "@/lib/axios";
import { ChevronRight, Minus, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { toast } from "sonner";

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
  __v: number;
}

export default function ProductDetailPage() {
  const { productId } = useParams();

  const [product, setProduct] = useState<ProductDetail>();
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    api.get(`/products/${productId}`).then((res) => {
      setProduct(res.data.data);
    });
  }, [productId]);

  const sellerDisplayName = product?.sellerId
    ? `Seller #${product.sellerId.slice(-5)}`
    : "Seller";

  const handleQuantityChange = (delta: number) => {
    setQuantity((prev) => Math.max(1, Math.min(product?.quantity || 999, prev + delta)));
  };

  const handleBuyNow = async () => {
    if (!product) {
      toast.error('Product not found');
      return;
    }

    try {
      // Create order with the product and quantity
      await api.post('/orders', {
        items: [
          {
            productId: product._id,
            quantity: quantity,
          },
        ],
      });

      toast.success('Order created successfully!');
      // Navigate to purchase history
      window.location.href = '/my-ebay/activity/purchases';
    } catch (err: any) {
      console.error('Failed to create order:', err);
      toast.error(err.response?.data?.message || 'Failed to create order');
    }
  };

  return (
    <>
      <div className="w-full flex gap-4">
        <img
          src={product?.images?.[0] || '/placeholder.png'}
          alt={product?.title}
          className="aspect-square h-128 w-3/4 object-cover"
        />

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
                {/* <ContactSeller /> */}
                <Button variant={"link"} className="p-0 h-fit" asChild>
                  <Link to={`/contact-seller/${product?._id}`}>
                    Contact Seller
                  </Link>
                </Button>
              </ItemDescription>
            </ItemContent>
            <ItemActions>
              <Link to={"#"} className="hover:bg-transparent">
                <ChevronRight className="size-6" />
              </Link>
            </ItemActions>
          </Item>
          <Separator />
          <div className="flex flex-col gap-2">
            <h2 className="text-sm text-muted-foreground">Product Price</h2>
            <h1 className="text-3xl font-bold">${product?.price?.toFixed(2) || '0.00'}</h1>
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
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
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
          <Button variant={"outline"} size={"lg"} className="w-full">
            Add to Watchlist
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
