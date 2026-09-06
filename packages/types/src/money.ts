/**
 * Money is ALWAYS an integer number of paise. Never a float, never rupees.
 *
 * Medusa's price module stores INR amounts in the currency's minor unit, so
 * these helpers are the only place rupee <-> paise conversion happens. Doing it
 * ad hoc in components is how a store ends up charging Rs 1,299.9999999.
 */

/** Smallest INR unit. 100 paise = Rs 1. */
export type Paise = number;

const PAISE_PER_RUPEE = 100;

/**
 * Convert a rupee amount (as typed by an admin, e.g. 1299.5) to paise.
 * Rounds to the nearest paise — 1299.999 becomes 130000, not 129999.
 */
export function rupeesToPaise(rupees: number): Paise {
  if (!Number.isFinite(rupees)) {
    throw new TypeError(`rupeesToPaise: expected a finite number, got ${rupees}`);
  }
  return Math.round(rupees * PAISE_PER_RUPEE);
}

/** Convert paise to a rupee number. For display only — never for arithmetic. */
export function paiseToRupees(paise: Paise): number {
  assertPaise(paise);
  return paise / PAISE_PER_RUPEE;
}

/**
 * Format paise for display, e.g. 129950 -> "₹1,299.50".
 * Uses the Indian grouping convention (1,29,950 style) via en-IN.
 */
export function formatPaise(paise: Paise, options?: { showDecimals?: boolean }): string {
  assertPaise(paise);
  // Whole-rupee amounts read better without ".00" on a product grid.
  const showDecimals = options?.showDecimals ?? paise % PAISE_PER_RUPEE !== 0;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: showDecimals ? 2 : 0,
    maximumFractionDigits: showDecimals ? 2 : 0,
  }).format(paise / PAISE_PER_RUPEE);
}

/**
 * Split a GST-INCLUSIVE total into base + tax.
 *
 * We price inclusive (the customer sees one number and pays exactly that), so
 * the invoice has to work backwards: base = total / (1 + rate).
 * Returns integers that always re-add to the original total, so an invoice can
 * never be off by a paise.
 */
export function splitGstInclusive(
  totalPaise: Paise,
  gstRatePercent: number,
): { basePaise: Paise; taxPaise: Paise } {
  assertPaise(totalPaise);
  if (!Number.isFinite(gstRatePercent) || gstRatePercent < 0) {
    throw new RangeError(`splitGstInclusive: invalid GST rate ${gstRatePercent}`);
  }
  const basePaise = Math.round(totalPaise / (1 + gstRatePercent / 100));
  // Derive tax by subtraction so base + tax === total exactly, always.
  return { basePaise, taxPaise: totalPaise - basePaise };
}

/**
 * Split GST into CGST/SGST (same state) or IGST (different state).
 * Place of supply is decided by the delivery pincode's state, not the address text.
 */
export function splitGstByPlaceOfSupply(
  taxPaise: Paise,
  isIntraState: boolean,
): { cgstPaise: Paise; sgstPaise: Paise; igstPaise: Paise } {
  assertPaise(taxPaise);
  if (!isIntraState) {
    return { cgstPaise: 0, sgstPaise: 0, igstPaise: taxPaise };
  }
  // Halve without losing a paise to rounding: SGST absorbs the remainder.
  const cgstPaise = Math.floor(taxPaise / 2);
  return { cgstPaise, sgstPaise: taxPaise - cgstPaise, igstPaise: 0 };
}

function assertPaise(value: number): void {
  if (!Number.isInteger(value)) {
    throw new TypeError(`Money must be an integer number of paise, got ${value}`);
  }
}
