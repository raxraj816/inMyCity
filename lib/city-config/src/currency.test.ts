import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { CURRENCIES, DEFAULT_CURRENCY, formatPrice } from "./currency";
import { SUPPORTED_CITIES, currencyFor, formatPriceForCity } from "./index";

describe("formatPrice", () => {
  it("groups rupees the Indian way", () => {
    // The reason this function exists rather than a bare `₹${amount}`: India groups by two
    // after the first three digits, and ₹1,200,000 reads as foreign.
    assert.equal(formatPrice(2200, CURRENCIES.INR), "₹2,200");
    assert.equal(formatPrice(28000, CURRENCIES.INR), "₹28,000");
    assert.equal(formatPrice(1200000, CURRENCIES.INR), "₹12,00,000");
  });

  it("groups dollars the American way", () => {
    assert.equal(formatPrice(1200000, CURRENCIES.USD), "$1,200,000");
    assert.equal(formatPrice(450, CURRENCIES.USD), "$450");
  });

  it("prints whole amounts without decimals", () => {
    assert.equal(formatPrice(0, CURRENCIES.INR), "₹0");
    assert.equal(formatPrice(150, CURRENCIES.USD), "$150");
  });

  it("keeps the cents on a fractional amount rather than rounding them away", () => {
    assert.equal(formatPrice(12.5, CURRENCIES.USD), "$12.50");
    assert.equal(formatPrice(99.99, CURRENCIES.USD), "$99.99");
  });
});

describe("currencyFor", () => {
  it("prices a city in its own currency", () => {
    assert.equal(currencyFor("Mumbai").code, "INR");
    assert.equal(currencyFor("San Francisco").code, "USD");
  });

  it("accepts an id as readily as a display name", () => {
    assert.equal(currencyFor("san-francisco").code, "USD");
    assert.equal(currencyFor("mumbai").code, "INR");
  });

  it("ignores case and stray whitespace", () => {
    assert.equal(currencyFor("  MUMBAI  ").code, "INR");
  });

  it("resolves the name content uses, not just the one the picker shows", () => {
    // Seeded New York rows say "New York City"; the city list calls it "New York".
    assert.equal(currencyFor("New York City").code, "USD");
  });

  it("lets a row's own currency win over the city around it", () => {
    assert.equal(currencyFor("Mumbai", "USD").code, "USD");
    assert.equal(currencyFor("New York", "INR").code, "INR");
  });

  it("falls back to the launch city rather than to dollars", () => {
    assert.equal(currencyFor("Reykjavik").code, DEFAULT_CURRENCY.code);
    assert.equal(currencyFor(null).code, "INR");
    assert.equal(currencyFor(undefined, undefined).code, "INR");
  });

  it("ignores a currency code it does not know", () => {
    assert.equal(currencyFor("Mumbai", "XYZ").code, "INR");
    assert.equal(currencyFor("New York", "").code, "USD");
  });

  it("has a currency for every supported city", () => {
    for (const city of SUPPORTED_CITIES) {
      assert.ok(
        CURRENCIES[city.currencyCode],
        `${city.name} declares ${city.currencyCode}, which is not in CURRENCIES`,
      );
    }
  });
});

describe("formatPriceForCity", () => {
  it("formats a price straight from a row's city and currency", () => {
    assert.equal(formatPriceForCity(28000, "Mumbai", "INR"), "₹28,000");
    assert.equal(formatPriceForCity(1100, "New York City", "USD"), "$1,100");
  });

  it("works for rows that carry a city but no currency, such as movies", () => {
    assert.equal(formatPriceForCity(350, "Mumbai"), "₹350");
  });
});
