import { Injectable } from '@nestjs/common';

import { RecommendationCategory } from '../../../common/enums/recommendation-category.enum';
import { RecommendationSeverity } from '../../../common/enums/recommendation-severity.enum';
import { AnalysisContext } from '../../types/analysis-context.type';
import { RecommendationDraft } from '../../types/recommendation-draft.type';
import { RecommendationRule } from '../recommendation-rule.interface';

@Injectable()
export class LongDayDurationRule implements RecommendationRule {
  readonly code = 'LONG_DAY_DURATION';
  readonly category = RecommendationCategory.OPERATIONAL;

  evaluate(context: AnalysisContext): RecommendationDraft[] {
    const itineraryMetrics = context.itineraryMetrics ?? [];

    return itineraryMetrics
      .filter((metric) => metric.dayDurationMinutes > 10 * 60)
      .map((metric) => ({
        ruleCode: this.code,
        category: this.category,
        severity: RecommendationSeverity.MEDIUM,
        title: `Day ${metric.dayNumber} is operationally long`,
        explanation: `The planned active day is approximately ${Math.round(metric.dayDurationMinutes / 60)} hours long.`,
        suggestedAction: 'Shorten the day or move non-essential activities to another day.',
        affectedMetric: 'dayDurationMinutes',
        affectedDayId: metric.dayId,
      }));
  }
}
