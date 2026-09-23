// Maps the existing free-text `assets.category` values (the LHDN Category
// dropdown on the Add/Edit Asset form) to a *suggested* tax rule code.
//
// This is a suggestion layer only. It never writes tax_rule_confirmed=true
// and it must never be treated as a confirmed classification -- see
// TAX_RULES[code].requiresManualClassificationConfirmation in rules.ts and
// getAssetTaxStatus() in capitalAllowance.ts.
//
// Existing category strings are never rewritten or destroyed by this
// mapping; it only reads `category` to produce a suggestion alongside it.

import { SMALL_VALUE_ASSET_THRESHOLD, type TaxRuleCode } from "./rules";

interface CategoryMappingRule {
  /** Matches when the category text contains this, case-insensitively. */
  matches: string;
  suggestedRuleCode: TaxRuleCode;
}

// Order matters: first match wins.
const CATEGORY_MAPPING_RULES: CategoryMappingRule[] = [
  { matches: "small value", suggestedRuleCode: "SMALL_VALUE_ASSET" },
  { matches: "ict", suggestedRuleCode: "ICT_ACA_2024" },
  { matches: "motor vehicle", suggestedRuleCode: "HEAVY_MACHINERY_STANDARD" },
  { matches: "heavy machinery", suggestedRuleCode: "HEAVY_MACHINERY_STANDARD" },
  { matches: "plant & machinery", suggestedRuleCode: "PLANT_MACHINERY_STANDARD" },
  { matches: "plant and machinery", suggestedRuleCode: "PLANT_MACHINERY_STANDARD" },
  { matches: "furniture", suggestedRuleCode: "OTHER_ASSET_STANDARD" },
];

/**
 * Suggests a tax rule code from the asset's existing free-text category
 * and cost, for display as "Suggested Tax Rule" pending confirmation.
 * Returns undefined if nothing matches -- the UI should show "Needs
 * Classification" rather than guessing.
 */
export function getSuggestedTaxRuleCode(
  category: string | null | undefined,
  purchaseCost: number,
): TaxRuleCode | undefined {
  const text = (category || "").toLowerCase();

  for (const rule of CATEGORY_MAPPING_RULES) {
    if (text.includes(rule.matches)) {
      // A "Small Value Asset" category label is only a plausible suggestion
      // when the cost is actually within the statutory threshold -- avoid
      // suggesting a treatment that could never apply.
      if (rule.suggestedRuleCode === "SMALL_VALUE_ASSET" && purchaseCost > SMALL_VALUE_ASSET_THRESHOLD) {
        continue;
      }
      return rule.suggestedRuleCode;
    }
  }

  // No category match, but cost happens to be under the small-value
  // threshold: surface it as a possibility, never a certainty. The caller
  // still must not auto-classify this as capital Small Value Asset merely
  // because of price (see PART 13) -- this is a hint, not a confirmation.
  if (purchaseCost > 0 && purchaseCost <= SMALL_VALUE_ASSET_THRESHOLD) {
    return "SMALL_VALUE_ASSET";
  }

  return undefined;
}
