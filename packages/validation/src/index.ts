import { z } from "zod";

/**
 * Shared input validation. Used by BOTH the storefront routes and Medusa, so a
 * phone number that passes at checkout cannot fail in admin.
 *
 * Indian specifics that trip up generic validators:
 *  - Mobile numbers are exactly 10 digits and always start 6-9.
 *  - Users type them every possible way: "+91 98765 43210", "098765-43210".
 *    We accept all of that and normalise to a bare 10-digit string.
 *  - Pincodes are 6 digits and never start with 0.
 */

/** Strip everything that isn't a digit, then drop a +91 / 0 prefix. */
export function normalizeIndianPhone(input: string): string {
  const digits = input.replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) return digits.slice(2);
  if (digits.length === 11 && digits.startsWith("0")) return digits.slice(1);
  return digits;
}

/** Accepts messy user input, outputs a bare 10-digit number. */
export const indianPhoneSchema = z
  .string()
  .trim()
  .transform(normalizeIndianPhone)
  .refine((v) => /^[6-9]\d{9}$/.test(v), {
    message: "Enter a valid 10-digit Indian mobile number",
  });

/** Display/storage form for anything user-facing or sent to a provider. */
export function toE164(tenDigit: string): string {
  return `+91${tenDigit}`;
}

export const pincodeSchema = z
  .string()
  .trim()
  .refine((v) => /^[1-9]\d{5}$/.test(v), {
    message: "Enter a valid 6-digit pincode",
  });

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email("Enter a valid email address");

export const customerNameSchema = z
  .string()
  .trim()
  .min(2, "Name is too short")
  .max(80, "Name is too long");

/**
 * The three compulsory customer fields (spec hard constraint 3).
 * Phone is the real identity; email is stored and validated but is never the
 * thing that gates a purchase.
 */
export const customerIdentitySchema = z.object({
  name: customerNameSchema,
  phone: indianPhoneSchema,
  email: emailSchema,
});

export type CustomerIdentity = z.infer<typeof customerIdentitySchema>;

/** A saved address. `label` is the user's own name for it ("Home", "Office"). */
export const addressSchema = z.object({
  label: z.string().trim().min(1).max(40).optional(),
  name: customerNameSchema,
  phone: indianPhoneSchema,
  line1: z.string().trim().min(3, "Address is too short").max(200),
  line2: z.string().trim().max(200).optional(),
  city: z.string().trim().min(2).max(60),
  state: z.string().trim().min(2).max(60),
  pincode: pincodeSchema,
});

export type Address = z.infer<typeof addressSchema>;
