export type CategoryCostShare = {
  category: string;
  totalCost: number;
  sharePercent: number;
};

export type SupplierCostShare = {
  supplierId: number | null;
  supplierName: string;
  totalCost: number;
  sharePercent: number;
};

export type FinancialMetrics = {
  totalRevenue: number;
  totalCost: number;
  grossProfit: number;
  grossMarginPercent: number;
  fixedCostTotal: number;
  variableCostTotal: number;
  variableCostPerPerson: number;
  contributionPerPerson: number;
  breakEvenGroupSize: number;
  breakEvenSafetyTravelers: number;
  breakEvenUtilizationPercent: number;
  requiredPriceForTargetMargin: number;
  requiredCostReductionForTargetMargin: number;
  categoryCostBreakdown: CategoryCostShare[];
  supplierCostBreakdown: SupplierCostShare[];
};
