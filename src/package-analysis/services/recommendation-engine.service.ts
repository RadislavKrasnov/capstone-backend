import { Injectable } from '@nestjs/common';

import { RecommendationCategory } from '../../common/enums/recommendation-category.enum';
import { RecommendationSeverity } from '../../common/enums/recommendation-severity.enum';
import { HighOtherCostShareRule } from '../rules/cost-structure/high-other-cost-share.rule';
import { HotelCostDominanceRule } from '../rules/cost-structure/hotel-cost-dominance.rule';
import { SupplierDependencyRiskRule } from '../rules/cost-structure/supplier-dependency-risk.rule';
import { TransportCostDominanceRule } from '../rules/cost-structure/transport-cost-dominance.rule';
import { BreakEvenRiskRule } from '../rules/financial/break-even-risk.rule';
import { HighFixedCostExposureRule } from '../rules/financial/high-fixed-cost-exposure.rule';
import { LowMarginRule } from '../rules/financial/low-margin.rule';
import { NegativeProfitRule } from '../rules/financial/negative-profit.rule';
import { NonPositiveContributionRule } from '../rules/financial/non-positive-contribution.rule';
import { VeryLowMarginRule } from '../rules/financial/very-low-margin.rule';
import { WeakSafetyBufferRule } from '../rules/financial/weak-safety-buffer.rule';
import { ConsecutiveHighFatigueDaysRule } from '../rules/itinerary/consecutive-high-fatigue-days.rule';
import { CriticalFatigueDayRule } from '../rules/itinerary/critical-fatigue-day.rule';
import { InsufficientRestTimeRule } from '../rules/itinerary/insufficient-rest-time.rule';
import { OverloadedDayRule } from '../rules/itinerary/overloaded-day.rule';
import { UnderfilledDayRule } from '../rules/itinerary/underfilled-day.rule';
import { ExcessiveTransferTimeRule } from '../rules/operational/excessive-transfer-time.rule';
import { HighActivityDensityRule } from '../rules/operational/high-activity-density.rule';
import { HighTransferShareRule } from '../rules/operational/high-transfer-share.rule';
import { LateFinishEarlyStartRule } from '../rules/operational/late-finish-early-start.rule';
import { LongDayDurationRule } from '../rules/operational/long-day-duration.rule';
import { NoMealBreakRule } from '../rules/operational/no-meal-break.rule';
import { ShortBuffersRule } from '../rules/operational/short-buffers.rule';
import { LowQualityScoreRule } from '../rules/quality/low-quality-score.rule';
import { WeakSubScoreRule } from '../rules/quality/weak-sub-score.rule';
import { RecommendationRule } from '../rules/recommendation-rule.interface';
import { IncompleteTimeDataRule } from '../rules/validation/incomplete-time-data.rule';
import { MissingCostDataRule } from '../rules/validation/missing-cost-data.rule';
import { MissingItineraryDataRule } from '../rules/validation/missing-itinerary-data.rule';
import { AnalysisContext } from '../types/analysis-context.type';
import { RecommendationDraft } from '../types/recommendation-draft.type';
import { RECOMMENDATION_PRIORITY } from '../constants/analysis-thresholds.constants';

@Injectable()
export class RecommendationEngineService {
  private readonly rules: RecommendationRule[];

  constructor(
    missingCostDataRule: MissingCostDataRule,
    missingItineraryDataRule: MissingItineraryDataRule,
    incompleteTimeDataRule: IncompleteTimeDataRule,

    negativeProfitRule: NegativeProfitRule,
    lowMarginRule: LowMarginRule,
    veryLowMarginRule: VeryLowMarginRule,
    breakEvenRiskRule: BreakEvenRiskRule,
    nonPositiveContributionRule: NonPositiveContributionRule,
    weakSafetyBufferRule: WeakSafetyBufferRule,
    highFixedCostExposureRule: HighFixedCostExposureRule,

    overloadedDayRule: OverloadedDayRule,
    criticalFatigueDayRule: CriticalFatigueDayRule,
    insufficientRestTimeRule: InsufficientRestTimeRule,
    underfilledDayRule: UnderfilledDayRule,
    consecutiveHighFatigueDaysRule: ConsecutiveHighFatigueDaysRule,

    excessiveTransferTimeRule: ExcessiveTransferTimeRule,
    highTransferShareRule: HighTransferShareRule,
    shortBuffersRule: ShortBuffersRule,
    longDayDurationRule: LongDayDurationRule,
    noMealBreakRule: NoMealBreakRule,
    lateFinishEarlyStartRule: LateFinishEarlyStartRule,
    highActivityDensityRule: HighActivityDensityRule,

    supplierDependencyRiskRule: SupplierDependencyRiskRule,
    hotelCostDominanceRule: HotelCostDominanceRule,
    transportCostDominanceRule: TransportCostDominanceRule,
    highOtherCostShareRule: HighOtherCostShareRule,

    lowQualityScoreRule: LowQualityScoreRule,
    weakSubScoreRule: WeakSubScoreRule,
  ) {
    this.rules = [
      missingCostDataRule,
      missingItineraryDataRule,
      incompleteTimeDataRule,

      negativeProfitRule,
      nonPositiveContributionRule,
      breakEvenRiskRule,
      veryLowMarginRule,
      lowMarginRule,
      weakSafetyBufferRule,
      highFixedCostExposureRule,

      criticalFatigueDayRule,
      overloadedDayRule,
      consecutiveHighFatigueDaysRule,
      insufficientRestTimeRule,
      underfilledDayRule,

      excessiveTransferTimeRule,
      highTransferShareRule,
      shortBuffersRule,
      longDayDurationRule,
      noMealBreakRule,
      lateFinishEarlyStartRule,
      highActivityDensityRule,

      supplierDependencyRiskRule,
      hotelCostDominanceRule,
      transportCostDominanceRule,
      highOtherCostShareRule,

      lowQualityScoreRule,
      weakSubScoreRule,
    ];
  }

  generateRecommendations(context: AnalysisContext): RecommendationDraft[] {
    const recommendations = this.rules.flatMap((rule) => rule.evaluate(context));

    return this.prioritize(
      this.deduplicateOverlaps(this.deduplicateExact(recommendations), context),
      context,
    );
  }

  private deduplicateExact(recommendations: RecommendationDraft[]): RecommendationDraft[] {
    const seen = new Set<string>();
    const result: RecommendationDraft[] = [];

    for (const recommendation of recommendations) {
      const key = [
        recommendation.ruleCode,
        recommendation.affectedMetric ?? '',
        recommendation.affectedDayId ?? '',
        recommendation.affectedItemId ?? '',
      ].join(':');

      if (seen.has(key)) {
        continue;
      }

      seen.add(key);
      result.push(recommendation);
    }

    return result;
  }

  private deduplicateOverlaps(
    recommendations: RecommendationDraft[],
    context: AnalysisContext,
  ): RecommendationDraft[] {
    const ruleCodes = new Set(recommendations.map((recommendation) => recommendation.ruleCode));

    return recommendations.filter((recommendation) => {
      if (
        recommendation.ruleCode === 'LOW_MARGIN' &&
        (ruleCodes.has('NEGATIVE_PROFIT') || ruleCodes.has('VERY_LOW_MARGIN'))
      ) {
        return false;
      }

      if (recommendation.ruleCode === 'VERY_LOW_MARGIN' && ruleCodes.has('NEGATIVE_PROFIT')) {
        return false;
      }

      if (
        recommendation.ruleCode === 'BREAK_EVEN_RISK' &&
        ruleCodes.has('NON_POSITIVE_CONTRIBUTION')
      ) {
        return false;
      }

      if (
        recommendation.ruleCode === 'WEAK_BREAK_EVEN_SAFETY' &&
        ruleCodes.has('BREAK_EVEN_RISK')
      ) {
        return false;
      }

      if (recommendation.ruleCode === 'OVERLOADED_DAY') {
        const hasCriticalFatigueForSameDay = recommendations.some(
          (item) =>
            item.ruleCode === 'CRITICAL_FATIGUE_DAY' &&
            item.affectedDayId === recommendation.affectedDayId,
        );

        if (hasCriticalFatigueForSameDay) {
          return false;
        }
      }

      if (
        recommendation.ruleCode === 'LOW_QUALITY_SCORE' &&
        recommendation.severity !== RecommendationSeverity.CRITICAL
      ) {
        const hasSpecificHighPriorityIssue = recommendations.some(
          (item) =>
            item.ruleCode !== 'LOW_QUALITY_SCORE' &&
            this.getSeverityWeight(item.severity) >=
              this.getSeverityWeight(RecommendationSeverity.HIGH),
        );

        if (hasSpecificHighPriorityIssue && context.qualityScore?.overallScore !== undefined) {
          return true;
        }
      }

      return true;
    });
  }

  private prioritize(
    recommendations: RecommendationDraft[],
    context: AnalysisContext,
  ): RecommendationDraft[] {
    return [...recommendations].sort((a, b) => {
      const priorityDiff =
        this.calculatePriorityScore(b, context) - this.calculatePriorityScore(a, context);

      if (priorityDiff !== 0) {
        return priorityDiff;
      }

      return a.ruleCode.localeCompare(b.ruleCode);
    });
  }

  private calculatePriorityScore(
    recommendation: RecommendationDraft,
    context: AnalysisContext,
  ): number {
    return (
      this.getSeverityWeight(recommendation.severity) *
        RECOMMENDATION_PRIORITY.SEVERITY_MULTIPLIER +
      this.getCategoryWeight(recommendation.category) *
        RECOMMENDATION_PRIORITY.CATEGORY_MULTIPLIER +
      this.getImpactWeight(recommendation, context)
    );
  }

  private getSeverityWeight(severity: RecommendationSeverity): number {
    const weights: Record<RecommendationSeverity, number> = {
      [RecommendationSeverity.CRITICAL]: 4,
      [RecommendationSeverity.HIGH]: 3,
      [RecommendationSeverity.MEDIUM]: 2,
      [RecommendationSeverity.LOW]: 1,
    };

    return weights[severity];
  }

  private getCategoryWeight(category: RecommendationCategory): number {
    const weights: Record<RecommendationCategory, number> = {
      [RecommendationCategory.FINANCIAL]: 4,
      [RecommendationCategory.ITINERARY]: 3,
      [RecommendationCategory.OPERATIONAL]: 2,
      [RecommendationCategory.COST_STRUCTURE]: 1,
    };

    return weights[category];
  }

  private getImpactWeight(recommendation: RecommendationDraft, context: AnalysisContext): number {
    const financial = context.financialMetrics;

    if (recommendation.affectedMetric === 'grossMarginPercent' && financial) {
      const targetMargin = Number(context.configuration.minTargetMarginPercent);

      return Math.min(
        Math.abs(targetMargin - financial.grossMarginPercent),
        RECOMMENDATION_PRIORITY.MAX_IMPACT_WEIGHT,
      );
    }

    if (recommendation.affectedMetric === 'fatigueScore' && recommendation.affectedDayId) {
      const dailyResult = context.dailyFatigueResults?.find(
        (item) => item.dayId === recommendation.affectedDayId,
      );

      if (dailyResult) {
        return Math.min(
          Math.max(0, dailyResult.fatigueScore - context.configuration.maxDailyFatigueScore),
          20,
        );
      }
    }

    if (recommendation.affectedMetric === 'transferMinutes' && recommendation.affectedDayId) {
      const metric = context.itineraryMetrics?.find(
        (item) => item.dayId === recommendation.affectedDayId,
      );

      if (metric) {
        const transferMinutes = metric.transferMinutes + metric.flightMinutes;

        return Math.min(
          Math.max(
            0,
            (transferMinutes - context.configuration.maxTransferMinutesPerDay) /
              RECOMMENDATION_PRIORITY.TRANSFER_DELAY_IMPACT_DIVISOR,
          ),
          20,
        );
      }
    }

    if (recommendation.affectedMetric === 'transferSharePercent' && recommendation.affectedDayId) {
      const metric = context.itineraryMetrics?.find(
        (item) => item.dayId === recommendation.affectedDayId,
      );

      if (metric) {
        return Math.min(
          Math.max(
            0,
            metric.transferSharePercent - RECOMMENDATION_PRIORITY.TRANSFER_SHARE_BASELINE_PERCENT,
          ),
          RECOMMENDATION_PRIORITY.MAX_IMPACT_WEIGHT,
        );
      }
    }

    if (recommendation.affectedMetric === 'largestSupplierSharePercent') {
      const largestSupplierShare = financial?.supplierCostBreakdown[0]?.sharePercent ?? 0;

      return Math.min(
        Math.max(0, largestSupplierShare - RECOMMENDATION_PRIORITY.SUPPLIER_SHARE_BASELINE_PERCENT),
        RECOMMENDATION_PRIORITY.MAX_IMPACT_WEIGHT,
      );
    }

    if (recommendation.affectedMetric?.includes('CostSharePercent')) {
      return RECOMMENDATION_PRIORITY.COST_SHARE_IMPACT_WEIGHT;
    }

    return 0;
  }
}
