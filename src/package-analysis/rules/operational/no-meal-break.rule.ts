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
export class NoMealBreakRule implements RecommendationRule {
  readonly code = 'NO_MEAL_BREAK';
  readonly category = RecommendationCategory.OPERATIONAL;

  evaluate(context: AnalysisContext): RecommendationDraft[] {
    const itineraryMetrics = context.itineraryMetrics ?? [];

    return itineraryMetrics
      .filter(
        (metric) =>
          metric.dayDurationMinutes >
            ITINERARY_RULE_THRESHOLDS.LONG_DAY_REQUIRES_MEAL_BREAK_MINUTES && !metric.hasMealBreak,
      )
      .map((metric) => ({
        ruleCode: this.code,
        category: this.category,
        severity: RecommendationSeverity.MEDIUM,
        title: `Day ${metric.dayNumber} has no clear meal break`,
        explanation: `The itinerary day lasts ${Math.round(metric.dayDurationMinutes / NUMERIC_FORMAT.MINUTES_PER_HOUR)} hours but has no planned meal block.`,
        suggestedAction: 'Add a meal break to improve comfort and schedule realism.',
        affectedMetric: 'mealMinutes',
        affectedDayId: metric.dayId,
      }));
  }
}
