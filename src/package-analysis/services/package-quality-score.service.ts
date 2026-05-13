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
        financial.totalCost > 0
          ? this.round((financial.fixedCostTotal / financial.totalCost) * 100)
          : 0,
      largestSupplierSharePercent: financial.supplierCostBreakdown[0]?.sharePercent ?? 0,
      largestCostCategorySharePercent: financial.categoryCostBreakdown[0]?.sharePercent ?? 0,
      requiredCostItemsCount: context.costItems.length,
    };
  }

  calculateQualityScore(context: AnalysisContext): QualityScore {
    const financial = this.requireFinancialMetrics(context);
    const dailyFatigueResults = context.dailyFatigueResults ?? [];
    const itineraryMetrics = context.itineraryMetrics ?? [];
    const costStructureMetrics =
      context.costStructureMetrics ?? this.calculateCostStructureMetrics(context);

    const expectedGroupSize = this.toNumber(context.package.expectedGroupSize);
    const minTargetMargin = this.toNumber(context.configuration.minTargetMarginPercent);
    const goodMargin = this.toNumber(context.configuration.goodMarginPercent);
    const maxDailyFatigueScore = this.toNumber(context.configuration.maxDailyFatigueScore);
    const maxTransferMinutesPerDay = this.toNumber(context.configuration.maxTransferMinutesPerDay);

    const profitabilityScore = this.calculateProfitabilityScore({
      grossMarginPercent: financial.grossMarginPercent,
      minTargetMarginPercent: minTargetMargin,
      goodMarginPercent: goodMargin,
      breakEvenUtilizationPercent: financial.breakEvenUtilizationPercent,
      contributionPerPerson: financial.contributionPerPerson,
      grossProfit: financial.grossProfit,
      expectedGroupSize,
      breakEvenGroupSizeRounded: financial.breakEvenGroupSizeRounded,
    });

    const itineraryBalanceScore = this.calculateItineraryBalanceScore(
      dailyFatigueResults,
      maxDailyFatigueScore,
    );

    const operationalFeasibilityScore = this.calculateOperationalFeasibilityScore(
      itineraryMetrics,
      maxTransferMinutesPerDay,
    );

    const costStructureScore = this.calculateCostStructureScore(context, costStructureMetrics);

    let overallScore = Math.round(
      profitabilityScore * 0.35 +
        itineraryBalanceScore * 0.3 +
        operationalFeasibilityScore * 0.2 +
        costStructureScore * 0.15,
    );

    const appliedCaps: QualityScore['appliedCaps'] = [];

    if (financial.grossProfit < 0) {
      overallScore = Math.min(overallScore, 45);
      appliedCaps.push({
        code: 'NEGATIVE_PROFIT_CAP',
        description:
          'Gross profit is negative, so the package cannot receive a healthy quality score.',
        cappedAt: 45,
      });
    }

    if (financial.contributionPerPerson <= 0) {
      overallScore = Math.min(overallScore, 35);
      appliedCaps.push({
        code: 'NON_POSITIVE_CONTRIBUTION_CAP',
        description:
          'Contribution per person is not positive, so each additional traveler does not improve profitability.',
        cappedAt: 35,
      });
    }

    const criticalFatigueDayCount = dailyFatigueResults.filter(
      (result) => result.fatigueLevel === FatigueLevel.CRITICAL,
    ).length;

    if (criticalFatigueDayCount >= 2) {
      overallScore = Math.min(overallScore, 65);
      appliedCaps.push({
        code: 'MULTIPLE_CRITICAL_FATIGUE_DAYS_CAP',
        description: 'Multiple itinerary days have critical fatigue.',
        cappedAt: 65,
      });
    } else if (criticalFatigueDayCount >= 1) {
      overallScore = Math.min(overallScore, 75);
      appliedCaps.push({
        code: 'CRITICAL_FATIGUE_DAY_CAP',
        description: 'At least one itinerary day has critical fatigue.',
        cappedAt: 75,
      });
    }

    if (costStructureMetrics.requiredCostItemsCount === 0) {
      overallScore = Math.min(overallScore, 50);
      appliedCaps.push({
        code: 'NO_REQUIRED_COSTS_CAP',
        description:
          'No required cost items are available, so cost and profitability quality cannot be trusted.',
        cappedAt: 50,
      });
    }

    if (context.days.length === 0 || context.itineraryItems.length === 0) {
      overallScore = Math.min(overallScore, 50);
      appliedCaps.push({
        code: 'NO_ITINERARY_DATA_CAP',
        description:
          'No itinerary data is available, so customer experience quality cannot be fully evaluated.',
        cappedAt: 50,
      });
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

  private calculateProfitabilityScore(input: {
    grossMarginPercent: number;
    minTargetMarginPercent: number;
    goodMarginPercent: number;
    breakEvenUtilizationPercent: number;
    contributionPerPerson: number;
    grossProfit: number;
    expectedGroupSize: number;
    breakEvenGroupSizeRounded: number;
  }): number {
    if (input.contributionPerPerson <= 0) {
      return 0;
    }

    if (input.grossProfit < 0) {
      return 0;
    }

    if (input.expectedGroupSize < input.breakEvenGroupSizeRounded) {
      return 20;
    }

    if (
      input.grossMarginPercent >= input.goodMarginPercent &&
      input.breakEvenUtilizationPercent < 60
    ) {
      return 100;
    }

    if (input.grossMarginPercent >= input.goodMarginPercent) {
      return 90;
    }

    if (
      input.grossMarginPercent >= input.minTargetMarginPercent &&
      input.breakEvenUtilizationPercent < 80
    ) {
      return 80;
    }

    if (input.grossMarginPercent >= input.minTargetMarginPercent) {
      return 70;
    }

    if (input.grossMarginPercent >= 10) {
      return 45;
    }

    if (input.grossMarginPercent >= 0) {
      return 25;
    }

    return 0;
  }

  private calculateItineraryBalanceScore(
    dailyFatigueResults: AnalysisContext['dailyFatigueResults'],
    maxDailyFatigueScore: number,
  ): number {
    if (!dailyFatigueResults?.length) {
      return 0;
    }

    const averageDailyBalance =
      dailyFatigueResults.reduce((sum, result) => sum + result.balanceScore, 0) /
      dailyFatigueResults.length;

    const criticalDayPenalty =
      dailyFatigueResults.filter((result) => result.fatigueLevel === FatigueLevel.CRITICAL).length *
      5;

    const consecutiveHighFatiguePenalty = this.hasConsecutiveHighFatigueDays(
      dailyFatigueResults,
      maxDailyFatigueScore,
    )
      ? 10
      : 0;

    return this.clamp(
      Math.round(averageDailyBalance - criticalDayPenalty - consecutiveHighFatiguePenalty),
      0,
      100,
    );
  }

  private calculateOperationalFeasibilityScore(
    itineraryMetrics: AnalysisContext['itineraryMetrics'],
    maxTransferMinutesPerDay: number,
  ): number {
    if (!itineraryMetrics?.length) {
      return 50;
    }

    let shortBufferCount = 0;
    let transferHeavyPenalty = 0;
    let longDayPenalty = 0;
    let lateFinishEarlyStartPenalty = 0;
    let missingTimingDataPenalty = 0;
    let majorItemsCount = 0;
    let missingTimingItemsCount = 0;

    const sortedMetrics = [...itineraryMetrics].sort((a, b) => a.dayNumber - b.dayNumber);

    for (const metric of sortedMetrics) {
      shortBufferCount += metric.shortBufferCount;

      const totalTransferMinutes = metric.transferMinutes + metric.flightMinutes;

      if (totalTransferMinutes > 240) {
        transferHeavyPenalty += 20;
      } else if (totalTransferMinutes > maxTransferMinutesPerDay) {
        transferHeavyPenalty += 10;
      }

      if (metric.dayDurationMinutes > 14 * 60) {
        longDayPenalty += 20;
      } else if (metric.dayDurationMinutes > 12 * 60) {
        longDayPenalty += 10;
      }

      majorItemsCount += metric.activityCount + metric.majorActivityCount;
      missingTimingItemsCount += metric.missingDurationCount + metric.invalidTimingCount;
    }

    for (let index = 1; index < sortedMetrics.length; index += 1) {
      const previous = sortedMetrics[index - 1];
      const current = sortedMetrics[index];

      if (previous.finishesLate && current.startsEarly) {
        lateFinishEarlyStartPenalty += 10;
      }
    }

    if (majorItemsCount > 0 && missingTimingItemsCount / majorItemsCount > 0.2) {
      missingTimingDataPenalty = 10;
    }

    const shortBufferPenalty = Math.min(shortBufferCount * 10, 30);

    const totalPenalty =
      shortBufferPenalty +
      transferHeavyPenalty +
      longDayPenalty +
      lateFinishEarlyStartPenalty +
      missingTimingDataPenalty;

    return this.clamp(100 - totalPenalty, 0, 100);
  }

  private calculateCostStructureScore(
    context: AnalysisContext,
    costStructureMetrics: CostStructureMetrics,
  ): number {
    const financial = this.requireFinancialMetrics(context);

    if (costStructureMetrics.requiredCostItemsCount === 0) {
      return 0;
    }

    let penalty = 0;

    const hotelShare = this.getCategorySharePercent(context, CostCategory.HOTEL);
    const transportShare = this.getCategorySharePercent(context, CostCategory.TRANSPORT);
    const flightShare = this.getCategorySharePercent(context, CostCategory.FLIGHT);
    const otherShare = this.getCategorySharePercent(context, CostCategory.OTHER);

    if (hotelShare > 45) {
      penalty += 15;
    }

    if (transportShare > 35) {
      penalty += 15;
    }

    if (flightShare > 50) {
      penalty += 10;
    }

    if (otherShare > 25) {
      penalty += 10;
    }

    if (costStructureMetrics.largestSupplierSharePercent > 50) {
      penalty += 20;
    } else if (costStructureMetrics.largestSupplierSharePercent > 35) {
      penalty += 10;
    }

    if (
      costStructureMetrics.fixedCostSharePercent > 50 &&
      financial.breakEvenUtilizationPercent > 80
    ) {
      penalty += 15;
    }

    return this.clamp(100 - penalty, 0, 100);
  }

  private getCategorySharePercent(context: AnalysisContext, category: CostCategory): number {
    return (
      context.financialMetrics?.categoryCostBreakdown.find((item) => item.category === category)
        ?.sharePercent ?? 0
    );
  }

  private hasConsecutiveHighFatigueDays(
    dailyFatigueResults: NonNullable<AnalysisContext['dailyFatigueResults']>,
    maxDailyFatigueScore: number,
  ): boolean {
    const sortedResults = [...dailyFatigueResults].sort((a, b) => a.dayNumber - b.dayNumber);

    for (let index = 1; index < sortedResults.length; index += 1) {
      const previous = sortedResults[index - 1];
      const current = sortedResults[index];

      if (
        previous.fatigueScore > maxDailyFatigueScore &&
        current.fatigueScore > maxDailyFatigueScore
      ) {
        return true;
      }
    }

    return false;
  }

  private requireFinancialMetrics(context: AnalysisContext) {
    if (!context.financialMetrics) {
      throw new Error('Financial metrics must be calculated before quality score');
    }

    return context.financialMetrics;
  }

  private toNumber(value: string | number | null | undefined): number {
    if (value === null || value === undefined) {
      return 0;
    }

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
