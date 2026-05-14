import { Injectable } from '@nestjs/common';

import { RecommendationCategory } from '../../../common/enums/recommendation-category.enum';
import { RecommendationSeverity } from '../../../common/enums/recommendation-severity.enum';
import { AnalysisContext } from '../../types/analysis-context.type';
import { RecommendationDraft } from '../../types/recommendation-draft.type';
import { RecommendationRule } from '../recommendation-rule.interface';

@Injectable()
export class NonPositiveContributionRule implements RecommendationRule {
  readonly code = 'NON_POSITIVE_CONTRIBUTION';
  readonly category = RecommendationCategory.FINANCIAL;

  evaluate(context: AnalysisContext): RecommendationDraft[] {
    const financial = context.financialMetrics;

    if (!financial || financial.contributionPerPerson > 0) {
      return [];
    }

    return [
      {
        ruleCode: this.code,
        category: this.category,
        severity: RecommendationSeverity.CRITICAL,
        title: 'Contribution per traveler is not positive',
        explanation: `Contribution per person is ${financial.contributionPerPerson.toFixed(2)}, so each additional traveler does not improve profitability.`,
        suggestedAction:
          'Reduce per-person variable costs or increase the selling price before publishing this package.',
        affectedMetric: 'contributionPerPerson',
      },
    ];
  }
}
