import { Injectable } from '@nestjs/common';

import { RecommendationCategory } from '../../../common/enums/recommendation-category.enum';
import { RecommendationSeverity } from '../../../common/enums/recommendation-severity.enum';
import { AnalysisContext } from '../../types/analysis-context.type';
import { RecommendationDraft } from '../../types/recommendation-draft.type';
import { RecommendationRule } from '../recommendation-rule.interface';

@Injectable()
export class HighFixedCostExposureRule implements RecommendationRule {
  readonly code = 'HIGH_FIXED_COST_EXPOSURE';
  readonly category = RecommendationCategory.FINANCIAL;

  evaluate(context: AnalysisContext): RecommendationDraft[] {
    const financial = context.financialMetrics;

    if (!financial || financial.totalCost <= 0) {
      return [];
    }

    const fixedCostShare = financial.fixedCostTotal / financial.totalCost;

    if (fixedCostShare <= 0.5 || financial.breakEvenUtilizationPercent < 80) {
      return [];
    }

    return [
      {
        ruleCode: this.code,
        category: this.category,
        severity:
          financial.breakEvenUtilizationPercent >= 90
            ? RecommendationSeverity.HIGH
            : RecommendationSeverity.MEDIUM,
        title: 'Package has high fixed-cost exposure',
        explanation: `Fixed costs represent ${(fixedCostShare * 100).toFixed(2)}% of total required costs, and break-even utilization is ${financial.breakEvenUtilizationPercent.toFixed(2)}%. This makes the package sensitive to low group size.`,
        suggestedAction:
          'Reduce fixed commitments, negotiate group-based pricing, or set a minimum participant count.',
        affectedMetric: 'fixedCostTotal',
      },
    ];
  }
}
