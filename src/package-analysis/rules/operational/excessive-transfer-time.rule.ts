import { Injectable } from '@nestjs/common';

import { RecommendationCategory } from '../../../common/enums/recommendation-category.enum';
import { RecommendationSeverity } from '../../../common/enums/recommendation-severity.enum';
import { AnalysisContext } from '../../types/analysis-context.type';
import { RecommendationDraft } from '../../types/recommendation-draft.type';
import { RecommendationRule } from '../recommendation-rule.interface';
import { ITINERARY_RULE_THRESHOLDS } from '../../constants/analysis-thresholds.constants';

@Injectable()
export class ExcessiveTransferTimeRule implements RecommendationRule {
  readonly code = 'EXCESSIVE_TRANSFER_TIME';
  readonly category = RecommendationCategory.OPERATIONAL;

  evaluate(context: AnalysisContext): RecommendationDraft[] {
    const itineraryMetrics = context.itineraryMetrics ?? [];

    return itineraryMetrics
      .filter(
        (metric) =>
          metric.transferMinutes + metric.flightMinutes >
          context.configuration.maxTransferMinutesPerDay,
      )
      .map((metric) => {
        const totalTransferMinutes = metric.transferMinutes + metric.flightMinutes;

        return {
          ruleCode: this.code,
          category: this.category,
          severity:
            totalTransferMinutes > ITINERARY_RULE_THRESHOLDS.EXCESSIVE_TRANSFER_MINUTES
              ? RecommendationSeverity.HIGH
              : RecommendationSeverity.MEDIUM,
          title: `Day ${metric.dayNumber} has excessive transfer time`,
          explanation: `Transfer and flight time is ${totalTransferMinutes} minutes, above the configured limit of ${context.configuration.maxTransferMinutesPerDay} minutes.`,
          suggestedAction:
            'Reorder activities geographically, replace distant attractions, or split the route across days.',
          affectedMetric: 'transferMinutes',
          affectedDayId: metric.dayId,
        };
      });
  }
}
