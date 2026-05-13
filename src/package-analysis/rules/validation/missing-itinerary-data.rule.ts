import { Injectable } from '@nestjs/common';

import { RecommendationCategory } from '../../../common/enums/recommendation-category.enum';
import { RecommendationSeverity } from '../../../common/enums/recommendation-severity.enum';
import { AnalysisContext } from '../../types/analysis-context.type';
import { RecommendationDraft } from '../../types/recommendation-draft.type';
import { RecommendationRule } from '../recommendation-rule.interface';

@Injectable()
export class MissingItineraryDataRule implements RecommendationRule {
  readonly code = 'MISSING_ITINERARY_DATA';
  readonly category = RecommendationCategory.ITINERARY;

  evaluate(context: AnalysisContext): RecommendationDraft[] {
    if (context.days.length > 0 && context.itineraryItems.length > 0) {
      return [];
    }

    return [
      {
        ruleCode: this.code,
        category: this.category,
        severity: RecommendationSeverity.CRITICAL,
        title: 'Itinerary data is missing',
        explanation:
          'The package has no complete itinerary structure, so balance and fatigue analysis cannot be performed reliably.',
        suggestedAction:
          'Add tour days and itinerary items before evaluating package quality or publishing the package.',
        affectedMetric: 'itineraryBalanceScore',
      },
    ];
  }
}
