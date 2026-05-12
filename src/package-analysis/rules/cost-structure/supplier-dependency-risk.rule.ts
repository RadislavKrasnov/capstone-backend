import { Injectable } from '@nestjs/common';

import { RecommendationCategory } from '../../../common/enums/recommendation-category.enum';
import { RecommendationSeverity } from '../../../common/enums/recommendation-severity.enum';
import { AnalysisContext } from '../../types/analysis-context.type';
import { RecommendationDraft } from '../../types/recommendation-draft.type';
import { RecommendationRule } from '../recommendation-rule.interface';

@Injectable()
export class SupplierDependencyRiskRule implements RecommendationRule {
  readonly code = 'SUPPLIER_DEPENDENCY_RISK';
  readonly category = RecommendationCategory.COST_STRUCTURE;

  evaluate(context: AnalysisContext): RecommendationDraft[] {
    const largestSupplier = context.financialMetrics?.supplierCostBreakdown[0];

    if (!largestSupplier || largestSupplier.sharePercent <= 60) {
      return [];
    }

    return [
      {
        ruleCode: this.code,
        category: this.category,
        severity:
          largestSupplier.sharePercent > 75 ? RecommendationSeverity.HIGH : RecommendationSeverity.MEDIUM,
        title: 'High dependency on one supplier',
        explanation: `${largestSupplier.supplierName} represents ${largestSupplier.sharePercent.toFixed(2)}% of total required costs.`,
        suggestedAction: 'Negotiate alternatives or split critical services between suppliers.',
        affectedMetric: 'largestSupplierSharePercent',
      },
    ];
  }
}
