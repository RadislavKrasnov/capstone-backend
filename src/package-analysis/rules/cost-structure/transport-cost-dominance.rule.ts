import { Injectable } from '@nestjs/common';

import { CostCategory } from '../../../common/enums/cost-category.enum';
import { RecommendationCategory } from '../../../common/enums/recommendation-category.enum';
import { RecommendationSeverity } from '../../../common/enums/recommendation-severity.enum';
import { AnalysisContext } from '../../types/analysis-context.type';
import { RecommendationDraft } from '../../types/recommendation-draft.type';
import { RecommendationRule } from '../recommendation-rule.interface';
import { COST_STRUCTURE_RULE_THRESHOLDS } from '../../constants/analysis-thresholds.constants';

@Injectable()
export class TransportCostDominanceRule implements RecommendationRule {
  readonly code = 'TRANSPORT_COST_DOMINANCE';
  readonly category = RecommendationCategory.COST_STRUCTURE;

  evaluate(context: AnalysisContext): RecommendationDraft[] {
    const transportShare =
      context.financialMetrics?.categoryCostBreakdown.find((item) => item.category === CostCategory.TRANSPORT)
        ?.sharePercent ?? 0;

    if (transportShare <= COST_STRUCTURE_RULE_THRESHOLDS.MAX_TRANSPORT_COST_SHARE_PERCENT) {
      return [];
    }

    return [
      {
        ruleCode: this.code,
        category: this.category,
        severity: RecommendationSeverity.MEDIUM,
        title: 'Transport costs are unusually high',
        explanation: `Transport costs represent ${transportShare.toFixed(2)}% of total required costs.`,
        suggestedAction: 'Optimize route sequence or compare alternative transport providers.',
        affectedMetric: 'transportCostSharePercent',
      },
    ];
  }
}
