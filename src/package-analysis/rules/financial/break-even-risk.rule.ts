import { Injectable } from '@nestjs/common';

import { RecommendationCategory } from '../../../common/enums/recommendation-category.enum';
import { RecommendationSeverity } from '../../../common/enums/recommendation-severity.enum';
import { AnalysisContext } from '../../types/analysis-context.type';
import { RecommendationDraft } from '../../types/recommendation-draft.type';
import { RecommendationRule } from '../recommendation-rule.interface';

@Injectable()
export class BreakEvenRiskRule implements RecommendationRule {
  readonly code = 'BREAK_EVEN_RISK';
  readonly category = RecommendationCategory.FINANCIAL;

  evaluate(context: AnalysisContext): RecommendationDraft[] {
    const financial = context.financialMetrics;
    const expectedGroupSize = context.package.expectedGroupSize;

    if (
      !financial ||
      financial.contributionPerPerson <= 0 ||
      expectedGroupSize >= financial.breakEvenGroupSizeRounded
    ) {
      return [];
    }

    return [
      {
        ruleCode: this.code,
        category: this.category,
        severity: RecommendationSeverity.CRITICAL,
        title: 'Expected group size is below break-even',
        explanation: `The package needs at least ${financial.breakEvenGroupSizeRounded} travelers to break even, but the expected group size is ${expectedGroupSize}.`,
        suggestedAction:
          'Set a higher minimum group size, increase price, or reduce fixed costs before publishing.',
        affectedMetric: 'breakEvenGroupSize',
      },
    ];
  }
}
