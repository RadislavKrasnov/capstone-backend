import { Injectable } from '@nestjs/common';

import { CostCategory } from '../../common/enums/cost-category.enum';
import { FatigueLevel } from '../../common/enums/fatigue-level.enum';
import { AnalysisContext } from '../types/analysis-context.type';
import { CostStructureMetrics, QualityScore } from '../types/quality-score.type';

@Injectable()
export class PackageQualityScoreService {
  calculateCostStructureMetrics(context: AnalysisContext): CostStructureMetrics {
    const financial = context.financialMetrics;

    if (!financial) {
      return {
        fixedCostSharePercent: 0,
        largestSupplierSharePercent: 0,
        largestCostCategorySharePercent: 0,
        requiredCostItemsCount: context.costItems.length,
      };
    }

    return {
      fixedCostSharePercent:
        financial.totalCost > 0 ? this.round((financial.fixedCostTotal / financial.totalCost) * 100) : 0,
      largestSupplierSharePercent: financial.supplierCostBreakdown[0]?.sharePercent ?? 0,
      largestCostCategorySharePercent: financial.categoryCostBreakdown[0]?.sharePercent ?? 0,
      requiredCostItemsCount: context.costItems.length,
    };
  }

  calculateQualityScore(context: AnalysisContext): QualityScore {
    const financial = this.requireFinancialMetrics(context);
    const dailyFatigueResults = context.dailyFatigueResults ?? [];
    const itineraryMetrics = context.itineraryMetrics ?? [];
    const costStructureMetrics = context.costStructureMetrics ?? this.calculateCostStructureMetrics(context);

    const minTargetMargin = this.toNumber(context.configuration.minTargetMarginPercent);
    const goodMargin = this.toNumber(context.configuration.goodMarginPercent);

    const profitabilityScore = this.calculateProfitabilityScore(
      financial.grossMarginPercent,
      minTargetMargin,
      goodMargin,
      financial.breakEvenUtilizationPercent,
      financial.contributionPerPerson,
      financial.grossProfit,
    );
    const itineraryBalanceScore = this.calculateItineraryBalanceScore(dailyFatigueResults);
    const operationalFeasibilityScore = this.calculateOperationalFeasibilityScore(
      itineraryMetrics,
      context.configuration.maxTransferMinutesPerDay,
    );
    const costStructureScore = this.calculateCostStructureScore(costStructureMetrics, financial.categoryCostBreakdown);

    let overallScore = Math.round(
      profitabilityScore * 0.35 +
        itineraryBalanceScore * 0.3 +
        operationalFeasibilityScore * 0.2 +
        costStructureScore * 0.15,
    );

    const appliedCaps: QualityScore['appliedCaps'] = [];

    if (financial.grossProfit < 0) {
      overallScore = Math.min(overallScore, 45);
      appliedCaps.push({ code: 'NEGATIVE_PROFIT_CAP', description: 'Gross profit is negative.', cappedAt: 45 });
    }

    if (financial.contributionPerPerson <= 0) {
      overallScore = Math.min(overallScore, 35);
      appliedCaps.push({ code: 'NON_POSITIVE_CONTRIBUTION_CAP', description: 'Contribution per person is not positive.', cappedAt: 35 });
    }

    const criticalFatigueDayCount = dailyFatigueResults.filter(
      (result) => result.fatigueLevel === FatigueLevel.CRITICAL,
    ).length;

    if (criticalFatigueDayCount >= 1) {
      overallScore = Math.min(overallScore, 75);
      appliedCaps.push({ code: 'CRITICAL_FATIGUE_CAP', description: 'At least one day has critical fatigue.', cappedAt: 75 });
    }

    if (criticalFatigueDayCount >= 2) {
      overallScore = Math.min(overallScore, 65);
      appliedCaps.push({ code: 'MULTIPLE_CRITICAL_FATIGUE_CAP', description: 'Multiple days have critical fatigue.', cappedAt: 65 });
    }

    if (!context.costItems.length || !context.itineraryItems.length) {
      overallScore = Math.min(overallScore, 50);
      appliedCaps.push({ code: 'MISSING_INPUT_DATA_CAP', description: 'Cost or itinerary input data is missing.', cappedAt: 50 });
    }

    return {
      overallScore: this.clamp(overallScore, 0, 100),
      profitabilityScore,
      itineraryBalanceScore,
      operationalFeasibilityScore,
      costStructureScore,
      appliedCaps,
    };
  }

  private calculateProfitabilityScore(
    margin: number,
    minTargetMargin: number,
    goodMargin: number,
    breakEvenUtilization: number,
    contributionPerPerson: number,
    grossProfit: number,
  ): number {
    if (grossProfit < 0 || contributionPerPerson <= 0) {
      return 20;
    }

    const marginScore = margin >= goodMargin ? 100 : margin <= 0 ? 20 : 20 + (margin / goodMargin) * 80;
    const targetPenalty = margin < minTargetMargin ? (minTargetMargin - margin) * 2 : 0;
    const breakEvenPenalty = breakEvenUtilization > 80 ? (breakEvenUtilization - 80) * 1.5 : 0;

    return this.clamp(Math.round(marginScore - targetPenalty - breakEvenPenalty), 0, 100);
  }

  private calculateItineraryBalanceScore(dailyFatigueResults: AnalysisContext['dailyFatigueResults']): number {
    if (!dailyFatigueResults?.length) {
      return 50;
    }

    const averageBalance = dailyFatigueResults.reduce((sum, result) => sum + result.balanceScore, 0) / dailyFatigueResults.length;
    const highFatiguePenalty = dailyFatigueResults.filter(
      (result) => result.fatigueLevel === FatigueLevel.HIGH || result.fatigueLevel === FatigueLevel.CRITICAL,
    ).length * 5;

    return this.clamp(Math.round(averageBalance - highFatiguePenalty), 0, 100);
  }

  private calculateOperationalFeasibilityScore(
    itineraryMetrics: AnalysisContext['itineraryMetrics'],
    maxTransferMinutesPerDay: number,
  ): number {
    if (!itineraryMetrics?.length) {
      return 50;
    }

    let penalty = 0;

    for (const metric of itineraryMetrics) {
      if (metric.transferMinutes + metric.flightMinutes > maxTransferMinutesPerDay) {
        penalty += 8;
      }

      penalty += metric.shortBufferCount * 4;

      if (metric.dayDurationMinutes > 10 * 60) {
        penalty += 6;
      }

      if (!metric.hasMealBreak && metric.activityCount >= 3) {
        penalty += 5;
      }
    }

    return this.clamp(100 - penalty, 0, 100);
  }

  private calculateCostStructureScore(
    costStructureMetrics: CostStructureMetrics,
    categoryBreakdown: Array<{ category: string; sharePercent: number }>,
  ): number {
    if (!costStructureMetrics.requiredCostItemsCount) {
      return 40;
    }

    let penalty = 0;

    if (costStructureMetrics.largestSupplierSharePercent > 60) {
      penalty += (costStructureMetrics.largestSupplierSharePercent - 60) * 0.8;
    }

    if (costStructureMetrics.largestCostCategorySharePercent > 70) {
      penalty += (costStructureMetrics.largestCostCategorySharePercent - 70) * 0.7;
    }

    const otherShare = categoryBreakdown.find((item) => item.category === CostCategory.OTHER)?.sharePercent ?? 0;

    if (otherShare > 20) {
      penalty += (otherShare - 20) * 1.2;
    }

    if (costStructureMetrics.fixedCostSharePercent > 75) {
      penalty += (costStructureMetrics.fixedCostSharePercent - 75) * 0.5;
    }

    return this.clamp(Math.round(100 - penalty), 0, 100);
  }

  private requireFinancialMetrics(context: AnalysisContext) {
    if (!context.financialMetrics) {
      throw new Error('Financial metrics must be calculated before quality score');
    }

    return context.financialMetrics;
  }

  private toNumber(value: string | number): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  private clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  }

  private round(value: number): number {
    return Math.round(value * 100) / 100;
  }
}
