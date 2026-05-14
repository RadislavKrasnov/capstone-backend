import { Injectable } from '@nestjs/common';

import { RecommendationCategory } from '../../../common/enums/recommendation-category.enum';
import { RecommendationSeverity } from '../../../common/enums/recommendation-severity.enum';
import { AnalysisContext } from '../../types/analysis-context.type';
import { RecommendationDraft } from '../../types/recommendation-draft.type';
import { RecommendationRule } from '../recommendation-rule.interface';
import { COST_STRUCTURE_RULE_THRESHOLDS } from '../../constants/analysis-thresholds.constants';

@Injectable()
export class SupplierDependencyRiskRule implements RecommendationRule {
  readonly code = 'SUPPLIER_DEPENDENCY_RISK';
  readonly category = RecommendationCategory.COST_STRUCTURE;

  evaluate(context: AnalysisContext): RecommendationDraft[] {
    const largestSupplier = context.financialMetrics?.supplierCostBreakdown[0];

    if (
      !largestSupplier ||
      largestSupplier.sharePercent <= COST_STRUCTURE_RULE_THRESHOLDS.MAX_SUPPLIER_SHARE_PERCENT
    ) {
      return [];
    }

    return [
      {
        ruleCode: this.code,
        category: this.category,
        severity:
          largestSupplier.sharePercent > COST_STRUCTURE_RULE_THRESHOLDS.HIGH_SUPPLIER_SHARE_PERCENT
            ? RecommendationSeverity.HIGH
            : RecommendationSeverity.MEDIUM,
        title: 'High dependency on one supplier',
        explanation: `${largestSupplier.supplierName} represents ${largestSupplier.sharePercent.toFixed(2)}% of total required costs. This creates pricing and operational dependency risk.`,
        suggestedAction:
          'Add alternative suppliers, negotiate better terms, or reduce dependency on this supplier.',
        affectedMetric: 'largestSupplierSharePercent',
      },
    ];
  }
}
