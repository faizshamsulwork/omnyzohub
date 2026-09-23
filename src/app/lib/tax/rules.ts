// Malaysian capital allowance rule registry.
//
// This is the single source of truth for allowance rates. Rule codes are
// plain strings (not a DB enum) so a new rule can be added here without a
// migration — see the note in the assets migration file.
//
// IMPORTANT: nothing in this app is an LHDN filing system. Every rate here
// is for internal estimation only and every calculated figure downstream
// must be presented as estimated/indicative, subject to eligibility and
// accountant/tax adviser confirmation -- see getTaxDisclaimer() at the
// bottom of this file.

export type TaxRuleCode =
  | "PLANT_MACHINERY_STANDARD"
  | "HEAVY_MACHINERY_STANDARD"
  | "OTHER_ASSET_STANDARD"
  | "ICT_ACA_2024"
  | "ICT_ACA_2026_OPTIONAL"
  | "SMALL_VALUE_ASSET"
  | "NOT_ELIGIBLE";

export type TaxRuleKind = "standard_ia_aa" | "small_value_special" | "not_eligible";

export interface TaxRule {
  code: TaxRuleCode;
  label: string;
  kind: TaxRuleKind;
  /** Initial allowance rate, e.g. 0.20 for 20%. Only standard_ia_aa rules use this. */
  initialAllowanceRate?: number;
  /** Annual allowance rate, e.g. 0.14 for 14%. Only standard_ia_aa rules use this. */
  annualAllowanceRate?: number;
  authorityReference?: string;
  /**
   * True if this code must never be auto-assigned/auto-confirmed by the
   * mapping layer (getSuggestedTaxRule) -- it can only become the asset's
   * confirmed rule via an explicit user action.
   */
  requiresManualClassificationConfirmation: boolean;
  notes?: string;
}

export const TAX_RULES: Record<TaxRuleCode, TaxRule> = {
  PLANT_MACHINERY_STANDARD: {
    code: "PLANT_MACHINERY_STANDARD",
    label: "Plant & Machinery",
    kind: "standard_ia_aa",
    initialAllowanceRate: 0.2,
    annualAllowanceRate: 0.14,
    authorityReference: "Income Tax Act 1967, Schedule 3 - general plant & machinery rate",
    requiresManualClassificationConfirmation: false,
  },
  HEAVY_MACHINERY_STANDARD: {
    code: "HEAVY_MACHINERY_STANDARD",
    label: "Motor Vehicle / Heavy Machinery",
    kind: "standard_ia_aa",
    initialAllowanceRate: 0.2,
    annualAllowanceRate: 0.2,
    authorityReference: "Income Tax Act 1967, Schedule 3 - heavy machinery / motor vehicle rate",
    requiresManualClassificationConfirmation: false,
  },
  OTHER_ASSET_STANDARD: {
    code: "OTHER_ASSET_STANDARD",
    label: "Other Qualifying Asset",
    kind: "standard_ia_aa",
    initialAllowanceRate: 0.2,
    annualAllowanceRate: 0.1,
    authorityReference: "Income Tax Act 1967, Schedule 3 - other qualifying plant rate",
    requiresManualClassificationConfirmation: false,
  },
  ICT_ACA_2024: {
    code: "ICT_ACA_2024",
    label: "ICT Equipment (Accelerated CA)",
    kind: "standard_ia_aa",
    initialAllowanceRate: 0.4,
    annualAllowanceRate: 0.2,
    authorityReference: "P.U. (A) 328/2024",
    requiresManualClassificationConfirmation: true,
    notes:
      "A category label of \"ICT Equipment\" is not by itself proof an asset " +
      "qualifies (e.g. a smartphone's eligibility can be contestable). Always " +
      "needs explicit confirmation before being included in confirmed totals.",
  },
  ICT_ACA_2026_OPTIONAL: {
    code: "ICT_ACA_2026_OPTIONAL",
    label: "ICT Equipment (Budget 2026 Optional Treatment)",
    kind: "standard_ia_aa",
    // Placeholder rates reflecting a full claim spread over 2 years, pending
    // finalized legislation. Do not treat as authoritative.
    initialAllowanceRate: 0.5,
    annualAllowanceRate: 0.5,
    authorityReference: "Budget 2026 proposal (not yet in force / not yet confirmed) - VERIFY before use",
    requiresManualClassificationConfirmation: true,
    notes:
      "Future-ready placeholder only. Must never be auto-applied or used as a " +
      "default in place of ICT_ACA_2024 -- eligibility, taxpayer type and " +
      "qualifying expenditure rules need separate confirmation once the " +
      "measure is finalized.",
  },
  SMALL_VALUE_ASSET: {
    code: "SMALL_VALUE_ASSET",
    label: "Small Value Asset",
    kind: "small_value_special",
    authorityReference: "Income Tax Rules - Small Value Asset special allowance",
    requiresManualClassificationConfirmation: false,
    notes:
      "100% special allowance in the YA the asset is placed in use, subject " +
      "to the RM2,000-per-asset threshold, the taxpayer's annual aggregate " +
      "limit, and the asset otherwise being a qualifying capital asset " +
      "(a short-life consumable priced under RM2,000 is not automatically a " +
      "capital Small Value Asset).",
  },
  NOT_ELIGIBLE: {
    code: "NOT_ELIGIBLE",
    label: "Not Eligible",
    kind: "not_eligible",
    requiresManualClassificationConfirmation: false,
    notes: "Explicitly confirmed as not qualifying for any capital allowance.",
  },
};

export function getTaxRule(code: TaxRuleCode | string | null | undefined): TaxRule | undefined {
  if (!code) return undefined;
  return TAX_RULES[code as TaxRuleCode];
}

/** Malaysian Small Value Asset qualifying threshold. Per-asset. RM2,000, not RM1,000. */
export const SMALL_VALUE_ASSET_THRESHOLD = 2000;

export interface TaxProfile {
  /** Per-asset qualifying expenditure threshold for Small Value Asset treatment. */
  smallValueAssetThreshold: number;
  /**
   * Aggregate annual cap on Small Value Asset special allowance claims.
   * Conservative default (RM20,000) -- Omnyzo is NOT assumed to qualify for
   * the unlimited exemption available to certain incorporated SMCs unless
   * this is explicitly reconfigured with that status confirmed.
   */
  smallValueAnnualLimit: number;
}

export const DEFAULT_TAX_PROFILE: TaxProfile = {
  smallValueAssetThreshold: SMALL_VALUE_ASSET_THRESHOLD,
  smallValueAnnualLimit: 20000,
};

export const TAX_ESTIMATE_DISCLAIMER =
  "Tax estimates are for internal planning and may be subject to eligibility and tax adviser confirmation.";
