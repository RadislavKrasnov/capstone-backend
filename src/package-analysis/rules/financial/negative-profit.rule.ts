import { Injectable } from '@nestjs/common';

import { RecommendationCategory } from '../../../common/enums/recommendation-category.enum';
import { RecommendationSeverity } from '../../../common/enums/recommendation-severity.enum';
import { AnalysisContext } from '../../types/analysis-context.type';
import { RecommendationDraft } from '../../types/recommendation-draft.type';
import { RecommendationRule } from '../recommendation-rule.interface';

@Injectable()
export class NegativeProfitRule implements RecommendationRule {
  readonly code = 'NEGATIVE_PROFIT';
  readonly category = RecommendationCategory.FINANCIAL;

  evaluate(context: AnalysisContext): RecommendationDraft[] {
    const financial = context.financialMetrics;

    if (!financial || financial.grossProfit >= 0) {
      return [];
    }

    return [
      {
        ruleCode: this.code,
        category: this.category,
        severity: RecommendationSeverity.CRITICAL,
        title: 'Package is currently unprofitable',
        explanation: `Projected gross profit is ${financial.grossProfit.toFixed(2)}, which means the package loses money at the expected group size.`,
        suggestedAction: `Increase the selling price to at least ${financial.requiredPriceForTargetMargin.toFixed(2)} per person or reduce required costs by ${financial.requiredCostReductionForTargetMargin.toFixed(2)}.`,
        affectedMetric: 'grossProfit',
      },
    ];
  }
}
