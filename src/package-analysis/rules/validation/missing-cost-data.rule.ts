import { Injectable } from '@nestjs/common';

import { RecommendationCategory } from '../../../common/enums/recommendation-category.enum';
import { RecommendationSeverity } from '../../../common/enums/recommendation-severity.enum';
import { AnalysisContext } from '../../types/analysis-context.type';
import { RecommendationDraft } from '../../types/recommendation-draft.type';
import { RecommendationRule } from '../recommendation-rule.interface';

@Injectable()
export class MissingCostDataRule implements RecommendationRule {
  readonly code = 'MISSING_COST_DATA';
  readonly category = RecommendationCategory.FINANCIAL;

  evaluate(context: AnalysisContext): RecommendationDraft[] {
    if (context.costItems.length > 0) {
      return [];
    }

    return [
      {
        ruleCode: this.code,
        category: this.category,
        severity: RecommendationSeverity.CRITICAL,
        title: 'Required cost data is missing',
        explanation:
          'The package has no required cost items, so profitability and break-even analysis cannot be trusted.',
        suggestedAction:
          'Add required cost items such as hotel, transport, guide, meals, activities, insurance, or flights before publishing the package.',
        affectedMetric: 'totalCost',
      },
    ];
  }
}
