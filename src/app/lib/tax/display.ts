// Human-readable labels for tax rules/statuses. Kept separate from the
// calculation engine (capitalAllowance.ts) so the math stays UI-agnostic,
// per the "independent from UI" rule in PART 11.

import { getTaxRule } from "./rules";
import type { TaxStatus } from "./capitalAllowance";

/** e.g. "ICT Equipment · ACA 40% IA · 20% AA" (PART 44). */
export function getTaxRuleTreatmentLabel(ruleCode: string | null | undefined): string {
  const rule = getTaxRule(ruleCode);
  if (!rule) return "Needs Classification";

  if (rule.kind === "small_value_special") return `${rule.label} · Special Allowance`;
  if (rule.kind === "not_eligible") return rule.label;

  const ia = Math.round((rule.initialAllowanceRate ?? 0) * 100);
  const aa = Math.round((rule.annualAllowanceRate ?? 0) * 100);
  return `${rule.label} · ${ia}% IA · ${aa}% AA`;
}

export const TAX_STATUS_LABELS: Record<TaxStatus, string> = {
  confirmed: "Confirmed",
  needs_classification_review: "Tax treatment needs confirmation",
  needs_tax_basis_review: "Tax Basis Needs Review",
  needs_business_use_date: "Business use date needs confirmation",
  not_eligible: "Not Eligible",
  fully_claimed: "Fully Claimed",
};

/** Tailwind class fragments for the status badge -- dark-mode aware, matches existing badge styling in the app. */
export const TAX_STATUS_BADGE_CLASSES: Record<TaxStatus, string> = {
  confirmed: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-900/40",
  needs_classification_review: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-900/40",
  needs_tax_basis_review: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-900/40",
  needs_business_use_date: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-900/40",
  not_eligible: "bg-gray-50 text-gray-500 border-gray-200 dark:bg-white/5 dark:text-gray-400 dark:border-white/10",
  fully_claimed: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-900/40",
};
