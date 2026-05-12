import { Injectable } from '@nestjs/common';

import { RecommendationCategory } from '../../../common/enums/recommendation-category.enum';
import { RecommendationSeverity } from '../../../common/enums/recommendation-severity.enum';
import { AnalysisContext } from '../../types/analysis-context.type';
import { RecommendationDraft } from '../../types/recommendation-draft.type';
import { RecommendationRule } from '../recommendation-rule.interface';

@Injectable()
export class WeakSubScoreRule implements RecommendationRule {
  readonly code = 'WEAK_SUB_SCORE';
  readonly category = RecommendationCategory.OPERATIONAL;

  evaluate(context: AnalysisContext): RecommendationDraft[] {
    const qualityScore = context.qualityScore;

    if (!qualityScore) {
      return [];
    }

    const weakScores = [
      { metric: 'profitabilityScore', label: 'profitability', score: qualityScore.profitabilityScore },
      { metric: 'itineraryBalanceScore', label: 'itinerary balance', score: qualityScore.itineraryBalanceScore },
      { metric: 'operationalFeasibilityScore', label: 'operational feasibility', score: qualityScore.operationalFeasibilityScore },
      { metric: 'costStructureScore', label: 'cost structure', score: qualityScore.costStructureScore },
    ].filter((item) => item.score < 50);

    return weakScores.map((item) => ({
      ruleCode: `${this.code}_${item.metric.toUpperCase()}`,
      category: this.category,
      severity: RecommendationSeverity.MEDIUM,
      title: `Weak ${item.label} sub-score`,
      explanation: `The ${item.label} sub-score is ${item.score}/100, which weakens the overall package quality.`,
      suggestedAction: 'Review the related metrics and address the most influential causes before publication.',
      affectedMetric: item.metric,
    }));
  }
}
