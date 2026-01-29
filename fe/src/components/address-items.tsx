import type { Address } from "@/api/user";
import { MoreVertical } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Button } from "./ui/button";

interface AddressItemsProps {
  address: Address;
  onEdit?: (address: Address) => void;
  onDelete?: (id: string) => void;
  onSetDefault?: (id: string) => void;
}

const AddressItems = ({
  address,
  onEdit,
  onDelete,
  onSetDefault,
}: AddressItemsProps) => {
  const fullAddress = `${address.street ? address.street + "," : ""} ${address.ward ? address.ward + "," : ""} ${address.district ? address.district + "," : ""} ${address.city ? address.city + "," : ""} ${address.country ? address.city : ""}`;
  const detailAddress = `${address.detail ? address.detail : ""}`;
  const isDefault = address.isDefault;
  return (
    <div
      className={`flex flex-col gap-2 rounded-lg border p-4 ${isDefault ? "border-[#324E0F] border-2 bg-[#AAED56]" : ""}`}
    >
      {/* Top */}
      <div className="flex items-center justify-between gap-3 mb-1">
        {/* Left */}
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className={`font-bold ${isDefault ? "text-[#324E0F]" : "text-foreground"}`}
          >
            {address.fullName}
          </span>
          <span className="text-muted-foreground">|</span>
          <span
            className={`text-sm ${isDefault ? "text-[#324E0F]" : "text-muted-foreground"}`}
          >
            {address.phone}
          </span>
        </div>

        {/* Right */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              className={`p-1 rounded-md transition-colors flex-shrink-0 cursor-pointer ${isDefault ? "bg-[#324E0F] hover:bg-gray-500" : "bg-gray-200 hover:bg-gray-300"}`}
            >
              <MoreVertical
                className={`w-4 h-4 ${isDefault ? "text-[#AAED56]" : "text-muted-foreground"}`}
              />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {onEdit && (
              <DropdownMenuItem
                className="cursor-pointer"
                onClick={() => onEdit(address)}
              >
                Edit
              </DropdownMenuItem>
            )}
            {!address.isDefault && onSetDefault && (
              <DropdownMenuItem
                className="cursor-pointer"
                onClick={() => {
                  onSetDefault?.(address._id);
                }}
              >
                Set as default
              </DropdownMenuItem>
            )}
            {onDelete && (
              <DropdownMenuItem
                onClick={() => {
                  onDelete?.(address._id);
                }}
                className="text-destructive cursor-pointer focus:text-destructive"
              >
                Delete
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <p
        className={`text-md font-semibold leading-relaxed ${isDefault ? "text-[#324E0F]" : "text-muted-foreground"}`}
      >
        {fullAddress}
      </p>
      <p
        className={`text-md font-semibold leading-relaxed ${isDefault ? "text-[#324E0F]" : "text-muted-foreground"}`}
      >
        {detailAddress}
      </p>
    </div>
  );
};

export default AddressItems;
