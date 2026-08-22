/**
 * What money looks like in each city the app supports.
 *
 * Prices used to be formatted with a per-screen conditional — `const currencySymbol =
 * isLocal ? "₹" : "$"` — copied into a dozen screens, and simply absent from the deal and
 * event cards, which priced Mumbai in dollars. Currency is a property of the city, so it
 * lives here with the rest of the city data: adding a city means adding its currency, not
 * editing a screen.
 */
export type Currency = {
  /** ISO 4217 code, matching the `currency` column on hotels and activities. */
  code: string;
  /** What the app prints in front of an amount. */
  symbol: string;
  /**
   * Locale used for digit grouping. India groups by two after the first three digits —
   * ₹12,00,000, not ₹1,200,000 — and getting that wrong reads as foreign immediately.
   */
  locale: string;
};

export const CURRENCIES: Record<string, Currency> = {
  INR: { code: "INR", symbol: "₹", locale: "en-IN" },
  USD: { code: "USD", symbol: "$", locale: "en-US" },
};

/** Used for anything the city list does not recognise: the launch city prices in rupees. */
export const DEFAULT_CURRENCY: Currency = CURRENCIES.INR;

/**
 * An amount as the city writes it: "₹2,200", "₹28,000", "$1,100".
 *
 * Whole amounts print without decimals — every price in the catalogue is a whole rupee, and
 * "₹2,200.00" is not how anyone says it — while fractional amounts keep two, so a $12.50
 * ticket does not silently become $13.
 */
export function formatPrice(amount: number, currency: Currency): string {
  const fractionDigits = Number.isInteger(amount) ? 0 : 2;
  const formatted = amount.toLocaleString(currency.locale, {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });
  return `${currency.symbol}${formatted}`;
}
