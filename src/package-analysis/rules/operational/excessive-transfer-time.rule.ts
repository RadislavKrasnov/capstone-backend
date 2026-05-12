import { Injectable } from '@nestjs/common';

import { RecommendationCategory } from '../../../common/enums/recommendation-category.enum';
import { RecommendationSeverity } from '../../../common/enums/recommendation-severity.enum';
import { AnalysisContext } from '../../types/analysis-context.type';
import { RecommendationDraft } from '../../types/recommendation-draft.type';
import { RecommendationRule } from '../recommendation-rule.interface';

@Injectable()
export class ExcessiveTransferTimeRule implements RecommendationRule {
  readonly code = 'EXCESSIVE_TRANSFER_TIME';
  readonly category = RecommendationCategory.OPERATIONAL;

  evaluate(context: AnalysisContext): RecommendationDraft[] {
    const itineraryMetrics = context.itineraryMetrics ?? [];

    return itineraryMetrics
      .filter((metric) => metric.transferMinutes + metric.flightMinutes > context.configuration.maxTransferMinutesPerDay)
      .map((metric) => ({
        ruleCode: this.code,
        category: this.category,
        severity: RecommendationSeverity.HIGH,
        title: `Day ${metric.dayNumber} has excessive transfer time`,
        explanation: `Transfer and flight time is ${metric.transferMinutes + metric.flightMinutes} minutes, above the configured limit of ${context.configuration.maxTransferMinutesPerDay} minutes.`,
        suggestedAction: 'Split the route, replace one transfer with a nearer activity, or add an overnight stop.',
        affectedMetric: 'transferMinutes',
        affectedDayId: metric.dayId,
      }));
  }
}
