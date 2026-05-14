import { Injectable } from '@nestjs/common';

import { CostCategory } from '../../../common/enums/cost-category.enum';
import { RecommendationCategory } from '../../../common/enums/recommendation-category.enum';
import { RecommendationSeverity } from '../../../common/enums/recommendation-severity.enum';
import { AnalysisContext } from '../../types/analysis-context.type';
import { RecommendationDraft } from '../../types/recommendation-draft.type';
import { RecommendationRule } from '../recommendation-rule.interface';
import { COST_STRUCTURE_RULE_THRESHOLDS } from '../../constants/analysis-thresholds.constants';

@Injectable()
export class HotelCostDominanceRule implements RecommendationRule {
  readonly code = 'HOTEL_COST_DOMINANCE';
  readonly category = RecommendationCategory.COST_STRUCTURE;

  evaluate(context: AnalysisContext): RecommendationDraft[] {
    const hotelShare =
      context.financialMetrics?.categoryCostBreakdown.find(
        (item) => item.category === CostCategory.HOTEL,
      )?.sharePercent ?? 0;

    if (hotelShare <= COST_STRUCTURE_RULE_THRESHOLDS.MAX_HOTEL_COST_SHARE_PERCENT) {
      return [];
    }

    return [
      {
        ruleCode: this.code,
        category: this.category,
        severity:
          hotelShare > COST_STRUCTURE_RULE_THRESHOLDS.HIGH_HOTEL_COST_SHARE_PERCENT
            ? RecommendationSeverity.HIGH
            : RecommendationSeverity.MEDIUM,
        title: 'Hotel costs dominate the package structure',
        explanation: `Hotel costs represent ${hotelShare.toFixed(2)}% of total package cost, which strongly affects profitability.`,
        suggestedAction:
          'Review hotel supplier pricing, adjust accommodation category, or negotiate group rates.',
        affectedMetric: 'hotelCostSharePercent',
      },
    ];
  }
}
