// Malaysian capital allowance calculation engine.
//
// Pure calculation logic only -- no React, no Supabase calls. Every
// function here is a plain function of its inputs so it's independently
// testable (see the sanity-check invocations kept in this repo's session
// notes) and reusable from both the dashboard and, later, any reporting
// view. Rates/rule metadata live in rules.ts; category-string guessing
// lives in categoryMapping.ts.
//
// NOT an LHDN filing system. All outputs are estimates -- see
// TAX_ESTIMATE_DISCLAIMER in rules.ts.

import { DEFAULT_TAX_PROFILE, getTaxRule, type TaxProfile, type TaxRuleCode } from "./rules";

export type TaxBasisStatus = "needs_review" | "confirmed" | null;

export type TaxStatus =
  | "confirmed"
  | "needs_classification_review"
  | "needs_tax_basis_review"
  | "needs_business_use_date"
  | "not_eligible"
  | "fully_claimed";

/** Minimal shape the engine needs -- decoupled from the full DB Asset row. */
export interface TaxableAssetInput {
  id: string;
  purchaseCost: number;
  purchaseDate: string; // ISO date (YYYY-MM-DD)
  placedInUseDate: string | null;
  businessUsePercentage: number | null;
  taxRuleCode: TaxRuleCode | null;
  taxRuleConfirmed: boolean;
  taxBasisStatus: TaxBasisStatus;
}

export interface AllowanceYearEntry {
  assessmentYear: number;
  openingResidual: number;
  initialAllowance: number;
  annualAllowance: number;
  totalAllowance: number;
  closingResidual: number;
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/**
 * Year of Assessment for a given ISO date.
 *
 * ASSUMPTION (needs accountant confirmation if it ever stops holding):
 * Omnyzo's basis period is treated as aligned to the calendar year, so
 * YA = calendar year of the date. If the company's actual basis period
 * ever diverges from the calendar year, this needs revisiting.
 */
export function getAssessmentYearFromDate(dateStr: string): number {
  return new Date(`${dateStr}T00:00:00Z`).getUTCFullYear();
}

/**
 * Qualifying tax basis = purchase cost x business-use %. Never mutates or
 * substitutes for the actual recorded purchase cost (PART 26) -- this is a
 * derived figure for tax calculation only.
 */
export function getQualifyingTaxBasis(asset: Pick<TaxableAssetInput, "purchaseCost" | "businessUsePercentage">): number {
  const pct = asset.businessUsePercentage ?? 100;
  return round2(asset.purchaseCost * (pct / 100));
}

/**
 * Full year-by-year allowance schedule for one asset, from its first
 * qualifying YA until the qualifying expenditure is fully claimed.
 *
 * Returns [] whenever the asset isn't in a state where a *confirmed*
 * schedule can be produced -- unconfirmed classification, unreviewed tax
 * basis, or missing placed-in-use date. Callers must not interpret an
 * empty schedule as "not eligible"; use getAssetTaxStatus for that.
 */
export function calculateAssetAllowanceSchedule(asset: TaxableAssetInput): AllowanceYearEntry[] {
  if (!asset.taxRuleCode || !asset.taxRuleConfirmed) return [];
  if (asset.taxBasisStatus === "needs_review") return [];
  if (!asset.placedInUseDate) return [];

  const rule = getTaxRule(asset.taxRuleCode);
  if (!rule || rule.kind === "not_eligible") return [];

  const basis = getQualifyingTaxBasis(asset);
  if (basis <= 0) return [];

  const startYA = getAssessmentYearFromDate(asset.placedInUseDate);

  if (rule.kind === "small_value_special") {
    // One-off 100% special allowance in the placed-in-use YA. Whether it
    // actually fits under the taxpayer's annual aggregate cap is decided
    // across assets in calculateDashboardTaxSummary, not here.
    return [
      {
        assessmentYear: startYA,
        openingResidual: basis,
        initialAllowance: 0,
        annualAllowance: 0,
        totalAllowance: basis,
        closingResidual: 0,
      },
    ];
  }

  // Standard treatment: IA (first qualifying year only) + AA (every year),
  // both computed as a flat rate of the ORIGINAL qualifying basis --
  // Malaysian capital allowance is straight-line, not reducing-balance.
  // Capped so cumulative allowance never exceeds the qualifying basis
  // (PART 25) and IA is never given again in a later year (PART 24).
  const iaRate = rule.initialAllowanceRate ?? 0;
  const aaRate = rule.annualAllowanceRate ?? 0;

  const schedule: AllowanceYearEntry[] = [];
  let residual = basis;
  let ya = startYA;
  let yearIndex = 0;

  while (residual > 0.005 && yearIndex < 30) {
    const opening = residual;
    const ia = yearIndex === 0 ? round2(basis * iaRate) : 0;
    let aa = round2(basis * aaRate);
    let total = round2(ia + aa);

    if (total > opening) {
      total = opening;
      aa = round2(Math.max(0, opening - ia));
      total = round2(ia + aa);
    }

    const closing = round2(opening - total);

    schedule.push({
      assessmentYear: ya,
      openingResidual: opening,
      initialAllowance: ia,
      annualAllowance: aa,
      totalAllowance: total,
      closingResidual: closing,
    });

    residual = closing;
    ya += 1;
    yearIndex += 1;
  }

  return schedule;
}

/** Confirmed allowance amount for one asset in one YA (0 if none applies). */
export function calculateAssetAllowance(asset: TaxableAssetInput, assessmentYear: number): number {
  const entry = calculateAssetAllowanceSchedule(asset).find((e) => e.assessmentYear === assessmentYear);
  return entry ? entry.totalAllowance : 0;
}

/**
 * What the allowance WOULD be for `assessmentYear` if the asset's pending
 * classification/basis/placed-in-use-date were confirmed as suggested.
 * Display-only ("Potential Allowance Pending Review") -- must never be
 * added into a confirmed total.
 */
export function calculatePotentialAssetAllowance(
  asset: TaxableAssetInput,
  assessmentYear: number,
  suggestedRuleCode: TaxRuleCode | undefined,
): number {
  const effectiveRuleCode = asset.taxRuleCode ?? suggestedRuleCode;
  if (!effectiveRuleCode) return 0;

  const hypothetical: TaxableAssetInput = {
    ...asset,
    taxRuleCode: effectiveRuleCode,
    taxRuleConfirmed: true,
    taxBasisStatus: asset.taxBasisStatus === "needs_review" ? "confirmed" : asset.taxBasisStatus,
    placedInUseDate: asset.placedInUseDate ?? asset.purchaseDate,
  };
  return calculateAssetAllowance(hypothetical, assessmentYear);
}

/** Per-asset, per-YA tax status -- drives the dashboard/table badges. */
export function getAssetTaxStatus(asset: TaxableAssetInput, assessmentYear: number): TaxStatus {
  if (asset.taxRuleCode === "NOT_ELIGIBLE" && asset.taxRuleConfirmed) return "not_eligible";
  if (asset.taxBasisStatus === "needs_review") return "needs_tax_basis_review";
  if (!asset.taxRuleCode || !asset.taxRuleConfirmed) return "needs_classification_review";
  if (!asset.placedInUseDate) return "needs_business_use_date";

  const schedule = calculateAssetAllowanceSchedule(asset);
  if (schedule.length === 0) return "needs_classification_review";

  const lastYA = schedule[schedule.length - 1].assessmentYear;
  if (assessmentYear > lastYA) return "fully_claimed";

  return "confirmed";
}

export interface AssetReviewFlag {
  assetId: string;
  status: TaxStatus;
}

export interface DashboardTaxSummary {
  assessmentYear: number;
  /** Sum of every registered asset's purchase cost, regardless of tax status (PART 31/38). */
  totalAssetCost: number;
  confirmedSmallValueAllowance: number;
  confirmedCapitalAllowance: number;
  totalConfirmedAllowance: number;
  potentialAllowancePendingReview: number;
  smallValueAnnualLimit: number;
  smallValueLimitExceeded: boolean;
  /** Small-value-eligible amount this YA that fell outside the annual cap and needs standard treatment instead. */
  smallValueExcessAmount: number;
  assetsNeedingReview: AssetReviewFlag[];
}

/**
 * Aggregates all confirmed allowances for the dashboard cards, enforcing
 * the Small Value Asset annual aggregate limit across assets (PART 14/15).
 *
 * `suggestedRuleCodeFor` is optional and only used to compute the
 * "potential pending review" figure for assets that don't yet have a
 * tax_rule_code set at all.
 */
export function calculateDashboardTaxSummary(
  assets: TaxableAssetInput[],
  assessmentYear: number,
  taxProfile: TaxProfile = DEFAULT_TAX_PROFILE,
  suggestedRuleCodeFor?: (asset: TaxableAssetInput) => TaxRuleCode | undefined,
): DashboardTaxSummary {
  const totalAssetCost = round2(assets.reduce((sum, a) => sum + a.purchaseCost, 0));

  const svaCandidates = assets
    .filter((a) => {
      const rule = getTaxRule(a.taxRuleCode);
      return (
        rule?.kind === "small_value_special" &&
        a.taxRuleConfirmed &&
        a.taxBasisStatus !== "needs_review" &&
        a.placedInUseDate &&
        getAssessmentYearFromDate(a.placedInUseDate) === assessmentYear
      );
    })
    .sort((a, b) => {
      if (a.placedInUseDate! < b.placedInUseDate!) return -1;
      if (a.placedInUseDate! > b.placedInUseDate!) return 1;
      return a.id.localeCompare(b.id);
    });

  let runningSva = 0;
  let smallValueExcessAmount = 0;
  for (const asset of svaCandidates) {
    const basis = getQualifyingTaxBasis(asset);
    const remainingCap = round2(taxProfile.smallValueAnnualLimit - runningSva);
    if (basis <= remainingCap) {
      runningSva = round2(runningSva + basis);
    } else {
      const admitted = Math.max(0, remainingCap);
      runningSva = round2(runningSva + admitted);
      smallValueExcessAmount = round2(smallValueExcessAmount + (basis - admitted));
    }
  }

  // calculateAssetAllowance already returns 0 for anything unconfirmed, so
  // a plain sum over standard-rule assets is safe here.
  const confirmedCapitalAllowance = round2(
    assets
      .filter((a) => getTaxRule(a.taxRuleCode)?.kind === "standard_ia_aa")
      .reduce((sum, a) => sum + calculateAssetAllowance(a, assessmentYear), 0),
  );

  const totalConfirmedAllowance = round2(runningSva + confirmedCapitalAllowance);

  const statuses = assets.map((a) => ({ asset: a, status: getAssetTaxStatus(a, assessmentYear) }));
  const assetsNeedingReview: AssetReviewFlag[] = statuses
    .filter((s) =>
      s.status === "needs_classification_review" ||
      s.status === "needs_tax_basis_review" ||
      s.status === "needs_business_use_date",
    )
    .map((s) => ({ assetId: s.asset.id, status: s.status }));

  const potentialAllowancePendingReview = round2(
    statuses
      .filter((s) => assetsNeedingReview.some((r) => r.assetId === s.asset.id))
      .reduce((sum, s) => {
        const suggested = suggestedRuleCodeFor?.(s.asset);
        return sum + calculatePotentialAssetAllowance(s.asset, assessmentYear, suggested);
      }, 0),
  );

  return {
    assessmentYear,
    totalAssetCost,
    confirmedSmallValueAllowance: runningSva,
    confirmedCapitalAllowance,
    totalConfirmedAllowance,
    potentialAllowancePendingReview,
    smallValueAnnualLimit: taxProfile.smallValueAnnualLimit,
    smallValueLimitExceeded: smallValueExcessAmount > 0,
    smallValueExcessAmount,
    assetsNeedingReview,
  };
}
