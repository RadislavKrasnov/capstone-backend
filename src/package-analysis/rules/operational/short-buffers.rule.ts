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
        severity: RecommendationSeverity.MEDIUM,
        title: `Day ${metric.dayNumber} has short operational buffers`,
        explanation: `${metric.shortBufferCount} transition(s) have less than ${context.configuration.minBufferMinutes} minutes of buffer time.`,
        suggestedAction: 'Increase time between activities to reduce delays and execution risk.',
        affectedMetric: 'shortBufferCount',
        affectedDayId: metric.dayId,
      }));
  }
}
