import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const formatUsd = (amount: number) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(amount);
};

export const formatDate = (date: string) => {
  return new Date(date)
    .toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      timeZone: "Asia/Ho_Chi_Minh",
    })
    .replace(/ /g, " ");
};

export const formatTime = (date: string) => {
  return new Date(date).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Ho_Chi_Minh",
  });
};

export const formatDateTime = (date: string) => {
  return `${formatDate(date)} ${formatTime(date)}`;
};

export function formatProductPrice(product: {
  price: number;
  variantCombinations?: { price?: number }[];
}) {
  const combinationsPrices =
    product.variantCombinations
      ?.map((c) => c.price)
      .filter((p): p is number => p !== undefined) || [];

  if (combinationsPrices.length > 0) {
    const minPrice = Math.min(...combinationsPrices);
    const maxPrice = Math.max(...combinationsPrices);
    if (minPrice === maxPrice) {
      return formatUsd(minPrice);
    }
    return `${formatUsd(minPrice)} - ${formatUsd(maxPrice)}`;
  }

  return formatUsd(product.price);
}
