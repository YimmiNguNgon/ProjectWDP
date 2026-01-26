import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { PlusIcon, TrashIcon, XIcon } from 'lucide-react';
import type { ProductVariant } from '@/api/seller-products';

interface ProductVariantsManagerProps {
    variants: ProductVariant[];
    onChange: (variants: ProductVariant[]) => void;
}

export default function ProductVariantsManager({
    variants,
    onChange,
}: ProductVariantsManagerProps) {
    const [newVariantName, setNewVariantName] = useState('');

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
            quantity: 0,
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
                                <div className="flex-1 grid grid-cols-4 gap-2">
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
                                        <Label className="text-xs">Quantity</Label>
                                        <Input
                                            type="number"
                                            min="0"
                                            value={option.quantity}
                                            onChange={(e) =>
                                                updateOption(
                                                    variantIndex,
                                                    optionIndex,
                                                    'quantity',
                                                    parseInt(e.target.value) || 0
                                                )
                                            }
                                            size={1}
                                        />
                                    </div>
                                    <div>
                                        <Label className="text-xs">Price ($)</Label>
                                        <Input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            value={option.price || ''}
                                            onChange={(e) =>
                                                updateOption(
                                                    variantIndex,
                                                    optionIndex,
                                                    'price',
                                                    e.target.value ? parseFloat(e.target.value) : undefined
                                                )
                                            }
                                            placeholder="Optional"
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
                    No variants added. Add variants like Size or Color to offer multiple options.
                </p>
            )}
        </div>
    );
}
