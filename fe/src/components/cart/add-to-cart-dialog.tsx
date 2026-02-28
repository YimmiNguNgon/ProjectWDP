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
import { useEffect, useState } from "react";
import type { ProductDetail } from "@/pages/product-detail";
import { toast } from "sonner";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: ProductDetail | undefined;
};

const AddToCartDialog = ({ open, onOpenChange, product }: Props) => {
  const [quantity, setQuantity] = useState(1);
  const [selectedVariants, setSelectedVariants] = useState<
    Record<string, string>
  >({});
  const { addToCart } = useCart();

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

  const handleAdd = async () => {
    if (product) {
      await addToCart(product._id, quantity, selectedVariantPairs);
    }
    if (
      (product?.variants?.length || 0) > 0 &&
      selectedVariantPairs.length !== product?.variants!.length
    ) {
      toast.error("Please select all product variants");
      return;
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

            {product?.variants && product.variants.length > 0 && (
              <div className="flex flex-col gap-3">
                {product.variants.map((variant) => (
                  <div key={variant.name} className="flex flex-col gap-2">
                    <h3 className="text-sm font-semibold">
                      {variant.name.charAt(0).toUpperCase() +
                        variant.name.slice(1)}
                      :
                      {selectedVariants[variant.name] && (
                        <span className="ml-2 font-normal text-muted-foreground">
                          {selectedVariants[variant.name]}
                        </span>
                      )}
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {variant.options.map((opt) => {
                        const optionAvailable = getOptionAvailable(
                          variant.name,
                          opt.value,
                        );
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() =>
                              setSelectedVariants((prev) => ({
                                ...prev,
                                [variant.name]:
                                  prev[variant.name] === opt.value
                                    ? ""
                                    : opt.value,
                              }))
                            }
                            className={`px-3 py-1.5 rounded-md border text-sm transition-all ${
                              selectedVariants[variant.name] === opt.value
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

            <div className="flex items-center gap-2 mt-2">
              <span>Quantity:</span>
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
                      Math.min(
                        Math.max(1, maxSelectableQty),
                        parseInt(e.target.value) || 1,
                      ),
                    ),
                  )
                }
                className="w-20"
              />
            </div>

            <p className="text-sm text-muted-foreground">
              Stock: {maxSelectableQty} available
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
