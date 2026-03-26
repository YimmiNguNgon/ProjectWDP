import type { Address, CreateAddressPayload } from "@/api/user";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import axios from "axios";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";

import { addressSchema, type AddressFormValues } from "@/schema/address.schema";

interface AddressFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: CreateAddressPayload) => Promise<void>;
  initialData?: Address | null;
}

interface District {
  code: number;
  name: string;
}

interface Ward {
  code: number;
  name: string;
}

const AddressForm = ({
  open,
  onClose,
  onSubmit,
  initialData,
}: AddressFormProps) => {
  const isEdit = Boolean(initialData);

  // API Data State
  const [districts, setDistricts] = useState<District[]>([]);
  const [wards, setWards] = useState<Ward[]>([]);

  // Selection State (codes)
  const [selectedDistrictCode, setSelectedDistrictCode] = useState<
    number | null
  >(null);

  const form = useForm<AddressFormValues>({
    resolver: zodResolver(addressSchema),
    defaultValues: {
      fullName: "",
      phone: "",
      country: "",
      city: "",
      district: "",
      ward: "",
      street: "",
      detail: "",
    },
  });

  // Fetch quận/huyện Hà Nội on Mount
  useEffect(() => {
    const fetchDistricts = async () => {
      try {
        const response = await axios.get(
          "https://provinces.open-api.vn/api/p/1?depth=2",
        );
        setDistricts(response.data.districts);
      } catch (error) {
        console.error("Failed to fetch Hanoi districts", error);
      }
    };
    fetchDistricts();
  }, []);

  // Fetch Wards when District changes
  useEffect(() => {
    if (selectedDistrictCode) {
      const fetchWards = async () => {
        try {
          const response = await axios.get(
            `https://provinces.open-api.vn/api/d/${selectedDistrictCode}?depth=2`,
          );
          setWards(response.data.wards);
        } catch (error) {
          console.error("Failed to fetch wards", error);
        }
      };
      fetchWards();
    } else {
      setWards([]);
    }
  }, [selectedDistrictCode]);

  // Initialize Form & Pre-fill logic depending on initialData
  useEffect(() => {
    if (open) {
      if (initialData) {
        form.reset({
          fullName: initialData.fullName,
          phone: initialData.phone,
          country: initialData.country || "Vietnam",
          city: initialData.city || "",
          district: initialData.district || "",
          ward: initialData.ward || "",
          street: initialData.street || "",
          detail: initialData.detail || "",
        });
      } else {
        form.reset({
          fullName: "",
          phone: "",
          country: "Vietnam",
          city: "",
          district: "",
          ward: "",
          street: "",
          detail: "",
        });
        setSelectedDistrictCode(null);
      }
    }
  }, [initialData, open, form]);

  // Sync Initial Data with Dropdowns (Reverse Lookup)
  useEffect(() => {
    if (open && initialData && districts.length > 0) {
      const district = districts.find((d) => d.name === initialData.city);
      if (district) {
        setSelectedDistrictCode(district.code);
      }
    }
  }, [open, initialData, districts]);

  const handleSubmit = async (values: AddressFormValues) => {
    try {
      await onSubmit(values);
      toast.success(isEdit ? "Address updated" : "Address created");
      onClose();
    } catch (error) {
      toast.error("Failed to create / update address");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="min-w-xl">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Edit address" : "Add new address"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-3"
          >
            {/* Full name */}
            <FormField
              control={form.control}
              name="fullName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full name</FormLabel>
                  <FormControl>
                    <Input
                      className="rounded-md"
                      placeholder="Nguyen Van A"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Phone */}
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone</FormLabel>
                  <FormControl>
                    <Input
                      className="rounded-md"
                      placeholder="0123456789"
                      maxLength={10}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Country */}
            <FormField
              control={form.control}
              name="country"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Country</FormLabel>
                  <FormControl>
                    <Input
                      className="rounded-md"
                      placeholder="Vietnam"
                      {...field}
                      disabled // Lock country to Vietnam as API is Vietnam-specific
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Quận/Huyện, Phường/Xã - 2 columns in 1 row */}
            <div className="grid grid-cols-2 gap-2 w-full">
              <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quận/Huyện</FormLabel>
                    <Select
                      onValueChange={(value) => {
                        field.onChange(value);
                        const district = districts.find(
                          (d) => d.name === value,
                        );
                        if (district) {
                          setSelectedDistrictCode(district.code);
                          // Reset district (ward level) and ward when quận changes
                          form.setValue("district", "");
                          form.setValue("ward", "");
                        }
                      }}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger className="rounded-md w-full cursor-pointer">
                          <SelectValue placeholder="Chọn Quận/Huyện" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {districts.map((district) => (
                          <SelectItem
                            className="cursor-pointer"
                            key={district.code}
                            value={district.name}
                          >
                            {district.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Phường/Xã */}
              <FormField
                control={form.control}
                name="district"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phường/Xã</FormLabel>
                    <Select
                      disabled={!selectedDistrictCode}
                      onValueChange={(value) => {
                        field.onChange(value);
                        form.setValue("ward", "");
                      }}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger className="rounded-md w-full cursor-pointer">
                          <SelectValue placeholder="Chọn Phường/Xã" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {wards.map((ward) => (
                          <SelectItem
                            className="cursor-pointer"
                            key={ward.code}
                            value={ward.name}
                          >
                            {ward.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

            </div>

            {/* Street - Full width */}
            <FormField
              control={form.control}
              name="street"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Street</FormLabel>
                  <FormControl>
                    <Input
                      className="rounded-md"
                      placeholder="Street / House number"
                      {...field}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            {/* Detail */}
            <FormField
              control={form.control}
              name="detail"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Detail</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Address detail (optional)"
                      {...field}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                className="cursor-pointer"
                onClick={onClose}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="cursor-pointer bg-[#AAED56] text-[#324E0F] hover:bg-[#8feb1d]"
              >
                {isEdit ? "Save changes" : "Create address"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default AddressForm;
