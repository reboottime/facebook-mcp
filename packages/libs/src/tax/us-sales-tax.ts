/**
 * US residential-cleaning sales tax — canonical table + helpers.
 *
 * Listo's customer is a residential cleaning shop, so taxability here means
 * RESIDENTIAL cleaning specifically. 17 states + DC tax janitorial/cleaning
 * services broadly, but Florida, Texas, and Maryland tax only commercial /
 * nonresidential cleaning (residential is exempt in those three) — they are
 * deliberately excluded from this table. The 14 states below apply tax to
 * residential cleaning; every other state/territory is untaxed.
 *
 * Rates are STATE BASE rates only. Local (county/city) surtaxes vary by
 * street address and require an address→jurisdiction rate database to
 * encode correctly — out of scope for a free-tier bootstrap. The owner is
 * responsible for the final rate; Listo applies the state base rate as a
 * reasonable default.
 *
 * Pennsylvania note: cleaning services are taxed at PA's 6.0% state sales
 * tax rate (not the oft-cited 5.75%, which is a different figure).
 *
 * Sources: ISSA "Sales Taxes on Cleaning Services"; Avalara service-
 * taxability guide; Tax Foundation 2026 state sales-tax rates.
 */
export const RESIDENTIAL_CLEANING_SALES_TAX: Readonly<Record<string, number>> = {
  CT: 6.35,
  HI: 4.0,
  IA: 6.0,
  KY: 6.0,
  LA: 5.0,
  MN: 6.875,
  NE: 5.5,
  NJ: 6.625,
  NM: 4.875,
  NY: 4.0,
  OH: 5.75,
  PA: 6.0,
  SD: 4.2,
  WV: 6.0,
};

/**
 * State base sales-tax rate (%) for residential cleaning. Case-insensitive,
 * trimmed. Returns 0 for exempt states, unrecognized codes, and null/undefined
 * (no state set — the safe default).
 */
export function salesTaxRateForState(state: string | null | undefined): number {
  if (!state) return 0;
  const code = state.trim().toUpperCase();
  if (!code) return 0;
  return RESIDENTIAL_CLEANING_SALES_TAX[code] ?? 0;
}

export interface SalesTaxResult {
  /** The rate (%) applied — 0 when exempt/unset. */
  rateP: number;
  /** Tax amount in cents, rounded to the nearest whole cent. */
  taxCents: number;
  /** subtotalCents + taxCents. */
  totalCents: number;
  /** Whether any tax was applied (rateP > 0). */
  taxable: boolean;
}

/** Computes tax + total (in cents) for a subtotal and a state. Rounds to whole cents. */
export function computeSalesTax(subtotalCents: number, state: string | null | undefined): SalesTaxResult {
  const rateP = salesTaxRateForState(state);
  const taxCents = rateP > 0 ? Math.round((subtotalCents * rateP) / 100) : 0;
  return { rateP, taxCents, totalCents: subtotalCents + taxCents, taxable: rateP > 0 };
}

/** All 50 states + DC, USPS code + full name — for state-select fields. */
export const US_STATES: ReadonlyArray<{ code: string; name: string }> = [
  { code: "AL", name: "Alabama" },
  { code: "AK", name: "Alaska" },
  { code: "AZ", name: "Arizona" },
  { code: "AR", name: "Arkansas" },
  { code: "CA", name: "California" },
  { code: "CO", name: "Colorado" },
  { code: "CT", name: "Connecticut" },
  { code: "DE", name: "Delaware" },
  { code: "DC", name: "District of Columbia" },
  { code: "FL", name: "Florida" },
  { code: "GA", name: "Georgia" },
  { code: "HI", name: "Hawaii" },
  { code: "ID", name: "Idaho" },
  { code: "IL", name: "Illinois" },
  { code: "IN", name: "Indiana" },
  { code: "IA", name: "Iowa" },
  { code: "KS", name: "Kansas" },
  { code: "KY", name: "Kentucky" },
  { code: "LA", name: "Louisiana" },
  { code: "ME", name: "Maine" },
  { code: "MD", name: "Maryland" },
  { code: "MA", name: "Massachusetts" },
  { code: "MI", name: "Michigan" },
  { code: "MN", name: "Minnesota" },
  { code: "MS", name: "Mississippi" },
  { code: "MO", name: "Missouri" },
  { code: "MT", name: "Montana" },
  { code: "NE", name: "Nebraska" },
  { code: "NV", name: "Nevada" },
  { code: "NH", name: "New Hampshire" },
  { code: "NJ", name: "New Jersey" },
  { code: "NM", name: "New Mexico" },
  { code: "NY", name: "New York" },
  { code: "NC", name: "North Carolina" },
  { code: "ND", name: "North Dakota" },
  { code: "OH", name: "Ohio" },
  { code: "OK", name: "Oklahoma" },
  { code: "OR", name: "Oregon" },
  { code: "PA", name: "Pennsylvania" },
  { code: "RI", name: "Rhode Island" },
  { code: "SC", name: "South Carolina" },
  { code: "SD", name: "South Dakota" },
  { code: "TN", name: "Tennessee" },
  { code: "TX", name: "Texas" },
  { code: "UT", name: "Utah" },
  { code: "VT", name: "Vermont" },
  { code: "VA", name: "Virginia" },
  { code: "WA", name: "Washington" },
  { code: "WV", name: "West Virginia" },
  { code: "WI", name: "Wisconsin" },
  { code: "WY", name: "Wyoming" },
];
