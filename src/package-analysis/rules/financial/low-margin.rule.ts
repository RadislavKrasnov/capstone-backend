import { Injectable } from '@nestjs/common';

import { RecommendationCategory } from '../../../common/enums/recommendation-category.enum';
import { RecommendationSeverity } from '../../../common/enums/recommendation-severity.enum';
import { AnalysisContext } from '../../types/analysis-context.type';
import { RecommendationDraft } from '../../types/recommendation-draft.type';
import { RecommendationRule } from '../recommendation-rule.interface';

@Injectable()
export class LowMarginRule implements RecommendationRule {
  readonly code = 'LOW_MARGIN';
  readonly category = RecommendationCategory.FINANCIAL;

  evaluate(context: AnalysisContext): RecommendationDraft[] {
    const financial = context.financialMetrics;

    if (!financial) {
      return [];
    }

    const minTargetMarginPercent = Number(context.configuration.minTargetMarginPercent);

    if (financial.grossProfit < 0 || financial.grossMarginPercent >= minTargetMarginPercent) {
      return [];
    }

    return [
      {
        ruleCode: this.code,
        category: this.category,
        severity:
          financial.grossMarginPercent < minTargetMarginPercent / 2
            ? RecommendationSeverity.HIGH
            : RecommendationSeverity.MEDIUM,
        title: 'Gross margin is below the target threshold',
        explanation: `Gross margin is ${financial.grossMarginPercent.toFixed(2)}%, below the configured target of ${minTargetMarginPercent.toFixed(2)}%.`,
        suggestedAction: `Consider a price of at least ${financial.requiredPriceForTargetMargin.toFixed(2)} per person or reduce costs by ${financial.requiredCostReductionForTargetMargin.toFixed(2)}.`,
        affectedMetric: 'grossMarginPercent',
      },
    ];
  }
}
