import { Injectable } from '@nestjs/common';

import { RecommendationCategory } from '../../../common/enums/recommendation-category.enum';
import { RecommendationSeverity } from '../../../common/enums/recommendation-severity.enum';
import { AnalysisContext } from '../../types/analysis-context.type';
import { RecommendationDraft } from '../../types/recommendation-draft.type';
import { RecommendationRule } from '../recommendation-rule.interface';
import {
  ITINERARY_RULE_THRESHOLDS,
  NUMERIC_FORMAT,
} from '../../constants/analysis-thresholds.constants';

@Injectable()
export class LongDayDurationRule implements RecommendationRule {
  readonly code = 'LONG_DAY_DURATION';
  readonly category = RecommendationCategory.OPERATIONAL;

  evaluate(context: AnalysisContext): RecommendationDraft[] {
    const itineraryMetrics = context.itineraryMetrics ?? [];

    return itineraryMetrics
      .filter((metric) => metric.dayDurationMinutes > ITINERARY_RULE_THRESHOLDS.LONG_DAY_MINUTES)
      .map((metric) => ({
        ruleCode: this.code,
        category: this.category,
        severity:
          metric.dayDurationMinutes > ITINERARY_RULE_THRESHOLDS.VERY_LONG_DAY_MINUTES
            ? RecommendationSeverity.HIGH
            : RecommendationSeverity.MEDIUM,
        title: `Day ${metric.dayNumber} is operationally long`,
        explanation: `The planned active day is approximately ${Math.round(metric.dayDurationMinutes / NUMERIC_FORMAT.MINUTES_PER_HOUR)} hours long.`,
        suggestedAction:
          'Shorten the day, move an evening activity, or add a later start the next day.',
        affectedMetric: 'dayDurationMinutes',
        affectedDayId: metric.dayId,
      }));
  }
}
