import {
  Dialog,
  DialogTrigger,
  DialogHeader,
  DialogContent,
  DialogFooter,
  DialogTitle,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { useCart } from "@/contexts/cart-context";
import { useState } from "react";
import type { Product } from "@/pages/products";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: Product | undefined;
};

const AddToCartDialog = ({ open, onOpenChange, product }: Props) => {
  const [quantity, setQuantity] = useState(1);
  const { addToCart } = useCart();

  const handleAdd = async () => {
    if (product) {
      await addToCart(product._id, quantity);
    }
    onOpenChange(false);
    setQuantity(1);
  };

  if (!product) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add to Cart</DialogTitle>
        </DialogHeader>

        <div className="flex gap-4">
          <img
            src={product.image}
            alt={product.title}
            className="w-24 h-24 object-cover rounded-md"
          />

          <div className="flex flex-col gap-2 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold">{product.title}</h3>-
              <p className="text-muted-foreground">
                ${product.price?.toFixed(2)}
              </p>
            </div>
            <h3 className="text-muted-foreground">{product.description}</h3>

            <div className="flex items-center gap-2 mt-2">
              <span>Quantity:</span>
              <Input
                type="number"
                min={1}
                max={product.stock}
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                className="w-20"
              />
            </div>

            <p className="text-sm text-muted-foreground">
              Stock: {product.stock}
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            className="cursor-pointer"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button className="cursor-pointer" onClick={handleAdd}>
            Add to Cart
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AddToCartDialog;
