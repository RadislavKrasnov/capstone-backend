import { Injectable } from '@nestjs/common';

import { RecommendationSeverity } from '../../common/enums/recommendation-severity.enum';
import { BreakEvenRiskRule } from '../rules/financial/break-even-risk.rule';
import { LowMarginRule } from '../rules/financial/low-margin.rule';
import { NegativeProfitRule } from '../rules/financial/negative-profit.rule';
import { NonPositiveContributionRule } from '../rules/financial/non-positive-contribution.rule';
import { WeakSafetyBufferRule } from '../rules/financial/weak-safety-buffer.rule';
import { ConsecutiveHighFatigueDaysRule } from '../rules/itinerary/consecutive-high-fatigue-days.rule';
import { CriticalFatigueDayRule } from '../rules/itinerary/critical-fatigue-day.rule';
import { InsufficientRestTimeRule } from '../rules/itinerary/insufficient-rest-time.rule';
import { OverloadedDayRule } from '../rules/itinerary/overloaded-day.rule';
import { UnderfilledDayRule } from '../rules/itinerary/underfilled-day.rule';
import { HighOtherCostShareRule } from '../rules/cost-structure/high-other-cost-share.rule';
import { HotelCostDominanceRule } from '../rules/cost-structure/hotel-cost-dominance.rule';
import { SupplierDependencyRiskRule } from '../rules/cost-structure/supplier-dependency-risk.rule';
import { TransportCostDominanceRule } from '../rules/cost-structure/transport-cost-dominance.rule';
import { ExcessiveTransferTimeRule } from '../rules/operational/excessive-transfer-time.rule';
import { LateFinishEarlyStartRule } from '../rules/operational/late-finish-early-start.rule';
import { LongDayDurationRule } from '../rules/operational/long-day-duration.rule';
import { NoMealBreakRule } from '../rules/operational/no-meal-break.rule';
import { ShortBuffersRule } from '../rules/operational/short-buffers.rule';
import { LowQualityScoreRule } from '../rules/quality/low-quality-score.rule';
import { WeakSubScoreRule } from '../rules/quality/weak-sub-score.rule';
import { RecommendationRule } from '../rules/recommendation-rule.interface';
import { AnalysisContext } from '../types/analysis-context.type';
import { RecommendationDraft } from '../types/recommendation-draft.type';
import { HighFixedCostExposureRule } from '../rules/financial/high-fixed-cost-exposure.rule';
import { VeryLowMarginRule } from '../rules/financial/very-low-margin.rule';
import { HighActivityDensityRule } from '../rules/operational/high-activity-density.rule';

@Injectable()
export class RecommendationEngineService {
  private readonly rules: RecommendationRule[];

  constructor(
    negativeProfitRule: NegativeProfitRule,
    lowMarginRule: LowMarginRule,
    breakEvenRiskRule: BreakEvenRiskRule,
    nonPositiveContributionRule: NonPositiveContributionRule,
    weakSafetyBufferRule: WeakSafetyBufferRule,
    overloadedDayRule: OverloadedDayRule,
    criticalFatigueDayRule: CriticalFatigueDayRule,
    insufficientRestTimeRule: InsufficientRestTimeRule,
    underfilledDayRule: UnderfilledDayRule,
    consecutiveHighFatigueDaysRule: ConsecutiveHighFatigueDaysRule,
    excessiveTransferTimeRule: ExcessiveTransferTimeRule,
    shortBuffersRule: ShortBuffersRule,
    longDayDurationRule: LongDayDurationRule,
    noMealBreakRule: NoMealBreakRule,
    lateFinishEarlyStartRule: LateFinishEarlyStartRule,
    supplierDependencyRiskRule: SupplierDependencyRiskRule,
    hotelCostDominanceRule: HotelCostDominanceRule,
    transportCostDominanceRule: TransportCostDominanceRule,
    highOtherCostShareRule: HighOtherCostShareRule,
    lowQualityScoreRule: LowQualityScoreRule,
    weakSubScoreRule: WeakSubScoreRule,
    veryLowMarginRule: VeryLowMarginRule,
    highFixedCostExposureRule: HighFixedCostExposureRule,
    highActivityDensityRule: HighActivityDensityRule,
  ) {
    this.rules = [
      negativeProfitRule,
      lowMarginRule,
      veryLowMarginRule,
      breakEvenRiskRule,
      nonPositiveContributionRule,
      weakSafetyBufferRule,
      highFixedCostExposureRule,

      overloadedDayRule,
      criticalFatigueDayRule,
      insufficientRestTimeRule,
      underfilledDayRule,
      consecutiveHighFatigueDaysRule,

      excessiveTransferTimeRule,
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

    return this.prioritize(this.deduplicate(recommendations));
  }

  private deduplicate(recommendations: RecommendationDraft[]): RecommendationDraft[] {
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

  private prioritize(recommendations: RecommendationDraft[]): RecommendationDraft[] {
    return [...recommendations].sort((a, b) => {
      const severityDiff = this.getSeverityOrder(a.severity) - this.getSeverityOrder(b.severity);

      if (severityDiff !== 0) {
        return severityDiff;
      }

      return a.ruleCode.localeCompare(b.ruleCode);
    });
  }

  private getSeverityOrder(severity: RecommendationSeverity): number {
    const order: Record<RecommendationSeverity, number> = {
      [RecommendationSeverity.CRITICAL]: 0,
      [RecommendationSeverity.HIGH]: 1,
      [RecommendationSeverity.MEDIUM]: 2,
      [RecommendationSeverity.LOW]: 3,
    };

    return order[severity];
  }
}
