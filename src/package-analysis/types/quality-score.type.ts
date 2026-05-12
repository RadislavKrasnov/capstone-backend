export type AppliedScoreCap = {
  code: string;
  description: string;
  cappedAt: number;
};

export type CostStructureMetrics = {
  fixedCostSharePercent: number;
  largestSupplierSharePercent: number;
  largestCostCategorySharePercent: number;
  requiredCostItemsCount: number;
};

export type QualityScore = {
  overallScore: number;
  profitabilityScore: number;
  itineraryBalanceScore: number;
  operationalFeasibilityScore: number;
  costStructureScore: number;
  appliedCaps: AppliedScoreCap[];
};
