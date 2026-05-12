import { FinancialRiskLevel } from './analysis-dashboard-response.type';

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

  costPerPerson: number;
  profitPerPerson: number;
  contributionPerPerson: number;

  breakEvenGroupSize: number;
  breakEvenGroupSizeRounded: number;
  breakEvenSafetyTravelers: number;
  breakEvenUtilizationPercent: number;

  requiredPriceForTargetMargin: number;
  priceGapPerPerson: number;
  requiredCostReductionForTargetMargin: number;

  markupPercent: number;
  financialRiskLevel: FinancialRiskLevel;

  categoryCostBreakdown: CategoryCostShare[];
  supplierCostBreakdown: SupplierCostShare[];
};
