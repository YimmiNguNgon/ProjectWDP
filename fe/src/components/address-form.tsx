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

interface Province {
  code: number;
  name: string;
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
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [wards, setWards] = useState<Ward[]>([]);

  // Selection State (codes)
  const [selectedProvinceCode, setSelectedProvinceCode] = useState<
    number | null
  >(null);
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

  // Fetch Provinces on Mount
  useEffect(() => {
    const fetchProvinces = async () => {
      try {
        const response = await axios.get(
          "https://provinces.open-api.vn/api/?depth=1",
        );
        setProvinces(response.data);
      } catch (error) {
        console.error("Failed to fetch provinces", error);
      }
    };
    fetchProvinces();
  }, []);

  // Fetch Districts when Province changes
  useEffect(() => {
    if (selectedProvinceCode) {
      const fetchDistricts = async () => {
        try {
          const response = await axios.get(
            `https://provinces.open-api.vn/api/p/${selectedProvinceCode}?depth=2`,
          );
          setDistricts(response.data.districts);
        } catch (error) {
          console.error("Failed to fetch districts", error);
        }
      };
      fetchDistricts();
      setWards([]); // Reset wards
    } else {
      setDistricts([]);
      setWards([]);
    }
  }, [selectedProvinceCode]);

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
        setSelectedProvinceCode(null);
        setSelectedDistrictCode(null);
      }
    }
  }, [initialData, open, form]);

  // Sync Initial Data with Dropdowns (Reverse Lookup)
  useEffect(() => {
    if (open && initialData && provinces.length > 0) {
      const province = provinces.find((p) => p.name === initialData.city);
      if (province) {
        setSelectedProvinceCode(province.code);
      }
    }
  }, [open, initialData, provinces]);

  // Sync District after Districts load (for Edit mode)
  useEffect(() => {
    if (open && initialData && districts.length > 0 && selectedProvinceCode) {
      const district = districts.find((d) => d.name === initialData.district);
      if (district) {
        setSelectedDistrictCode(district.code);
      }
    }
  }, [open, initialData, districts, selectedProvinceCode]);

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

            {/* City, District, Ward - 3 columns in 1 row */}
            <div className="grid grid-cols-3 gap-2 w-full">
              <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>City / Province</FormLabel>
                    <Select
                      onValueChange={(value) => {
                        field.onChange(value);
                        const province = provinces.find(
                          (p) => p.name === value,
                        );
                        if (province) {
                          setSelectedProvinceCode(province.code);
                          // Reset district and ward when province changes
                          form.setValue("district", "");
                          form.setValue("ward", "");
                          setSelectedDistrictCode(null);
                        }
                      }}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger className="rounded-md w-full cursor-pointer">
                          <SelectValue placeholder="Select City" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {provinces.map((province) => (
                          <SelectItem
                            className="cursor-pointer"
                            key={province.code}
                            value={province.name}
                          >
                            {province.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* District */}
              <FormField
                control={form.control}
                name="district"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>District</FormLabel>
                    <Select
                      disabled={!selectedProvinceCode}
                      onValueChange={(value) => {
                        field.onChange(value);
                        const district = districts.find(
                          (d) => d.name === value,
                        );
                        if (district) {
                          setSelectedDistrictCode(district.code);
                          // Reset ward when district changes
                          form.setValue("ward", "");
                        }
                      }}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger className="rounded-md w-full cursor-pointer">
                          <SelectValue placeholder="Select District" />
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

              {/* Ward */}
              <FormField
                control={form.control}
                name="ward"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ward</FormLabel>
                    <Select
                      disabled={!selectedDistrictCode}
                      onValueChange={field.onChange}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger className="rounded-md w-full cursor-pointer">
                          <SelectValue placeholder="Select Ward" />
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
