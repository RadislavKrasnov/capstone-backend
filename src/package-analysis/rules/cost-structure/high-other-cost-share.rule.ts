import { Injectable } from '@nestjs/common';

import { CostCategory } from '../../../common/enums/cost-category.enum';
import { RecommendationCategory } from '../../../common/enums/recommendation-category.enum';
import { RecommendationSeverity } from '../../../common/enums/recommendation-severity.enum';
import { AnalysisContext } from '../../types/analysis-context.type';
import { RecommendationDraft } from '../../types/recommendation-draft.type';
import { RecommendationRule } from '../recommendation-rule.interface';

@Injectable()
export class HighOtherCostShareRule implements RecommendationRule {
  readonly code = 'HIGH_OTHER_COST_SHARE';
  readonly category = RecommendationCategory.COST_STRUCTURE;

  evaluate(context: AnalysisContext): RecommendationDraft[] {
    const otherShare =
      context.financialMetrics?.categoryCostBreakdown.find((item) => item.category === CostCategory.OTHER)
        ?.sharePercent ?? 0;

    if (otherShare <= 20) {
      return [];
    }

    return [
      {
        ruleCode: this.code,
        category: this.category,
        severity: RecommendationSeverity.LOW,
        title: 'Too many costs are classified as OTHER',
        explanation: `OTHER costs represent ${otherShare.toFixed(2)}% of total required costs, reducing analytical clarity.`,
        suggestedAction: 'Reclassify these costs into more specific categories where possible.',
        affectedMetric: 'otherCostSharePercent',
      },
    ];
  }
}
