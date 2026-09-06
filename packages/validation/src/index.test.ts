import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { indianPhoneSchema, normalizeIndianPhone, pincodeSchema, toE164 } from "./index.js";

describe("normalizeIndianPhone", () => {
  it("accepts the many ways people type a number", () => {
    for (const input of [
      "9876543210",
      "+91 98765 43210",
      "+919876543210",
      "09876543210",
      "098765-43210",
      "(+91) 98765 43210",
    ]) {
      assert.equal(normalizeIndianPhone(input), "9876543210", `failed for ${input}`);
    }
  });
});

describe("indianPhoneSchema", () => {
  it("normalises valid input", () => {
    assert.equal(indianPhoneSchema.parse("+91 98765 43210"), "9876543210");
  });

  it("rejects numbers that do not start 6-9", () => {
    // 0-5 prefixes are landline/invalid ranges, not mobiles.
    assert.equal(indianPhoneSchema.safeParse("1234567890").success, false);
    assert.equal(indianPhoneSchema.safeParse("5876543210").success, false);
  });

  it("rejects wrong lengths", () => {
    assert.equal(indianPhoneSchema.safeParse("98765432").success, false);
    assert.equal(indianPhoneSchema.safeParse("98765432101").success, false);
  });
});

describe("toE164", () => {
  it("prefixes the country code", () => {
    assert.equal(toE164("9876543210"), "+919876543210");
  });
});

describe("pincodeSchema", () => {
  it("accepts a real pincode", () => {
    assert.equal(pincodeSchema.parse("400001"), "400001");
  });

  it("rejects a leading zero and wrong lengths", () => {
    assert.equal(pincodeSchema.safeParse("040001").success, false);
    assert.equal(pincodeSchema.safeParse("40001").success, false);
    assert.equal(pincodeSchema.safeParse("4000012").success, false);
  });
});
