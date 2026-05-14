import { Injectable } from '@nestjs/common';

import { RecommendationCategory } from '../../../common/enums/recommendation-category.enum';
import { RecommendationSeverity } from '../../../common/enums/recommendation-severity.enum';
import { AnalysisContext } from '../../types/analysis-context.type';
import { RecommendationDraft } from '../../types/recommendation-draft.type';
import { RecommendationRule } from '../recommendation-rule.interface';
import { RECOMMENDATION_RULE_THRESHOLDS } from '../../constants/analysis-thresholds.constants';

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

    if (
      financial.grossProfit < 0 ||
      financial.grossMarginPercent < RECOMMENDATION_RULE_THRESHOLDS.VERY_LOW_MARGIN_PERCENT ||
      financial.grossMarginPercent >= minTargetMarginPercent
    ) {
      return [];
    }

    const priceGap = Math.max(0, financial.priceGapPerPerson);

    return [
      {
        ruleCode: this.code,
        category: this.category,
        severity: RecommendationSeverity.MEDIUM,
        title: 'Gross margin is below the target threshold',
        explanation: `Gross margin is ${financial.grossMarginPercent.toFixed(2)}%, below the configured target of ${minTargetMarginPercent.toFixed(2)}%.`,
        suggestedAction: `Increase price by approximately ${priceGap.toFixed(2)} per person or reduce costs by ${financial.requiredCostReductionForTargetMargin.toFixed(2)}.`,
        affectedMetric: 'grossMarginPercent',
      },
    ];
  }
}
