import { Injectable } from '@nestjs/common';

import { CostCategory } from '../../../common/enums/cost-category.enum';
import { RecommendationCategory } from '../../../common/enums/recommendation-category.enum';
import { RecommendationSeverity } from '../../../common/enums/recommendation-severity.enum';
import { AnalysisContext } from '../../types/analysis-context.type';
import { RecommendationDraft } from '../../types/recommendation-draft.type';
import { RecommendationRule } from '../recommendation-rule.interface';

@Injectable()
export class HighOtherCostShareRule implements RecommendationRule {
  readonly code = 'OTHER_COST_TOO_HIGH';
  readonly category = RecommendationCategory.COST_STRUCTURE;

  evaluate(context: AnalysisContext): RecommendationDraft[] {
    const otherShare =
      context.financialMetrics?.categoryCostBreakdown.find(
        (item) => item.category === CostCategory.OTHER,
      )?.sharePercent ?? 0;

    if (otherShare <= 25) {
      return [];
    }

    return [
      {
        ruleCode: this.code,
        category: this.category,
        severity: RecommendationSeverity.MEDIUM,
        title: 'Too many costs are classified as OTHER',
        explanation: `OTHER costs represent ${otherShare.toFixed(2)}% of total required costs, reducing cost transparency and making optimization harder.`,
        suggestedAction:
          'Reclassify costs into specific categories such as HOTEL, TRANSPORT, MEAL, ACTIVITY, GUIDE, FLIGHT, or INSURANCE.',
        affectedMetric: 'otherCostSharePercent',
      },
    ];
  }
}
