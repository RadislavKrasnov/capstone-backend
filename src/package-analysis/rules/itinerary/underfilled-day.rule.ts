import { Injectable } from '@nestjs/common';

import { RecommendationCategory } from '../../../common/enums/recommendation-category.enum';
import { RecommendationSeverity } from '../../../common/enums/recommendation-severity.enum';
import { AnalysisContext } from '../../types/analysis-context.type';
import { RecommendationDraft } from '../../types/recommendation-draft.type';
import { RecommendationRule } from '../recommendation-rule.interface';

@Injectable()
export class UnderfilledDayRule implements RecommendationRule {
  readonly code = 'UNDERFILLED_DAY';
  readonly category = RecommendationCategory.ITINERARY;

  evaluate(context: AnalysisContext): RecommendationDraft[] {
    const itineraryMetrics = context.itineraryMetrics ?? [];

    return itineraryMetrics
      .filter((metric) => metric.activityCount === 0 && metric.transferMinutes + metric.flightMinutes < 60 && metric.dayDurationMinutes < 3 * 60)
      .map((metric) => ({
        ruleCode: this.code,
        category: this.category,
        severity: RecommendationSeverity.LOW,
        title: `Day ${metric.dayNumber} may be underfilled`,
        explanation: 'The day has very limited planned activity and does not appear to be a clearly marked transfer or rest day.',
        suggestedAction: 'Add a light optional activity, cultural stop, or explicitly position this day as a rest day in the itinerary description.',
        affectedMetric: 'activityCount',
        affectedDayId: metric.dayId,
      }));
  }
}
