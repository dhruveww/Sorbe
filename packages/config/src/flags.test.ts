import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getFlags } from "./flags.js";

const RAZORPAY_KEYS = { RAZORPAY_KEY_ID: "rzp_test_x", RAZORPAY_KEY_SECRET: "secret" };
const WA_KEYS = { WA_ACCESS_TOKEN: "tok", WA_PHONE_NUMBER_ID: "123" };

describe("payments: absence of the key IS the flag", () => {
  it("forces mock mode when Razorpay keys are missing, even if the flag says otherwise", () => {
    const flags = getFlags({ PAYMENTS_MOCK_MODE: "false" });
    assert.equal(flags.paymentsMockMode, true);
  });

  it("goes live only when keys exist AND the flag is off", () => {
    assert.equal(getFlags({ ...RAZORPAY_KEYS, PAYMENTS_MOCK_MODE: "false" }).paymentsMockMode, false);
  });

  it("respects an explicit mock request even when keys exist", () => {
    assert.equal(getFlags({ ...RAZORPAY_KEYS, PAYMENTS_MOCK_MODE: "true" }).paymentsMockMode, true);
  });

  it("defaults to mock when nothing is configured", () => {
    assert.equal(getFlags({}).paymentsMockMode, true);
  });
});

describe("whatsapp", () => {
  it("stays off without keys, whatever the flag says", () => {
    const flags = getFlags({ FEATURE_WHATSAPP_LIVE: "true" });
    assert.equal(flags.whatsappLive, false);
    assert.equal(flags.waProvider, "mock");
  });

  it("goes live with keys and the flag on", () => {
    const flags = getFlags({ ...WA_KEYS, FEATURE_WHATSAPP_LIVE: "true", WA_PROVIDER: "meta_cloud_api" });
    assert.equal(flags.whatsappLive, true);
    assert.equal(flags.waProvider, "meta_cloud_api");
  });
});

describe("otp channel fallback", () => {
  it("falls back to mock when email is requested without a Resend key", () => {
    assert.equal(getFlags({ OTP_CHANNEL: "email" }).otpChannel, "mock");
  });

  it("uses email when the key is present", () => {
    assert.equal(getFlags({ OTP_CHANNEL: "email", RESEND_API_KEY: "re_x" }).otpChannel, "email");
  });

  it("falls back to mock when whatsapp is requested but WhatsApp is not live", () => {
    assert.equal(getFlags({ OTP_CHANNEL: "whatsapp" }).otpChannel, "mock");
  });

  it("uses whatsapp once WhatsApp is genuinely live", () => {
    const flags = getFlags({ ...WA_KEYS, FEATURE_WHATSAPP_LIVE: "true", OTP_CHANNEL: "whatsapp" });
    assert.equal(flags.otpChannel, "whatsapp");
  });

  it("rejects an unknown channel rather than crashing", () => {
    assert.equal(getFlags({ OTP_CHANNEL: "carrier-pigeon" }).otpChannel, "mock");
  });
});

describe("shipping", () => {
  it("stays manual without Shiprocket credentials", () => {
    assert.equal(getFlags({ SHIPPING_PROVIDER: "shiprocket" }).shippingProvider, "manual");
  });

  it("uses shiprocket when credentials exist", () => {
    const flags = getFlags({
      SHIPPING_PROVIDER: "shiprocket",
      SHIPROCKET_EMAIL: "a@b.com",
      SHIPROCKET_PASSWORD: "pw",
    });
    assert.equal(flags.shippingProvider, "shiprocket");
  });
});

describe("defaults", () => {
  it("ships sensible defaults with an empty environment", () => {
    const flags = getFlags({});
    assert.equal(flags.codEnabled, true);
    assert.equal(flags.codMaxOrderPaise, 500_000);
    assert.equal(flags.wishlist, true);
    // Coming-soon pages start as blurbs, but the routes always exist.
    assert.equal(flags.eventsPageLive, false);
    assert.equal(flags.influencerPageLive, false);
    assert.equal(flags.myocPageLive, false);
  });

  it("ignores a non-numeric COD cap instead of producing NaN", () => {
    assert.equal(getFlags({ COD_MAX_ORDER_PAISE: "lots" }).codMaxOrderPaise, 500_000);
  });
});
