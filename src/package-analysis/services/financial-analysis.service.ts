import { BadRequestException, Injectable } from '@nestjs/common';

import { CostCategory } from '../../common/enums/cost-category.enum';
import { CostType } from '../../common/enums/cost-type.enum';
import { CostItem } from '../../costs/entities/cost-item.entity';
import { AnalysisContext } from '../types/analysis-context.type';
import { CategoryCostShare, FinancialMetrics, SupplierCostShare } from '../types/financial-metrics.type';

@Injectable()
export class FinancialAnalysisService {
  calculateFinancialMetrics(context: AnalysisContext): FinancialMetrics {
    const tourPackage = context.package;
    const groupSize = tourPackage.expectedGroupSize;
    const durationDays = tourPackage.durationDays;
    const sellingPricePerPerson = this.toNumber(tourPackage.sellingPricePerPerson);

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
    const variableCostPerPerson = groupSize > 0 ? variableCostTotal / groupSize : 0;
    const contributionPerPerson = sellingPricePerPerson - variableCostPerPerson;
    const grossProfit = totalRevenue - totalCost;
    const grossMarginPercent = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;
    const breakEvenGroupSize = contributionPerPerson > 0 ? fixedCostTotal / contributionPerPerson : 0;
    const breakEvenSafetyTravelers = contributionPerPerson > 0 ? groupSize - breakEvenGroupSize : 0;
    const breakEvenUtilizationPercent = groupSize > 0 ? (breakEvenGroupSize / groupSize) * 100 : 100;

    const minTargetMarginPercent = this.toNumber(context.configuration.minTargetMarginPercent);
    const targetMarginRatio = minTargetMarginPercent / 100;
    const requiredPriceForTargetMargin =
      groupSize > 0 && targetMarginRatio < 1 ? totalCost / groupSize / (1 - targetMarginRatio) : 0;
    const maxCostForTargetMargin = totalRevenue * (1 - targetMarginRatio);
    const requiredCostReductionForTargetMargin = Math.max(0, totalCost - maxCostForTargetMargin);

    return {
      totalRevenue: this.roundMoney(totalRevenue),
      totalCost: this.roundMoney(totalCost),
      grossProfit: this.roundMoney(grossProfit),
      grossMarginPercent: this.roundPercent(grossMarginPercent),
      fixedCostTotal: this.roundMoney(fixedCostTotal),
      variableCostTotal: this.roundMoney(variableCostTotal),
      variableCostPerPerson: this.roundMoney(variableCostPerPerson),
      contributionPerPerson: this.roundMoney(contributionPerPerson),
      breakEvenGroupSize: this.roundNumber(breakEvenGroupSize),
      breakEvenSafetyTravelers: this.roundNumber(breakEvenSafetyTravelers),
      breakEvenUtilizationPercent: this.roundPercent(breakEvenUtilizationPercent),
      requiredPriceForTargetMargin: this.roundMoney(requiredPriceForTargetMargin),
      requiredCostReductionForTargetMargin: this.roundMoney(requiredCostReductionForTargetMargin),
      categoryCostBreakdown: this.buildCategoryBreakdown(normalizedCosts, totalCost),
      supplierCostBreakdown: this.buildSupplierBreakdown(normalizedCosts, totalCost),
    };
  }

  private validateCostCurrencies(context: AnalysisContext): void {
    const packageCurrency = context.package.currencyCode;
    const invalidCostItem = context.costItems.find((costItem) => costItem.currencyCode !== packageCurrency);

    if (invalidCostItem) {
      throw new BadRequestException(
        `Cost item currency ${invalidCostItem.currencyCode} does not match package currency ${packageCurrency}`,
      );
    }
  }

  private calculateCostLineTotal(costItem: CostItem, groupSize: number, durationDays: number): number {
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
    normalizedCosts: Array<{ costItem: CostItem; totalCost: number }>,
    totalCost: number,
  ): CategoryCostShare[] {
    const totals = new Map<CostCategory, number>();

    for (const item of normalizedCosts) {
      totals.set(item.costItem.category, (totals.get(item.costItem.category) ?? 0) + item.totalCost);
    }

    return Array.from(totals.entries())
      .map(([category, cost]) => ({
        category,
        totalCost: this.roundMoney(cost),
        sharePercent: totalCost > 0 ? this.roundPercent((cost / totalCost) * 100) : 0,
      }))
      .sort((a, b) => b.totalCost - a.totalCost);
  }

  private buildSupplierBreakdown(
    normalizedCosts: Array<{ costItem: CostItem; totalCost: number }>,
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
        sharePercent: totalCost > 0 ? this.roundPercent((value.totalCost / totalCost) * 100) : 0,
      }))
      .sort((a, b) => b.totalCost - a.totalCost);
  }

  private toNumber(value: string | number | null | undefined): number {
    if (value === null || value === undefined) {
      return 0;
    }

    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  private roundMoney(value: number): number {
    return this.round(value, 2);
  }

  private roundPercent(value: number): number {
    return this.round(value, 2);
  }

  private roundNumber(value: number): number {
    return this.round(value, 2);
  }

  private round(value: number, digits: number): number {
    const multiplier = 10 ** digits;
    return Math.round(value * multiplier) / multiplier;
  }
}
