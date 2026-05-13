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
      {
        ruleCode: 'WEAK_PROFITABILITY_SCORE',
        metric: 'profitabilityScore',
        label: 'profitability',
        score: qualityScore.profitabilityScore,
        category: RecommendationCategory.FINANCIAL,
        suggestedAction: 'Review price, group size, fixed costs, and variable cost per person.',
      },
      {
        ruleCode: 'WEAK_ITINERARY_BALANCE_SCORE',
        metric: 'itineraryBalanceScore',
        label: 'itinerary balance',
        score: qualityScore.itineraryBalanceScore,
        category: RecommendationCategory.ITINERARY,
        suggestedAction:
          'Reduce overloaded days, add rest periods, or distribute activities more evenly.',
      },
      {
        ruleCode: 'WEAK_OPERATIONAL_FEASIBILITY_SCORE',
        metric: 'operationalFeasibilityScore',
        label: 'operational feasibility',
        score: qualityScore.operationalFeasibilityScore,
        category: RecommendationCategory.OPERATIONAL,
        suggestedAction: 'Add buffers, reduce transfer-heavy days, and fix unrealistic timing.',
      },
      {
        ruleCode: 'WEAK_COST_STRUCTURE_SCORE',
        metric: 'costStructureScore',
        label: 'cost structure',
        score: qualityScore.costStructureScore,
        category: RecommendationCategory.COST_STRUCTURE,
        suggestedAction:
          'Review dominant cost categories, supplier concentration, and fixed cost exposure.',
      },
    ].filter((item) => item.score < 60);

    return weakScores.map((item) => ({
      ruleCode: item.ruleCode,
      category: item.category,
      severity: item.score < 40 ? RecommendationSeverity.HIGH : RecommendationSeverity.MEDIUM,
      title: `Weak ${item.label} score`,
      explanation: `The ${item.label} score is ${item.score}/100, which weakens the overall package quality.`,
      suggestedAction: item.suggestedAction,
      affectedMetric: item.metric,
    }));
  }
}
