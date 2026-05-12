import { Injectable } from '@nestjs/common';

import { RecommendationCategory } from '../../../common/enums/recommendation-category.enum';
import { RecommendationSeverity } from '../../../common/enums/recommendation-severity.enum';
import { AnalysisContext } from '../../types/analysis-context.type';
import { RecommendationDraft } from '../../types/recommendation-draft.type';
import { RecommendationRule } from '../recommendation-rule.interface';

@Injectable()
export class LateFinishEarlyStartRule implements RecommendationRule {
  readonly code = 'LATE_FINISH_EARLY_START';
  readonly category = RecommendationCategory.OPERATIONAL;

  evaluate(context: AnalysisContext): RecommendationDraft[] {
    const recommendations: RecommendationDraft[] = [];
    const itineraryMetrics = [...(context.itineraryMetrics ?? [])].sort((a, b) => a.dayNumber - b.dayNumber);

    for (let index = 1; index < itineraryMetrics.length; index += 1) {
      const previous = itineraryMetrics[index - 1];
      const current = itineraryMetrics[index];

      if (previous.finishesLate && current.startsEarly) {
        recommendations.push({
          ruleCode: this.code,
          category: this.category,
          severity: RecommendationSeverity.MEDIUM,
          title: `Late finish before early start between days ${previous.dayNumber} and ${current.dayNumber}`,
          explanation: 'A late finish followed by an early start reduces recovery time and increases operational risk.',
          suggestedAction: 'Move the next morning activity later or shorten the previous evening plan.',
          affectedMetric: 'dailyScheduleTiming',
          affectedDayId: current.dayId,
        });
      }
    }

    return recommendations;
  }
}
