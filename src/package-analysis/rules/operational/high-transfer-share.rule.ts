import { Injectable } from '@nestjs/common';

import { RecommendationCategory } from '../../../common/enums/recommendation-category.enum';
import { RecommendationSeverity } from '../../../common/enums/recommendation-severity.enum';
import { AnalysisContext } from '../../types/analysis-context.type';
import { RecommendationDraft } from '../../types/recommendation-draft.type';
import { RecommendationRule } from '../recommendation-rule.interface';

@Injectable()
export class HighTransferShareRule implements RecommendationRule {
  readonly code = 'HIGH_TRANSFER_SHARE';
  readonly category = RecommendationCategory.OPERATIONAL;

  evaluate(context: AnalysisContext): RecommendationDraft[] {
    const itineraryMetrics = context.itineraryMetrics ?? [];

    return itineraryMetrics
      .filter((metric) => metric.transferSharePercent > 35)
      .map((metric) => ({
        ruleCode: this.code,
        category: this.category,
        severity:
          metric.transferSharePercent > 50
            ? RecommendationSeverity.HIGH
            : RecommendationSeverity.MEDIUM,
        title: `Day ${metric.dayNumber} is transfer-heavy`,
        explanation: `Transfers and flights represent ${metric.transferSharePercent.toFixed(2)}% of the active day, which means a large part of the customer experience is spent moving between places.`,
        suggestedAction:
          'Optimize route order, replace distant activities with closer alternatives, or split the route across several days.',
        affectedMetric: 'transferSharePercent',
        affectedDayId: metric.dayId,
      }));
  }
}
