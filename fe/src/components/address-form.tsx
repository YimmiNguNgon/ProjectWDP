import type { Address, CreateAddressPayload } from "@/api/user";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

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

const AddressForm = ({
  open,
  onClose,
  onSubmit,
  initialData,
}: AddressFormProps) => {
  const isEdit = Boolean(initialData);

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

  useEffect(() => {
    if (open) {
      if (initialData) {
        form.reset({
          fullName: initialData.fullName,
          phone: initialData.phone,
          country: initialData.country || "",
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
          country: "",
          city: "",
          district: "",
          ward: "",
          street: "",
          detail: "",
        });
      }
    }
  }, [initialData, open, form]);

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
      <DialogContent className="max-w-lg">
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
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* City / District / Ward */}
            <div className="grid grid-cols-3 gap-2">
              <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input
                        className="rounded-md"
                        placeholder="City"
                        {...field}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="district"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input
                        className="rounded-md"
                        placeholder="District"
                        {...field}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="ward"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input
                        className="rounded-md"
                        placeholder="Ward"
                        {...field}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            {/* Street */}
            <FormField
              control={form.control}
              name="street"
              render={({ field }) => (
                <FormItem>
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
