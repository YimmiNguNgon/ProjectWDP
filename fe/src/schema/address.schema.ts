// schemas/address.schema.ts
import { z } from "zod";

export const addressSchema = z.object({
  fullName: z.string().min(1, "Full name is required"),

  phone: z.string().regex(/^\d{10}$/, "Phone number must be exactly 10 digits"),

  country: z.string().min(1, "Country is required"),

  city: z.string().optional(),
  district: z.string().optional(),
  ward: z.string().optional(),
  street: z.string().optional(),
  detail: z.string().optional(),
});

export type AddressFormValues = z.infer<typeof addressSchema>;
