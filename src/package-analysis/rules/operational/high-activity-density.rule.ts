import { Injectable } from '@nestjs/common';

import { RecommendationCategory } from '../../../common/enums/recommendation-category.enum';
import { RecommendationSeverity } from '../../../common/enums/recommendation-severity.enum';
import { AnalysisContext } from '../../types/analysis-context.type';
import { RecommendationDraft } from '../../types/recommendation-draft.type';
import { RecommendationRule } from '../recommendation-rule.interface';

@Injectable()
export class HighActivityDensityRule implements RecommendationRule {
  readonly code = 'HIGH_ACTIVITY_DENSITY';
  readonly category = RecommendationCategory.ITINERARY;

  evaluate(context: AnalysisContext): RecommendationDraft[] {
    const itineraryMetrics = context.itineraryMetrics ?? [];

    return itineraryMetrics
      .filter((metric) => metric.activityDensity > 0.65)
      .map((metric) => ({
        ruleCode: this.code,
        category: this.category,
        severity: RecommendationSeverity.MEDIUM,
        title: `Day ${metric.dayNumber} has high activity density`,
        explanation: `Activity density is ${metric.activityDensity.toFixed(2)} activities per active hour, which may make the day feel rushed.`,
        suggestedAction:
          'Increase time gaps, reduce activity count, or spread activities across the day.',
        affectedMetric: 'activityDensity',
        affectedDayId: metric.dayId,
      }));
  }
}
