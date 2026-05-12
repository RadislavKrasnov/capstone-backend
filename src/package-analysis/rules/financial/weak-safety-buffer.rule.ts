import { Injectable } from '@nestjs/common';

import { RecommendationCategory } from '../../../common/enums/recommendation-category.enum';
import { RecommendationSeverity } from '../../../common/enums/recommendation-severity.enum';
import { AnalysisContext } from '../../types/analysis-context.type';
import { RecommendationDraft } from '../../types/recommendation-draft.type';
import { RecommendationRule } from '../recommendation-rule.interface';

@Injectable()
export class WeakSafetyBufferRule implements RecommendationRule {
  readonly code = 'WEAK_SAFETY_BUFFER';
  readonly category = RecommendationCategory.FINANCIAL;

  evaluate(context: AnalysisContext): RecommendationDraft[] {
    const financial = context.financialMetrics;

    if (!financial || financial.contributionPerPerson <= 0 || financial.breakEvenSafetyTravelers >= 2) {
      return [];
    }

    return [
      {
        ruleCode: this.code,
        category: this.category,
        severity: RecommendationSeverity.MEDIUM,
        title: 'Profitability safety buffer is weak',
        explanation: `The package has only ${financial.breakEvenSafetyTravelers.toFixed(2)} traveler(s) above break-even at the expected group size.`,
        suggestedAction: 'Improve the margin or reduce fixed costs so the package remains profitable with fewer travelers.',
        affectedMetric: 'breakEvenSafetyTravelers',
      },
    ];
  }
}
