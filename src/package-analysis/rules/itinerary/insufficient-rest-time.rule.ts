import { Injectable } from '@nestjs/common';

import { RecommendationCategory } from '../../../common/enums/recommendation-category.enum';
import { RecommendationSeverity } from '../../../common/enums/recommendation-severity.enum';
import { AnalysisContext } from '../../types/analysis-context.type';
import { RecommendationDraft } from '../../types/recommendation-draft.type';
import { RecommendationRule } from '../recommendation-rule.interface';

@Injectable()
export class InsufficientRestTimeRule implements RecommendationRule {
  readonly code = 'INSUFFICIENT_REST_TIME';
  readonly category = RecommendationCategory.ITINERARY;

  evaluate(context: AnalysisContext): RecommendationDraft[] {
    const itineraryMetrics = context.itineraryMetrics ?? [];

    return itineraryMetrics
      .filter((metric) => metric.activityCount >= 3 && metric.freeTimeMinutes < 60)
      .map((metric) => ({
        ruleCode: this.code,
        category: this.category,
        severity: RecommendationSeverity.MEDIUM,
        title: `Day ${metric.dayNumber} has insufficient rest time`,
        explanation: `The day has ${metric.activityCount} activities but only ${metric.freeTimeMinutes} minutes of free time.`,
        suggestedAction: 'Add at least one recovery block or reduce the number of non-essential activities.',
        affectedMetric: 'freeTimeMinutes',
        affectedDayId: metric.dayId,
      }));
  }
}
