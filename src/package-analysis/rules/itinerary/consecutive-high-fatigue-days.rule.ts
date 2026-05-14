import { Injectable } from '@nestjs/common';

import { RecommendationCategory } from '../../../common/enums/recommendation-category.enum';
import { RecommendationSeverity } from '../../../common/enums/recommendation-severity.enum';
import { AnalysisContext } from '../../types/analysis-context.type';
import { RecommendationDraft } from '../../types/recommendation-draft.type';
import { RecommendationRule } from '../recommendation-rule.interface';
import { ITINERARY_RULE_THRESHOLDS } from '../../constants/analysis-thresholds.constants';

@Injectable()
export class ConsecutiveHighFatigueDaysRule implements RecommendationRule {
  readonly code = 'CONSECUTIVE_HIGH_FATIGUE_DAYS';
  readonly category = RecommendationCategory.ITINERARY;

  evaluate(context: AnalysisContext): RecommendationDraft[] {
    const recommendations: RecommendationDraft[] = [];
    const dailyResults = [...(context.dailyFatigueResults ?? [])].sort(
      (a, b) => a.dayNumber - b.dayNumber,
    );

    for (let index = 1; index < dailyResults.length; index += 1) {
      const previous = dailyResults[index - 1];
      const current = dailyResults[index];

      if (
        previous.fatigueScore >= ITINERARY_RULE_THRESHOLDS.HIGH_FATIGUE_SCORE &&
        current.fatigueScore >= ITINERARY_RULE_THRESHOLDS.HIGH_FATIGUE_SCORE
      ) {
        recommendations.push({
          ruleCode: this.code,
          category: this.category,
          severity: RecommendationSeverity.HIGH,
          title: `Days ${previous.dayNumber}-${current.dayNumber} are consecutively intensive`,
          explanation:
            'Two high-fatigue days in a row increase the risk of poor traveler experience.',
          suggestedAction:
            'Insert a lighter day, free-time block, or shorter transfer between these days.',
          affectedMetric: 'fatigueScore',
          affectedDayId: current.dayId,
        });
      }
    }

    return recommendations;
  }
}
