import { Injectable } from '@nestjs/common';

import { RecommendationCategory } from '../../../common/enums/recommendation-category.enum';
import { RecommendationSeverity } from '../../../common/enums/recommendation-severity.enum';
import { AnalysisContext } from '../../types/analysis-context.type';
import { RecommendationDraft } from '../../types/recommendation-draft.type';
import { RecommendationRule } from '../recommendation-rule.interface';
import { ITINERARY_RULE_THRESHOLDS } from '../../constants/analysis-thresholds.constants';

@Injectable()
export class UnderfilledDayRule implements RecommendationRule {
  readonly code = 'UNDERFILLED_DAY';
  readonly category = RecommendationCategory.ITINERARY;

  evaluate(context: AnalysisContext): RecommendationDraft[] {
    const itineraryMetrics = context.itineraryMetrics ?? [];

    return itineraryMetrics
      .filter(
        (metric) =>
          !metric.isRestDay &&
          ((metric.activityCount === 0 &&
            metric.freeTimeMinutes <
              ITINERARY_RULE_THRESHOLDS.MIN_FREE_TIME_FOR_EMPTY_NON_REST_DAY_MINUTES) ||
            (metric.activityCount === 1 &&
              metric.dayDurationMinutes <
                ITINERARY_RULE_THRESHOLDS.SHORT_ACTIVITY_DAY_DURATION_MINUTES)),
      )
      .map((metric) => ({
        ruleCode: this.code,
        category: this.category,
        severity:
          metric.activityCount === 0 ? RecommendationSeverity.MEDIUM : RecommendationSeverity.LOW,
        title: `Day ${metric.dayNumber} may be underfilled`,
        explanation:
          metric.activityCount === 0
            ? 'The day has no planned activity and does not appear to be marked as an intentional rest day.'
            : 'The day has only one short planned activity, which may reduce perceived package value.',
        suggestedAction:
          'Add a meaningful activity, mark the day as a rest day, or improve the public day description.',
        affectedMetric: 'activityCount',
        affectedDayId: metric.dayId,
      }));
  }
}
