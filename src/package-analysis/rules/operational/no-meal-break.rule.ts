import { Injectable } from '@nestjs/common';

import { RecommendationCategory } from '../../../common/enums/recommendation-category.enum';
import { RecommendationSeverity } from '../../../common/enums/recommendation-severity.enum';
import { AnalysisContext } from '../../types/analysis-context.type';
import { RecommendationDraft } from '../../types/recommendation-draft.type';
import { RecommendationRule } from '../recommendation-rule.interface';

@Injectable()
export class NoMealBreakRule implements RecommendationRule {
  readonly code = 'NO_MEAL_BREAK';
  readonly category = RecommendationCategory.OPERATIONAL;

  evaluate(context: AnalysisContext): RecommendationDraft[] {
    const itineraryMetrics = context.itineraryMetrics ?? [];

    return itineraryMetrics
      .filter((metric) => !metric.hasMealBreak && metric.activityCount >= 3)
      .map((metric) => ({
        ruleCode: this.code,
        category: this.category,
        severity: RecommendationSeverity.MEDIUM,
        title: `Day ${metric.dayNumber} has no clear meal break`,
        explanation: 'The itinerary has several activities but no planned meal block.',
        suggestedAction: 'Add a meal break or explicitly mark time for lunch/dinner.',
        affectedMetric: 'mealMinutes',
        affectedDayId: metric.dayId,
      }));
  }
}
