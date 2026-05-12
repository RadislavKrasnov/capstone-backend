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

    if (!financial || financial.contributionPerPerson <= 0 || financial.breakEvenUtilizationPercent <= 80) {
      return [];
    }

    return [
      {
        ruleCode: this.code,
        category: this.category,
        severity:
          financial.breakEvenUtilizationPercent > 100
            ? RecommendationSeverity.HIGH
            : RecommendationSeverity.MEDIUM,
        title: 'Break-even point is too close to expected group size',
        explanation: `Break-even requires ${financial.breakEvenGroupSize.toFixed(2)} travelers, equal to ${financial.breakEvenUtilizationPercent.toFixed(2)}% of the expected group size.`,
        suggestedAction: 'Lower fixed costs or increase price to create a safer profitability buffer.',
        affectedMetric: 'breakEvenGroupSize',
      },
    ];
  }
}
