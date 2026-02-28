import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { PlusIcon, TrashIcon, XIcon } from 'lucide-react';
import type {
    ProductVariant,
    ProductVariantCombination,
} from '@/api/seller-products';

interface ProductVariantsManagerProps {
    variants: ProductVariant[];
    variantCombinations: ProductVariantCombination[];
    basePrice?: number;
    onChange: (variants: ProductVariant[]) => void;
    onCombinationsChange: (variantCombinations: ProductVariantCombination[]) => void;
}

export default function ProductVariantsManager({
    variants,
    variantCombinations,
    basePrice = 0,
    onChange,
    onCombinationsChange,
}: ProductVariantsManagerProps) {
    const [newVariantName, setNewVariantName] = useState('');

    const buildVariantKey = (selections: { name: string; value: string }[]) =>
        [...selections]
            .sort((a, b) => a.name.localeCompare(b.name))
            .map((s) => `${s.name}:${s.value}`)
            .join('|');

    const generatedCombinations = useMemo(() => {
        if (!variants.length) return [];
        if (variants.some((v) => !v.options || v.options.length === 0)) return [];

        const normalizedVariants = variants.map((variant) => {
            const seen = new Set<string>();
            const uniqueOptions = (variant.options || []).filter((option) => {
                const value = String(option.value || '').trim();
                if (!value) return false;
                const dedupeKey = value.toLowerCase();
                if (seen.has(dedupeKey)) return false;
                seen.add(dedupeKey);
                return true;
            });
            return {
                ...variant,
                options: uniqueOptions,
            };
        });

        const cartesian = (
            index: number,
            acc: { name: string; value: string }[],
        ): ProductVariantCombination[] => {
            if (index >= normalizedVariants.length) {
                const selections = [...acc].sort((a, b) => a.name.localeCompare(b.name));
                return [
                    {
                        key: buildVariantKey(selections),
                        selections,
                        quantity: 0,
                        price: Number(basePrice || 0),
                        sku: '',
                    },
                ];
            }

            const current = normalizedVariants[index];
            const results: ProductVariantCombination[] = [];
            for (const option of current.options || []) {
                const value = String(option.value || '').trim();
                if (!value) continue;
                results.push(
                    ...cartesian(index + 1, [...acc, { name: current.name, value }]),
                );
            }
            return results;
        };

        return cartesian(0, []);
    }, [variants, basePrice]);

    useEffect(() => {
        if (!generatedCombinations.length) {
            if (variantCombinations.length) onCombinationsChange([]);
            return;
        }

        const prevMap = new Map(
            variantCombinations.map((c) => [c.key, c]),
        );
        const merged = generatedCombinations.map((combo) => {
            const prev = prevMap.get(combo.key);
            return {
                ...combo,
                quantity: Number(prev?.quantity || 0),
                price:
                    prev?.price === undefined || prev?.price === null
                        ? Number(basePrice || 0)
                        : Number(prev.price),
                sku: String(prev?.sku || ''),
            };
        });
        const mergedSorted = [...merged].sort((a, b) => a.key.localeCompare(b.key));
        const currentSorted = [...variantCombinations].sort((a, b) =>
            a.key.localeCompare(b.key),
        );
        const mergedJson = JSON.stringify(mergedSorted);
        const currentJson = JSON.stringify(
            currentSorted,
        );
        if (mergedJson !== currentJson) {
            onCombinationsChange(mergedSorted);
        }
    }, [generatedCombinations, variantCombinations, basePrice, onCombinationsChange]);

    const addVariant = () => {
        if (!newVariantName.trim()) return;
        onChange([...variants, { name: newVariantName, options: [] }]);
        setNewVariantName('');
    };

    const removeVariant = (index: number) => {
        onChange(variants.filter((_, i) => i !== index));
    };

    const updateVariantName = (index: number, name: string) => {
        const updated = [...variants];
        updated[index].name = name;
        onChange(updated);
    };

    const addOption = (variantIndex: number) => {
        const updated = [...variants];
        updated[variantIndex].options.push({
            value: '',
        });
        onChange(updated);
    };

    const removeOption = (variantIndex: number, optionIndex: number) => {
        const updated = [...variants];
        updated[variantIndex].options = updated[variantIndex].options.filter(
            (_, i) => i !== optionIndex
        );
        onChange(updated);
    };

    const updateOption = (
        variantIndex: number,
        optionIndex: number,
        field: string,
        value: any
    ) => {
        const updated = [...variants];
        (updated[variantIndex].options[optionIndex] as any)[field] = value;
        onChange(updated);
    };

    const updateCombination = (
        key: string,
        field: 'quantity' | 'price' | 'sku',
        value: number | string,
    ) => {
        onCombinationsChange(
            variantCombinations.map((combo) =>
                combo.key === key ? { ...combo, [field]: value } : combo,
            ),
        );
    };

    return (
        <div className="space-y-4">
            {/* Add Variant */}
            <div className="flex gap-2">
                <Input
                    placeholder="Variant name (e.g., Size, Color)"
                    value={newVariantName}
                    onChange={(e) => setNewVariantName(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            e.preventDefault();
                            addVariant();
                        }
                    }}
                />
                <Button type="button" onClick={addVariant} size="sm">
                    <PlusIcon className="w-4 h-4 mr-1" />
                    Add Variant
                </Button>
            </div>

            {/* Variant List */}
            {variants.map((variant, variantIndex) => (
                <Card key={variantIndex} className="p-4">
                    <div className="flex items-center justify-between mb-3">
                        <Input
                            value={variant.name}
                            onChange={(e) => updateVariantName(variantIndex, e.target.value)}
                            className="max-w-xs font-medium"
                            placeholder="Variant name"
                        />
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeVariant(variantIndex)}
                        >
                            <TrashIcon className="w-4 h-4 text-red-600" />
                        </Button>
                    </div>

                    {/* Options */}
                    <div className="space-y-2 ml-4">
                        {variant.options.map((option, optionIndex) => (
                            <div key={optionIndex} className="flex gap-2 items-end">
                                <div className="flex-1 grid grid-cols-2 gap-2">
                                    <div>
                                        <Label className="text-xs">Value</Label>
                                        <Input
                                            value={option.value}
                                            onChange={(e) =>
                                                updateOption(variantIndex, optionIndex, 'value', e.target.value)
                                            }
                                            placeholder="e.g., M, Red"
                                            size={1}
                                        />
                                    </div>
                                    <div>
                                        <Label className="text-xs">SKU</Label>
                                        <Input
                                            value={option.sku || ''}
                                            onChange={(e) =>
                                                updateOption(variantIndex, optionIndex, 'sku', e.target.value)
                                            }
                                            placeholder="Optional"
                                            size={1}
                                        />
                                    </div>
                                </div>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => removeOption(variantIndex, optionIndex)}
                                >
                                    <XIcon className="w-4 h-4 text-gray-500" />
                                </Button>
                            </div>
                        ))}

                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => addOption(variantIndex)}
                        >
                            <PlusIcon className="w-3 h-3 mr-1" />
                            Add Option
                        </Button>
                    </div>
                </Card>
            ))}

            {variants.length === 0 && (
                <p className="text-sm text-gray-500 italic">
                    No variants added yet.
                </p>
            )}

            {variantCombinations.length > 0 && (
                <Card className="p-4">
                    <h4 className="font-medium mb-3">Combination Stock</h4>
                    <div className="space-y-2">
                        {variantCombinations.map((combo) => (
                            <div key={combo.key} className="grid grid-cols-12 gap-2 items-end">
                                <div className="col-span-5">
                                    <Label className="text-xs">Combination</Label>
                                    <div className="h-10 px-3 rounded-md border bg-muted/30 flex items-center text-sm">
                                        {combo.selections.map((s) => s.value).join(' / ')}
                                    </div>
                                </div>
                                <div className="col-span-2">
                                    <Label className="text-xs">Quantity</Label>
                                    <Input
                                        type="number"
                                        min="0"
                                        value={combo.quantity}
                                        onChange={(e) =>
                                            updateCombination(
                                                combo.key,
                                                'quantity',
                                                parseInt(e.target.value) || 0,
                                            )
                                        }
                                    />
                                </div>
                                <div className="col-span-2">
                                    <Label className="text-xs">Price</Label>
                                    <Input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={combo.price ?? basePrice}
                                        onChange={(e) =>
                                            updateCombination(
                                                combo.key,
                                                'price',
                                                e.target.value ? parseFloat(e.target.value) : 0,
                                            )
                                        }
                                    />
                                </div>
                                <div className="col-span-3">
                                    <Label className="text-xs">SKU</Label>
                                    <Input
                                        value={combo.sku || ''}
                                        onChange={(e) =>
                                            updateCombination(combo.key, 'sku', e.target.value)
                                        }
                                        placeholder="Optional"
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </Card>
            )}
        </div>
    );
}



