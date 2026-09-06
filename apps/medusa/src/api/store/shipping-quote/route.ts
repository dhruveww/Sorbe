import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { SHIPPING_MODULE } from "../../../modules/shipping";

/**
 * Pincode -> fee + ETA. Called before payment, never after: a delivery charge
 * that appears at the last step is the single most common reason an Indian
 * checkout is abandoned.
 */
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const shipping: any = req.scope.resolve(SHIPPING_MODULE);

  const pincode = typeof req.query.pincode === "string" ? req.query.pincode.trim() : "";
  const cartValuePaise = Number.parseInt(String(req.query.cart_value_paise ?? "0"), 10) || 0;

  // Indian pincodes are exactly 6 digits and never start with 0.
  if (!/^[1-9]\d{5}$/.test(pincode)) {
    res.status(400).json({ message: "Enter a valid 6-digit pincode" });
    return;
  }

  const quote = await shipping.quote(pincode, cartValuePaise);
  if (!quote) {
    res.status(404).json({ message: "We do not deliver to this pincode yet", quote: null });
    return;
  }

  res.json({ quote });
};
