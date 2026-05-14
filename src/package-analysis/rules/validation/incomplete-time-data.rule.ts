import { Injectable } from '@nestjs/common';

import { RecommendationCategory } from '../../../common/enums/recommendation-category.enum';
import { RecommendationSeverity } from '../../../common/enums/recommendation-severity.enum';
import { AnalysisContext } from '../../types/analysis-context.type';
import { RecommendationDraft } from '../../types/recommendation-draft.type';
import { RecommendationRule } from '../recommendation-rule.interface';
import {
  NUMERIC_FORMAT,
  RECOMMENDATION_RULE_THRESHOLDS,
} from '../../constants/analysis-thresholds.constants';

@Injectable()
export class IncompleteTimeDataRule implements RecommendationRule {
  readonly code = 'INCOMPLETE_TIME_DATA';
  readonly category = RecommendationCategory.OPERATIONAL;

  evaluate(context: AnalysisContext): RecommendationDraft[] {
    const itineraryMetrics = context.itineraryMetrics ?? [];

    const totalMajorItems = itineraryMetrics.reduce(
      (sum, metric) => sum + metric.activityCount + metric.majorActivityCount,
      0,
    );

    const incompleteItems = itineraryMetrics.reduce(
      (sum, metric) => sum + metric.missingDurationCount + metric.invalidTimingCount,
      0,
    );

    if (
      totalMajorItems === 0 ||
      incompleteItems / totalMajorItems <= RECOMMENDATION_RULE_THRESHOLDS.INCOMPLETE_TIME_DATA_SHARE
    ) {
      return [];
    }

    const incompletePercent =
      (incompleteItems / totalMajorItems) * NUMERIC_FORMAT.PERCENT_MULTIPLIER;

    return [
      {
        ruleCode: this.code,
        category: this.category,
        severity: RecommendationSeverity.MEDIUM,
        title: 'Some major itinerary items have incomplete timing data',
        explanation: `${incompletePercent.toFixed(2)}% of major itinerary items have missing or invalid time/duration data, reducing schedule analysis accuracy.`,
        suggestedAction:
          'Add start time, end time, or duration for major activities, transfers, and flights.',
        affectedMetric: 'operationalFeasibilityScore',
      },
    ];
  }
}
