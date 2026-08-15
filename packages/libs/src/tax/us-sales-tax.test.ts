import { US_STATES, computeSalesTax, salesTaxRateForState } from "./us-sales-tax";

describe("salesTaxRateForState", () => {
  it("returns the state base rate for a taxable state", () => {
    expect(salesTaxRateForState("CT")).toBe(6.35);
  });

  it("returns 0 for an exempt state", () => {
    expect(salesTaxRateForState("TX")).toBe(0);
  });

  it("returns 0 for null", () => {
    expect(salesTaxRateForState(null)).toBe(0);
  });

  it("returns 0 for undefined", () => {
    expect(salesTaxRateForState(undefined)).toBe(0);
  });

  it("returns 0 for an empty/whitespace string", () => {
    expect(salesTaxRateForState("")).toBe(0);
    expect(salesTaxRateForState("   ")).toBe(0);
  });

  it("is case-insensitive", () => {
    expect(salesTaxRateForState("ct")).toBe(6.35);
    expect(salesTaxRateForState("Ct")).toBe(6.35);
  });

  it("trims surrounding whitespace", () => {
    expect(salesTaxRateForState("  CT  ")).toBe(6.35);
  });

  it("uses PA's corrected 6.0% rate", () => {
    expect(salesTaxRateForState("PA")).toBe(6.0);
  });

  it("returns 0 for an unrecognized code", () => {
    expect(salesTaxRateForState("ZZ")).toBe(0);
  });

  it("excludes Florida, Texas, and Maryland (residential-exempt states)", () => {
    expect(salesTaxRateForState("FL")).toBe(0);
    expect(salesTaxRateForState("TX")).toBe(0);
    expect(salesTaxRateForState("MD")).toBe(0);
  });
});

describe("computeSalesTax", () => {
  it("computes tax + total for a taxable state (CT 6.35% on $200.00)", () => {
    const result = computeSalesTax(20000, "CT");
    expect(result).toEqual({ rateP: 6.35, taxCents: 1270, totalCents: 21270, taxable: true });
  });

  it("returns no tax for an exempt state", () => {
    const result = computeSalesTax(20000, "TX");
    expect(result).toEqual({ rateP: 0, taxCents: 0, totalCents: 20000, taxable: false });
  });

  it("returns no tax when state is null/unset", () => {
    const result = computeSalesTax(20000, null);
    expect(result).toEqual({ rateP: 0, taxCents: 0, totalCents: 20000, taxable: false });
  });

  it("accepts lower-case state input", () => {
    const result = computeSalesTax(20000, "ct");
    expect(result.taxable).toBe(true);
    expect(result.taxCents).toBe(1270);
  });

  it("rounds odd-cent results to the nearest whole cent", () => {
    // $33.33 subtotal at CT's 6.35% → 3333 * 0.0635 = 211.6455 cents → rounds to 212.
    const result = computeSalesTax(3333, "CT");
    expect(result.taxCents).toBe(212);
    expect(result.totalCents).toBe(3545);
  });
});

describe("US_STATES", () => {
  it("has 51 entries (50 states + DC)", () => {
    expect(US_STATES).toHaveLength(51);
  });

  it("has no duplicate codes", () => {
    const codes = US_STATES.map((s) => s.code);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it("includes every taxable state code", () => {
    const codes = new Set(US_STATES.map((s) => s.code));
    for (const code of ["CT", "HI", "IA", "KY", "LA", "MN", "NE", "NJ", "NM", "NY", "OH", "PA", "SD", "WV"]) {
      expect(codes.has(code)).toBe(true);
    }
  });
});
