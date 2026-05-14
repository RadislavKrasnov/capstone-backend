import { Injectable } from '@nestjs/common';

import { RecommendationCategory } from '../../../common/enums/recommendation-category.enum';
import { RecommendationSeverity } from '../../../common/enums/recommendation-severity.enum';
import { AnalysisContext } from '../../types/analysis-context.type';
import { RecommendationDraft } from '../../types/recommendation-draft.type';
import { RecommendationRule } from '../recommendation-rule.interface';
import { RECOMMENDATION_RULE_THRESHOLDS } from '../../constants/analysis-thresholds.constants';

@Injectable()
export class WeakSafetyBufferRule implements RecommendationRule {
  readonly code = 'WEAK_BREAK_EVEN_SAFETY';
  readonly category = RecommendationCategory.FINANCIAL;

  evaluate(context: AnalysisContext): RecommendationDraft[] {
    const financial = context.financialMetrics;
    const expectedGroupSize = context.package.expectedGroupSize;

    if (
      !financial ||
      financial.contributionPerPerson <= 0 ||
      expectedGroupSize < financial.breakEvenGroupSizeRounded ||
      financial.breakEvenSafetyTravelers >
        RECOMMENDATION_RULE_THRESHOLDS.WEAK_BREAK_EVEN_SAFETY_TRAVELERS
    ) {
      return [];
    }

    return [
      {
        ruleCode: this.code,
        category: this.category,
        severity: RecommendationSeverity.HIGH,
        title: 'Break-even safety buffer is weak',
        explanation: `The package has only ${financial.breakEvenSafetyTravelers.toFixed(2)} traveler(s) above break-even at the expected group size.`,
        suggestedAction:
          'Increase margin or reduce fixed costs to protect the package against cancellations.',
        affectedMetric: 'breakEvenSafetyTravelers',
      },
    ];
  }
}
