import { BadRequestException, Injectable } from '@nestjs/common';

import { CostCategory } from '../../common/enums/cost-category.enum';
import { CostType } from '../../common/enums/cost-type.enum';
import { CostItem } from '../../costs/entities/cost-item.entity';
import { AnalysisContext } from '../types/analysis-context.type';
import {
  FINANCIAL_ANALYSIS_THRESHOLDS,
  NUMERIC_FORMAT,
} from '../constants/analysis-thresholds.constants';
import { FinancialRiskLevel } from '../types/analysis-dashboard-response.type';
import {
  CategoryCostShare,
  FinancialMetrics,
  SupplierCostShare,
} from '../types/financial-metrics.type';

type NormalizedCostItem = {
  costItem: CostItem;
  totalCost: number;
  isVariable: boolean;
};

@Injectable()
export class FinancialAnalysisService {
  calculateFinancialMetrics(context: AnalysisContext): FinancialMetrics {
    const tourPackage = context.package;
    const groupSize = Number(tourPackage.expectedGroupSize);
    const durationDays = Number(tourPackage.durationDays);
    const sellingPricePerPerson = this.toNumber(tourPackage.sellingPricePerPerson);

    this.validateAnalysisInput(context, groupSize, durationDays, sellingPricePerPerson);
    this.validateCostCurrencies(context);

    const totalRevenue = groupSize * sellingPricePerPerson;

    const normalizedCosts = context.costItems.map((costItem) => ({
      costItem,
      totalCost: this.calculateCostLineTotal(costItem, groupSize, durationDays),
      isVariable: costItem.costType === CostType.PER_PERSON,
    }));

    const totalCost = normalizedCosts.reduce((sum, item) => sum + item.totalCost, 0);

    const fixedCostTotal = normalizedCosts
      .filter((item) => !item.isVariable)
      .reduce((sum, item) => sum + item.totalCost, 0);

    const variableCostTotal = normalizedCosts
      .filter((item) => item.isVariable)
      .reduce((sum, item) => sum + item.totalCost, 0);

    const variableCostPerPerson = variableCostTotal / groupSize;
    const costPerPerson = totalCost / groupSize;
    const contributionPerPerson = sellingPricePerPerson - variableCostPerPerson;

    const grossProfit = totalRevenue - totalCost;
    const grossMarginPercent =
      totalRevenue > 0 ? (grossProfit / totalRevenue) * NUMERIC_FORMAT.PERCENT_MULTIPLIER : 0;
    const profitPerPerson = sellingPricePerPerson - costPerPerson;

    const breakEvenGroupSize =
      contributionPerPerson > 0 ? fixedCostTotal / contributionPerPerson : 0;
    const breakEvenGroupSizeRounded = contributionPerPerson > 0 ? Math.ceil(breakEvenGroupSize) : 0;

    const breakEvenSafetyTravelers =
      contributionPerPerson > 0 ? groupSize - breakEvenGroupSizeRounded : 0;

    const breakEvenUtilizationPercent =
      contributionPerPerson > 0
        ? (breakEvenGroupSizeRounded / groupSize) * NUMERIC_FORMAT.PERCENT_MULTIPLIER
        : NUMERIC_FORMAT.PERCENT_MULTIPLIER;

    const minTargetMarginPercent = this.toNumber(context.configuration.minTargetMarginPercent);
    const targetMarginRatio = minTargetMarginPercent / NUMERIC_FORMAT.PERCENT_MULTIPLIER;

    const requiredPriceForTargetMargin =
      targetMarginRatio < 1 ? totalCost / (groupSize * (1 - targetMarginRatio)) : 0;

    const priceGapPerPerson = requiredPriceForTargetMargin - sellingPricePerPerson;

    const maxCostForTargetMargin = totalRevenue * (1 - targetMarginRatio);
    const requiredCostReductionForTargetMargin = Math.max(0, totalCost - maxCostForTargetMargin);

    const markupPercent =
      totalCost > 0 ? (grossProfit / totalCost) * NUMERIC_FORMAT.PERCENT_MULTIPLIER : 0;

    const financialRiskLevel = this.resolveFinancialRiskLevel(
      grossProfit,
      contributionPerPerson,
      groupSize,
      breakEvenGroupSizeRounded,
      grossMarginPercent,
      breakEvenUtilizationPercent,
      minTargetMarginPercent,
    );

    return {
      totalRevenue: this.roundMoney(totalRevenue),
      totalCost: this.roundMoney(totalCost),
      grossProfit: this.roundMoney(grossProfit),
      grossMarginPercent: this.roundPercent(grossMarginPercent),

      fixedCostTotal: this.roundMoney(fixedCostTotal),
      variableCostTotal: this.roundMoney(variableCostTotal),
      variableCostPerPerson: this.roundMoney(variableCostPerPerson),

      costPerPerson: this.roundMoney(costPerPerson),
      profitPerPerson: this.roundMoney(profitPerPerson),
      contributionPerPerson: this.roundMoney(contributionPerPerson),

      breakEvenGroupSize: this.roundNumber(breakEvenGroupSize),
      breakEvenGroupSizeRounded,
      breakEvenSafetyTravelers: this.roundNumber(breakEvenSafetyTravelers),
      breakEvenUtilizationPercent: this.roundPercent(breakEvenUtilizationPercent),

      requiredPriceForTargetMargin: this.roundMoney(requiredPriceForTargetMargin),
      priceGapPerPerson: this.roundMoney(priceGapPerPerson),
      requiredCostReductionForTargetMargin: this.roundMoney(requiredCostReductionForTargetMargin),

      markupPercent: this.roundPercent(markupPercent),
      financialRiskLevel,

      categoryCostBreakdown: this.buildCategoryBreakdown(normalizedCosts, totalCost),
      supplierCostBreakdown: this.buildSupplierBreakdown(normalizedCosts, totalCost),
    };
  }

  private validateAnalysisInput(
    context: AnalysisContext,
    groupSize: number,
    durationDays: number,
    sellingPricePerPerson: number,
  ): void {
    if (!Number.isFinite(groupSize) || groupSize <= 0) {
      throw new BadRequestException('Expected group size must be greater than 0');
    }

    if (!Number.isFinite(sellingPricePerPerson) || sellingPricePerPerson <= 0) {
      throw new BadRequestException('Selling price per person must be greater than 0');
    }

    if (!Number.isFinite(durationDays) || durationDays <= 0) {
      throw new BadRequestException('Package duration must be greater than 0');
    }

    if (context.costItems.length === 0) {
      throw new BadRequestException(
        'At least one required cost item is needed for financial analysis',
      );
    }

    const invalidQuantityCostItem = context.costItems.find(
      (costItem) => this.toNumber(costItem.quantity) <= 0,
    );

    if (invalidQuantityCostItem) {
      throw new BadRequestException('All required cost items must have quantity greater than 0');
    }

    const invalidUnitCostItem = context.costItems.find(
      (costItem) => this.toNumber(costItem.unitCost) < 0,
    );

    if (invalidUnitCostItem) {
      throw new BadRequestException(
        'All required cost items must have unit cost greater than or equal to 0',
      );
    }
  }

  private validateCostCurrencies(context: AnalysisContext): void {
    const packageCurrency = context.package.currencyCode;
    const invalidCostItem = context.costItems.find(
      (costItem) => costItem.currencyCode !== packageCurrency,
    );

    if (invalidCostItem) {
      throw new BadRequestException(
        `Cost item currency ${invalidCostItem.currencyCode} does not match package currency ${packageCurrency}`,
      );
    }
  }

  private calculateCostLineTotal(
    costItem: CostItem,
    groupSize: number,
    durationDays: number,
  ): number {
    const quantity = this.toNumber(costItem.quantity);
    const unitCost = this.toNumber(costItem.unitCost);

    switch (costItem.costType) {
      case CostType.PER_PERSON:
        return groupSize * quantity * unitCost;

      case CostType.PER_DAY:
        return durationDays * quantity * unitCost;

      case CostType.FIXED:
      case CostType.PER_GROUP:
      default:
        return quantity * unitCost;
    }
  }

  private buildCategoryBreakdown(
    normalizedCosts: NormalizedCostItem[],
    totalCost: number,
  ): CategoryCostShare[] {
    const totals = new Map<CostCategory, number>();

    for (const item of normalizedCosts) {
      totals.set(
        item.costItem.category,
        (totals.get(item.costItem.category) ?? 0) + item.totalCost,
      );
    }

    return Array.from(totals.entries())
      .map(([category, cost]) => ({
        category,
        totalCost: this.roundMoney(cost),
        sharePercent:
          totalCost > 0
            ? this.roundPercent((cost / totalCost) * NUMERIC_FORMAT.PERCENT_MULTIPLIER)
            : 0,
      }))
      .sort((a, b) => b.totalCost - a.totalCost);
  }

  private buildSupplierBreakdown(
    normalizedCosts: NormalizedCostItem[],
    totalCost: number,
  ): SupplierCostShare[] {
    const totals = new Map<number | null, { supplierName: string; totalCost: number }>();

    for (const item of normalizedCosts) {
      const supplierId = item.costItem.supplierId ?? null;
      const supplierName = item.costItem.supplier?.name ?? 'Unassigned supplier';
      const current = totals.get(supplierId) ?? { supplierName, totalCost: 0 };

      current.totalCost += item.totalCost;
      totals.set(supplierId, current);
    }

    return Array.from(totals.entries())
      .map(([supplierId, value]) => ({
        supplierId,
        supplierName: value.supplierName,
        totalCost: this.roundMoney(value.totalCost),
        sharePercent:
          totalCost > 0
            ? this.roundPercent((value.totalCost / totalCost) * NUMERIC_FORMAT.PERCENT_MULTIPLIER)
            : 0,
      }))
      .sort((a, b) => b.totalCost - a.totalCost);
  }

  private resolveFinancialRiskLevel(
    grossProfit: number,
    contributionPerPerson: number,
    expectedGroupSize: number,
    breakEvenGroupSizeRounded: number,
    grossMarginPercent: number,
    breakEvenUtilizationPercent: number,
    minTargetMarginPercent: number,
  ): FinancialRiskLevel {
    if (
      grossProfit < 0 ||
      contributionPerPerson <= 0 ||
      expectedGroupSize < breakEvenGroupSizeRounded
    ) {
      return 'CRITICAL';
    }

    if (
      grossMarginPercent < FINANCIAL_ANALYSIS_THRESHOLDS.VERY_LOW_MARGIN_PERCENT ||
      breakEvenUtilizationPercent >=
        FINANCIAL_ANALYSIS_THRESHOLDS.HIGH_BREAK_EVEN_UTILIZATION_PERCENT
    ) {
      return 'HIGH';
    }

    if (
      grossMarginPercent < minTargetMarginPercent ||
      breakEvenUtilizationPercent >=
        FINANCIAL_ANALYSIS_THRESHOLDS.MEDIUM_BREAK_EVEN_UTILIZATION_PERCENT
    ) {
      return 'MEDIUM';
    }

    return 'LOW';
  }

  private toNumber(value: string | number | null | undefined): number {
    if (value === null || value === undefined) {
      return 0;
    }

    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  private roundMoney(value: number): number {
    return this.round(value, NUMERIC_FORMAT.MONEY_DECIMAL_PLACES);
  }

  private roundPercent(value: number): number {
    return this.round(value, NUMERIC_FORMAT.PERCENT_DECIMAL_PLACES);
  }

  private roundNumber(value: number): number {
    return this.round(value, NUMERIC_FORMAT.NUMBER_DECIMAL_PLACES);
  }

  private round(value: number, digits: number): number {
    const multiplier = NUMERIC_FORMAT.ROUNDING_MULTIPLIER_BASE ** digits;
    return Math.round(value * multiplier) / multiplier;
  }
}
