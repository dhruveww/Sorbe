import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  formatPaise,
  paiseToRupees,
  rupeesToPaise,
  splitGstByPlaceOfSupply,
  splitGstInclusive,
} from "./money.js";

describe("rupeesToPaise", () => {
  it("converts whole rupees", () => {
    assert.equal(rupeesToPaise(1299), 129900);
  });

  it("rounds to the nearest paise rather than truncating", () => {
    // The classic float trap: 1299.999 * 100 = 129999.89999999999
    assert.equal(rupeesToPaise(1299.999), 130000);
    assert.equal(rupeesToPaise(0.005), 1);
  });

  it("rejects non-finite input", () => {
    assert.throws(() => rupeesToPaise(Number.NaN), TypeError);
  });
});

describe("paiseToRupees", () => {
  it("round-trips with rupeesToPaise", () => {
    assert.equal(paiseToRupees(rupeesToPaise(1299.5)), 1299.5);
  });

  it("rejects fractional paise", () => {
    assert.throws(() => paiseToRupees(100.5), TypeError);
  });
});

describe("formatPaise", () => {
  it("omits decimals for whole-rupee amounts", () => {
    assert.equal(formatPaise(129900), "₹1,299");
  });

  it("shows decimals when there are paise", () => {
    assert.equal(formatPaise(129950), "₹1,299.50");
  });

  it("uses Indian lakh grouping, not thousands", () => {
    // Rs 1,23,456 — NOT the western "123,456".
    assert.equal(formatPaise(rupeesToPaise(123456)), "₹1,23,456");
  });

  it("can be forced to show decimals", () => {
    assert.equal(formatPaise(129900, { showDecimals: true }), "₹1,299.00");
  });
});

describe("splitGstInclusive", () => {
  it("splits an inclusive total so base + tax equals the original exactly", () => {
    const total = 129900; // Rs 1,299 inclusive of 18%
    const { basePaise, taxPaise } = splitGstInclusive(total, 18);
    assert.equal(basePaise + taxPaise, total);
    assert.equal(basePaise, 110085);
    assert.equal(taxPaise, 19815);
  });

  it("never loses a paise, across a range of awkward totals", () => {
    for (const total of [1, 7, 99, 12345, 99999, 1000003]) {
      const { basePaise, taxPaise } = splitGstInclusive(total, 18);
      assert.equal(basePaise + taxPaise, total, `failed for total=${total}`);
    }
  });

  it("handles a zero rate", () => {
    assert.deepEqual(splitGstInclusive(5000, 0), { basePaise: 5000, taxPaise: 0 });
  });
});

describe("splitGstByPlaceOfSupply", () => {
  it("uses IGST for inter-state delivery", () => {
    assert.deepEqual(splitGstByPlaceOfSupply(19815, false), {
      cgstPaise: 0,
      sgstPaise: 0,
      igstPaise: 19815,
    });
  });

  it("halves into CGST/SGST for intra-state delivery without losing a paise", () => {
    // Odd amount: the remainder must land somewhere, not vanish.
    const { cgstPaise, sgstPaise, igstPaise } = splitGstByPlaceOfSupply(19815, true);
    assert.equal(cgstPaise + sgstPaise, 19815);
    assert.equal(igstPaise, 0);
    assert.equal(cgstPaise, 9907);
    assert.equal(sgstPaise, 9908);
  });
});
