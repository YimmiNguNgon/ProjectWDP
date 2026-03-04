import type { Voucher } from "@/api/vouchers";
import { cn } from "@/lib/utils";
import { Ticket, Clock3, Users } from "lucide-react";

interface VoucherTicketProps {
  voucher: Voucher;
  selected?: boolean;
  disabled?: boolean;
  onSelect?: (voucher: Voucher) => void;
  className?: string;
}

const formatDiscountLabel = (voucher: Voucher) => {
  if (voucher.type === "percentage") {
    return `${voucher.value}% OFF`;
  }
  return `-$${Number(voucher.value || 0).toFixed(2)}`;
};

const formatLimit = (voucher: Voucher) => {
  if (voucher.usageLimit === null || voucher.usageLimit === undefined) {
    return "Unlimited";
  }
  return `${voucher.usedCount}/${voucher.usageLimit}`;
};

export default function VoucherTicket({
  voucher,
  selected,
  disabled,
  onSelect,
  className,
}: VoucherTicketProps) {
  const isGlobal = voucher.scope === "global";
  const expired = voucher.endDate ? new Date(voucher.endDate).getTime() < Date.now() : false;

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onSelect?.(voucher)}
      className={cn(
        "w-full text-left rounded-xl border px-4 py-3 transition-all",
        "relative overflow-hidden",
        isGlobal
          ? "border-yellow-300 bg-gradient-to-br from-yellow-50 to-yellow-100"
          : "border-sky-300 bg-gradient-to-br from-sky-50 to-blue-100",
        selected && "ring-2 ring-red-500 border-red-400",
        (disabled || expired) && "opacity-60 cursor-not-allowed",
        className,
      )}
    >
      <div
        className={cn(
          "absolute left-0 top-0 h-full w-1.5",
          isGlobal ? "bg-yellow-500" : "bg-blue-500",
        )}
      />
      <div className="ml-2">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Ticket className="h-4 w-4 text-foreground/80" />
            <span className="font-bold tracking-wide">{voucher.code}</span>
          </div>
          <span className="text-xs font-semibold px-2 py-1 rounded-full bg-white/80 border">
            {isGlobal ? "GLOBAL" : "SHOP"}
          </span>
        </div>

        <div className="mt-2 text-sm font-semibold text-red-600">
          {formatDiscountLabel(voucher)}
        </div>

        <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-1 text-xs text-muted-foreground">
          <div>Min order: ${Number(voucher.minOrderValue || 0).toFixed(2)}</div>
          <div className="flex items-center gap-1">
            <Users className="h-3.5 w-3.5" />
            {`Usage: ${formatLimit(voucher)}`}
          </div>
          <div>{`Per user: ${voucher.perUserLimit}`}</div>
          <div className="flex items-center gap-1">
            <Clock3 className="h-3.5 w-3.5" />
            {voucher.endDate
              ? `Exp: ${new Date(voucher.endDate).toLocaleDateString()}`
              : "No expiry"}
          </div>
        </div>
      </div>
    </button>
  );
}
