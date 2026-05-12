import { Injectable } from '@nestjs/common';

import { RecommendationCategory } from '../../../common/enums/recommendation-category.enum';
import { RecommendationSeverity } from '../../../common/enums/recommendation-severity.enum';
import { AnalysisContext } from '../../types/analysis-context.type';
import { RecommendationDraft } from '../../types/recommendation-draft.type';
import { RecommendationRule } from '../recommendation-rule.interface';

@Injectable()
export class ShortBuffersRule implements RecommendationRule {
  readonly code = 'SHORT_BUFFERS';
  readonly category = RecommendationCategory.OPERATIONAL;

  evaluate(context: AnalysisContext): RecommendationDraft[] {
    const itineraryMetrics = context.itineraryMetrics ?? [];

    return itineraryMetrics
      .filter((metric) => metric.shortBufferCount > 0)
      .map((metric) => ({
        ruleCode: this.code,
        category: this.category,
        severity:
          metric.shortBufferCount >= 3
            ? RecommendationSeverity.HIGH
            : RecommendationSeverity.MEDIUM,
        title: `Day ${metric.dayNumber} has short operational buffers`,
        explanation: `${metric.shortBufferCount} transition(s) have less than ${context.configuration.minBufferMinutes} minutes of buffer time.`,
        suggestedAction:
          'Add buffer time between major activities and transfers to reduce delay risk.',
        affectedMetric: 'shortBufferCount',
        affectedDayId: metric.dayId,
      }));
  }
}
