import { Injectable } from '@nestjs/common';

import { RecommendationCategory } from '../../../common/enums/recommendation-category.enum';
import { RecommendationSeverity } from '../../../common/enums/recommendation-severity.enum';
import { AnalysisContext } from '../../types/analysis-context.type';
import { RecommendationDraft } from '../../types/recommendation-draft.type';
import { RecommendationRule } from '../recommendation-rule.interface';
import { RECOMMENDATION_RULE_THRESHOLDS } from '../../constants/analysis-thresholds.constants';

@Injectable()
export class VeryLowMarginRule implements RecommendationRule {
  readonly code = 'VERY_LOW_MARGIN';
  readonly category = RecommendationCategory.FINANCIAL;

  evaluate(context: AnalysisContext): RecommendationDraft[] {
    const financial = context.financialMetrics;

    if (
      !financial ||
      financial.grossProfit < 0 ||
      financial.grossMarginPercent >= RECOMMENDATION_RULE_THRESHOLDS.VERY_LOW_MARGIN_PERCENT
    ) {
      return [];
    }

    return [
      {
        ruleCode: this.code,
        category: this.category,
        severity: RecommendationSeverity.HIGH,
        title: 'Package has very low profitability',
        explanation: `Gross margin is only ${financial.grossMarginPercent.toFixed(2)}%, leaving very little protection against supplier price changes, discounts, refunds, or operational mistakes.`,
        suggestedAction: 'Review pricing and supplier costs before publishing this package.',
        affectedMetric: 'grossMarginPercent',
      },
    ];
  }
}
