/**
 * GST state codes, keyed by state name.
 *
 * Place of supply is derived from the STATE the customer typed, not from the
 * pincode. Pincode ranges straddle borders (UP/Uttarakhand overlap around
 * 24x-26x, for one), and guessing wrong flips an invoice between CGST+SGST and
 * IGST — a compliance problem, not a display bug. The state field is
 * unambiguous and is what appears on the invoice anyway.
 */
const STATE_CODES: Record<string, string> = {
  "jammu and kashmir": "01",
  "jammu & kashmir": "01",
  "himachal pradesh": "02",
  punjab: "03",
  chandigarh: "04",
  uttarakhand: "05",
  uttaranchal: "05",
  haryana: "06",
  delhi: "07",
  "new delhi": "07",
  rajasthan: "08",
  "uttar pradesh": "09",
  bihar: "10",
  sikkim: "11",
  "arunachal pradesh": "12",
  nagaland: "13",
  manipur: "14",
  mizoram: "15",
  tripura: "16",
  meghalaya: "17",
  assam: "18",
  "west bengal": "19",
  jharkhand: "20",
  odisha: "21",
  orissa: "21",
  chhattisgarh: "22",
  "madhya pradesh": "23",
  gujarat: "24",
  "dadra and nagar haveli and daman and diu": "26",
  maharashtra: "27",
  karnataka: "29",
  goa: "30",
  lakshadweep: "31",
  kerala: "32",
  "tamil nadu": "33",
  puducherry: "34",
  pondicherry: "34",
  "andaman and nicobar islands": "35",
  telangana: "36",
  "andhra pradesh": "37",
  ladakh: "38",
};

export function gstStateCode(stateName: string | null | undefined): string | null {
  if (!stateName) return null;
  const key = stateName.trim().toLowerCase().replace(/\s+/g, " ");
  return STATE_CODES[key] ?? null;
}

/**
 * Same state means CGST + SGST; different state means IGST.
 *
 * When either side is unknown we fall back to IGST, because charging IGST on
 * what should have been an intra-state sale is correctable in a return, while
 * splitting into CGST/SGST for the wrong state files tax to a state that is
 * owed nothing.
 */
export function isIntraState(
  sellerStateCode: string | null,
  buyerStateCode: string | null,
): boolean {
  if (!sellerStateCode || !buyerStateCode) return false;
  return sellerStateCode === buyerStateCode;
}
