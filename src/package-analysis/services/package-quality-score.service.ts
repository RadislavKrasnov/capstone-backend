import { Injectable } from '@nestjs/common';

import { CostCategory } from '../../common/enums/cost-category.enum';
import { FatigueLevel } from '../../common/enums/fatigue-level.enum';
import { AnalysisContext } from '../types/analysis-context.type';
import {
  FINANCIAL_ANALYSIS_THRESHOLDS,
  ITINERARY_RULE_THRESHOLDS,
  NUMERIC_FORMAT,
  QUALITY_SCORE_THRESHOLDS,
  QUALITY_SCORE_WEIGHTS,
} from '../constants/analysis-thresholds.constants';
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
          ? this.round(
              (financial.fixedCostTotal / financial.totalCost) * NUMERIC_FORMAT.PERCENT_MULTIPLIER,
            )
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
      profitabilityScore * QUALITY_SCORE_WEIGHTS.PROFITABILITY +
        itineraryBalanceScore * QUALITY_SCORE_WEIGHTS.ITINERARY_BALANCE +
        operationalFeasibilityScore * QUALITY_SCORE_WEIGHTS.OPERATIONAL_FEASIBILITY +
        costStructureScore * QUALITY_SCORE_WEIGHTS.COST_STRUCTURE,
    );

    const appliedCaps: QualityScore['appliedCaps'] = [];

    if (financial.grossProfit < 0) {
      overallScore = Math.min(overallScore, QUALITY_SCORE_THRESHOLDS.NEGATIVE_PROFIT_CAP);
      appliedCaps.push({
        code: 'NEGATIVE_PROFIT_CAP',
        description:
          'Gross profit is negative, so the package cannot receive a healthy quality score.',
        cappedAt: QUALITY_SCORE_THRESHOLDS.NEGATIVE_PROFIT_CAP,
      });
    }

    if (financial.contributionPerPerson <= 0) {
      overallScore = Math.min(overallScore, QUALITY_SCORE_THRESHOLDS.NON_POSITIVE_CONTRIBUTION_CAP);
      appliedCaps.push({
        code: 'NON_POSITIVE_CONTRIBUTION_CAP',
        description:
          'Contribution per person is not positive, so each additional traveler does not improve profitability.',
        cappedAt: QUALITY_SCORE_THRESHOLDS.NON_POSITIVE_CONTRIBUTION_CAP,
      });
    }

    const criticalFatigueDayCount = dailyFatigueResults.filter(
      (result) => result.fatigueLevel === FatigueLevel.CRITICAL,
    ).length;

    if (criticalFatigueDayCount >= QUALITY_SCORE_THRESHOLDS.MULTIPLE_CRITICAL_FATIGUE_DAYS_COUNT) {
      overallScore = Math.min(
        overallScore,
        QUALITY_SCORE_THRESHOLDS.MULTIPLE_CRITICAL_FATIGUE_DAYS_CAP,
      );
      appliedCaps.push({
        code: 'MULTIPLE_CRITICAL_FATIGUE_DAYS_CAP',
        description: 'Multiple itinerary days have critical fatigue.',
        cappedAt: QUALITY_SCORE_THRESHOLDS.MULTIPLE_CRITICAL_FATIGUE_DAYS_CAP,
      });
    } else if (
      criticalFatigueDayCount >= QUALITY_SCORE_THRESHOLDS.SINGLE_CRITICAL_FATIGUE_DAY_COUNT
    ) {
      overallScore = Math.min(
        overallScore,
        QUALITY_SCORE_THRESHOLDS.SINGLE_CRITICAL_FATIGUE_DAY_CAP,
      );
      appliedCaps.push({
        code: 'CRITICAL_FATIGUE_DAY_CAP',
        description: 'At least one itinerary day has critical fatigue.',
        cappedAt: QUALITY_SCORE_THRESHOLDS.SINGLE_CRITICAL_FATIGUE_DAY_CAP,
      });
    }

    if (costStructureMetrics.requiredCostItemsCount === 0) {
      overallScore = Math.min(overallScore, QUALITY_SCORE_THRESHOLDS.MISSING_REQUIRED_COSTS_CAP);
      appliedCaps.push({
        code: 'NO_REQUIRED_COSTS_CAP',
        description:
          'No required cost items are available, so cost and profitability quality cannot be trusted.',
        cappedAt: QUALITY_SCORE_THRESHOLDS.MISSING_REQUIRED_COSTS_CAP,
      });
    }

    if (context.days.length === 0 || context.itineraryItems.length === 0) {
      overallScore = Math.min(overallScore, QUALITY_SCORE_THRESHOLDS.MISSING_ITINERARY_DATA_CAP);
      appliedCaps.push({
        code: 'NO_ITINERARY_DATA_CAP',
        description:
          'No itinerary data is available, so customer experience quality cannot be fully evaluated.',
        cappedAt: QUALITY_SCORE_THRESHOLDS.MISSING_ITINERARY_DATA_CAP,
      });
    }

    return {
      overallScore: this.clamp(
        overallScore,
        QUALITY_SCORE_THRESHOLDS.MIN_SCORE,
        QUALITY_SCORE_THRESHOLDS.MAX_SCORE,
      ),
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
      return QUALITY_SCORE_THRESHOLDS.MIN_SCORE;
    }

    if (input.grossProfit < 0) {
      return QUALITY_SCORE_THRESHOLDS.MIN_SCORE;
    }

    if (input.expectedGroupSize < input.breakEvenGroupSizeRounded) {
      return QUALITY_SCORE_THRESHOLDS.BREAK_EVEN_RISK_SCORE;
    }

    if (
      input.grossMarginPercent >= input.goodMarginPercent &&
      input.breakEvenUtilizationPercent <
        QUALITY_SCORE_THRESHOLDS.LOW_BREAK_EVEN_UTILIZATION_PERCENT
    ) {
      return QUALITY_SCORE_THRESHOLDS.EXCELLENT_PROFITABILITY_SCORE;
    }

    if (input.grossMarginPercent >= input.goodMarginPercent) {
      return QUALITY_SCORE_THRESHOLDS.GOOD_PROFITABILITY_SCORE;
    }

    if (
      input.grossMarginPercent >= input.minTargetMarginPercent &&
      input.breakEvenUtilizationPercent <
        QUALITY_SCORE_THRESHOLDS.MEDIUM_BREAK_EVEN_UTILIZATION_PERCENT
    ) {
      return QUALITY_SCORE_THRESHOLDS.TARGET_MARGIN_LOW_BREAK_EVEN_SCORE;
    }

    if (input.grossMarginPercent >= input.minTargetMarginPercent) {
      return QUALITY_SCORE_THRESHOLDS.TARGET_MARGIN_HIGH_BREAK_EVEN_SCORE;
    }

    if (input.grossMarginPercent >= FINANCIAL_ANALYSIS_THRESHOLDS.VERY_LOW_MARGIN_PERCENT) {
      return QUALITY_SCORE_THRESHOLDS.LOW_MARGIN_SCORE;
    }

    if (input.grossMarginPercent >= 0) {
      return QUALITY_SCORE_THRESHOLDS.VERY_LOW_MARGIN_SCORE;
    }

    return QUALITY_SCORE_THRESHOLDS.MIN_SCORE;
  }

  private calculateItineraryBalanceScore(
    dailyFatigueResults: AnalysisContext['dailyFatigueResults'],
    maxDailyFatigueScore: number,
  ): number {
    if (!dailyFatigueResults?.length) {
      return QUALITY_SCORE_THRESHOLDS.MIN_SCORE;
    }

    const averageDailyBalance =
      dailyFatigueResults.reduce((sum, result) => sum + result.balanceScore, 0) /
      dailyFatigueResults.length;

    const criticalDayPenalty =
      dailyFatigueResults.filter((result) => result.fatigueLevel === FatigueLevel.CRITICAL).length *
      QUALITY_SCORE_THRESHOLDS.CRITICAL_DAY_BALANCE_PENALTY_POINTS;

    const consecutiveHighFatiguePenalty = this.hasConsecutiveHighFatigueDays(
      dailyFatigueResults,
      maxDailyFatigueScore,
    )
      ? QUALITY_SCORE_THRESHOLDS.CONSECUTIVE_HIGH_FATIGUE_PENALTY_POINTS
      : QUALITY_SCORE_THRESHOLDS.MIN_SCORE;

    return this.clamp(
      Math.round(averageDailyBalance - criticalDayPenalty - consecutiveHighFatiguePenalty),
      QUALITY_SCORE_THRESHOLDS.MIN_SCORE,
      QUALITY_SCORE_THRESHOLDS.MAX_SCORE,
    );
  }

  private calculateOperationalFeasibilityScore(
    itineraryMetrics: AnalysisContext['itineraryMetrics'],
    maxTransferMinutesPerDay: number,
  ): number {
    if (!itineraryMetrics?.length) {
      return QUALITY_SCORE_THRESHOLDS.DEFAULT_OPERATIONAL_FEASIBILITY_SCORE;
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

      if (totalTransferMinutes > ITINERARY_RULE_THRESHOLDS.EXCESSIVE_TRANSFER_MINUTES) {
        transferHeavyPenalty += QUALITY_SCORE_THRESHOLDS.EXCESSIVE_TRANSFER_PENALTY_POINTS;
      } else if (totalTransferMinutes > maxTransferMinutesPerDay) {
        transferHeavyPenalty += QUALITY_SCORE_THRESHOLDS.HIGH_TRANSFER_PENALTY_POINTS;
      }

      if (metric.dayDurationMinutes > ITINERARY_RULE_THRESHOLDS.VERY_LONG_DAY_MINUTES) {
        longDayPenalty += QUALITY_SCORE_THRESHOLDS.VERY_LONG_DAY_PENALTY_POINTS;
      } else if (metric.dayDurationMinutes > ITINERARY_RULE_THRESHOLDS.LONG_DAY_MINUTES) {
        longDayPenalty += QUALITY_SCORE_THRESHOLDS.LONG_DAY_PENALTY_POINTS;
      }

      majorItemsCount += metric.activityCount + metric.majorActivityCount;
      missingTimingItemsCount += metric.missingDurationCount + metric.invalidTimingCount;
    }

    for (let index = 1; index < sortedMetrics.length; index += 1) {
      const previous = sortedMetrics[index - 1];
      const current = sortedMetrics[index];

      if (previous.finishesLate && current.startsEarly) {
        lateFinishEarlyStartPenalty +=
          QUALITY_SCORE_THRESHOLDS.LATE_FINISH_EARLY_START_PENALTY_POINTS;
      }
    }

    if (
      majorItemsCount > 0 &&
      missingTimingItemsCount / majorItemsCount >
        QUALITY_SCORE_THRESHOLDS.INCOMPLETE_TIMING_DATA_SHARE
    ) {
      missingTimingDataPenalty = QUALITY_SCORE_THRESHOLDS.INCOMPLETE_TIMING_DATA_PENALTY_POINTS;
    }

    const shortBufferPenalty = Math.min(
      shortBufferCount * QUALITY_SCORE_THRESHOLDS.SHORT_BUFFER_PENALTY_POINTS,
      QUALITY_SCORE_THRESHOLDS.MAX_SHORT_BUFFER_PENALTY_POINTS,
    );

    const totalPenalty =
      shortBufferPenalty +
      transferHeavyPenalty +
      longDayPenalty +
      lateFinishEarlyStartPenalty +
      missingTimingDataPenalty;

    return this.clamp(
      QUALITY_SCORE_THRESHOLDS.MAX_SCORE - totalPenalty,
      QUALITY_SCORE_THRESHOLDS.MIN_SCORE,
      QUALITY_SCORE_THRESHOLDS.MAX_SCORE,
    );
  }

  private calculateCostStructureScore(
    context: AnalysisContext,
    costStructureMetrics: CostStructureMetrics,
  ): number {
    const financial = this.requireFinancialMetrics(context);

    if (costStructureMetrics.requiredCostItemsCount === 0) {
      return QUALITY_SCORE_THRESHOLDS.MIN_SCORE;
    }

    let penalty = 0;

    const hotelShare = this.getCategorySharePercent(context, CostCategory.HOTEL);
    const transportShare = this.getCategorySharePercent(context, CostCategory.TRANSPORT);
    const flightShare = this.getCategorySharePercent(context, CostCategory.FLIGHT);
    const otherShare = this.getCategorySharePercent(context, CostCategory.OTHER);

    if (hotelShare > QUALITY_SCORE_THRESHOLDS.HOTEL_COST_SHARE_PENALTY_THRESHOLD) {
      penalty += QUALITY_SCORE_THRESHOLDS.COST_CATEGORY_PENALTY_POINTS;
    }

    if (transportShare > QUALITY_SCORE_THRESHOLDS.TRANSPORT_COST_SHARE_PENALTY_THRESHOLD) {
      penalty += QUALITY_SCORE_THRESHOLDS.COST_CATEGORY_PENALTY_POINTS;
    }

    if (flightShare > QUALITY_SCORE_THRESHOLDS.FLIGHT_COST_SHARE_PENALTY_THRESHOLD) {
      penalty += QUALITY_SCORE_THRESHOLDS.FLIGHT_COST_PENALTY_POINTS;
    }

    if (otherShare > QUALITY_SCORE_THRESHOLDS.OTHER_COST_SHARE_PENALTY_THRESHOLD) {
      penalty += QUALITY_SCORE_THRESHOLDS.OTHER_COST_PENALTY_POINTS;
    }

    if (
      costStructureMetrics.largestSupplierSharePercent >
      QUALITY_SCORE_THRESHOLDS.HIGH_SUPPLIER_SHARE_PENALTY_THRESHOLD
    ) {
      penalty += QUALITY_SCORE_THRESHOLDS.HIGH_SUPPLIER_SHARE_PENALTY_POINTS;
    } else if (
      costStructureMetrics.largestSupplierSharePercent >
      QUALITY_SCORE_THRESHOLDS.SUPPLIER_SHARE_PENALTY_THRESHOLD
    ) {
      penalty += QUALITY_SCORE_THRESHOLDS.SUPPLIER_SHARE_PENALTY_POINTS;
    }

    if (
      costStructureMetrics.fixedCostSharePercent >
        QUALITY_SCORE_THRESHOLDS.HIGH_FIXED_COST_SHARE_THRESHOLD &&
      financial.breakEvenUtilizationPercent >
        QUALITY_SCORE_THRESHOLDS.HIGH_FIXED_COST_BREAK_EVEN_UTILIZATION_THRESHOLD
    ) {
      penalty += QUALITY_SCORE_THRESHOLDS.FIXED_COST_EXPOSURE_PENALTY_POINTS;
    }

    return this.clamp(
      QUALITY_SCORE_THRESHOLDS.MAX_SCORE - penalty,
      QUALITY_SCORE_THRESHOLDS.MIN_SCORE,
      QUALITY_SCORE_THRESHOLDS.MAX_SCORE,
    );
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
      return QUALITY_SCORE_THRESHOLDS.MIN_SCORE;
    }

    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  private clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  }

  private round(value: number): number {
    return (
      Math.round(value * NUMERIC_FORMAT.PERCENT_MULTIPLIER) / NUMERIC_FORMAT.PERCENT_MULTIPLIER
    );
  }
}
