const normalizeSelectedVariants = (selectedVariants) => {
  if (!selectedVariants) return [];

  if (Array.isArray(selectedVariants)) {
    return selectedVariants
      .map((item) => ({
        name: String(item?.name || "").trim(),
        value: String(item?.value || "").trim(),
      }))
      .filter((item) => item.name && item.value)
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  if (typeof selectedVariants === "object") {
    return Object.entries(selectedVariants)
      .map(([name, value]) => ({
        name: String(name).trim(),
        value: String(value || "").trim(),
      }))
      .filter((item) => item.name && item.value)
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  return [];
};

const buildVariantKey = (selectedVariants) => {
  const normalized = normalizeSelectedVariants(selectedVariants);
  if (!normalized.length) return "";
  return normalized.map((item) => `${item.name}:${item.value}`).join("|");
};

const normalizeVariantCombinations = (variantCombinations) => {
  if (!Array.isArray(variantCombinations)) return [];

  const normalized = variantCombinations
    .map((combo) => {
      const selections = normalizeSelectedVariants(combo?.selections || []);
      if (!selections.length) return null;
      return {
        key: buildVariantKey(selections),
        selections,
        quantity: Number(combo?.quantity || 0),
        sku: String(combo?.sku || "").trim(),
      };
    })
    .filter((combo) => combo && combo.key);

  const dedupedMap = new Map();
  for (const combo of normalized) {
    if (!dedupedMap.has(combo.key)) {
      dedupedMap.set(combo.key, { ...combo });
      continue;
    }
    const prev = dedupedMap.get(combo.key);
    prev.quantity = Number(prev.quantity || 0) + Number(combo.quantity || 0);
    if (!prev.sku && combo.sku) prev.sku = combo.sku;
    dedupedMap.set(combo.key, prev);
  }

  return [...dedupedMap.values()];
};

const syncProductStockFromVariants = (product) => {
  const combinations = normalizeVariantCombinations(product.variantCombinations);
  if (combinations.length) {
    const total = combinations.reduce(
      (sum, combo) => sum + (Number(combo.quantity) || 0),
      0,
    );
    product.variantCombinations = combinations;
    product.quantity = total;
    product.stock = total;
    return;
  }

  product.stock = Number(product.quantity || 0);
};

const findVariantOption = (product, selectedVariants) => {
  const normalized = normalizeSelectedVariants(selectedVariants);
  const hasVariants = Array.isArray(product.variants) && product.variants.length > 0;

  if (!hasVariants) {
    return {
      ok: normalized.length === 0,
      message:
        normalized.length > 0
          ? "This product does not support variants"
          : "",
      normalized: [],
      optionRef: null,
      optionPrice: Number(product.price) || 0,
      optionQuantity: Number(product.quantity || product.stock || 0),
      optionSku: "",
    };
  }

  if (normalized.length !== product.variants.length) {
    return {
      ok: false,
      message: "Please select all required product variants",
      normalized: [],
      optionRef: null,
      optionPrice: 0,
      optionQuantity: 0,
      optionSku: "",
    };
  }

  const optionSkus = [];

  for (const selected of normalized) {
    const variantGroup = product.variants.find(
      (variant) => variant.name === selected.name,
    );
    if (!variantGroup) {
      return {
        ok: false,
        message: `Invalid variant name: ${selected.name}`,
        normalized: [],
        optionRef: null,
        optionPrice: 0,
        optionQuantity: 0,
        optionSku: "",
      };
    }

    const option = (variantGroup.options || []).find(
      (item) => item.value === selected.value,
    );
    if (!option) {
      return {
        ok: false,
        message: `Invalid option "${selected.value}" for ${selected.name}`,
        normalized: [],
        optionRef: null,
        optionPrice: 0,
        optionQuantity: 0,
        optionSku: "",
      };
    }

    if (option.sku) optionSkus.push(option.sku);
  }

  const combinationKey = buildVariantKey(normalized);
  const combinations = normalizeVariantCombinations(product.variantCombinations);
  if (!combinations.length) {
    return {
      ok: true,
      message: "",
      normalized,
      optionRef: normalized,
      optionPrice: Number(product.price) || 0,
      optionQuantity: Number(product.quantity || product.stock || 0),
      optionSku: optionSkus.join("|"),
      combinationKey,
    };
  }
  const matchedCombination = combinations.find(
    (combo) => combo.key === combinationKey,
  );
  if (!matchedCombination) {
    return {
      ok: false,
      message: "This variant combination is not configured",
      normalized: [],
      optionRef: null,
      optionPrice: 0,
      optionQuantity: 0,
      optionSku: "",
      combinationKey: "",
    };
  }

  return {
    ok: true,
    message: "",
    normalized,
    optionRef: matchedCombination,
    optionPrice: Number(product.price) || 0,
    optionQuantity: Number(matchedCombination.quantity || 0),
    optionSku: matchedCombination.sku || optionSkus.join("|"),
    combinationKey,
  };
};

module.exports = {
  normalizeSelectedVariants,
  normalizeVariantCombinations,
  buildVariantKey,
  syncProductStockFromVariants,
  findVariantOption,
};
