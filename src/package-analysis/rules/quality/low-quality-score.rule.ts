import { Injectable } from '@nestjs/common';

import { RecommendationCategory } from '../../../common/enums/recommendation-category.enum';
import { RecommendationSeverity } from '../../../common/enums/recommendation-severity.enum';
import { AnalysisContext } from '../../types/analysis-context.type';
import { RecommendationDraft } from '../../types/recommendation-draft.type';
import { RecommendationRule } from '../recommendation-rule.interface';
import { QUALITY_SCORE_THRESHOLDS } from '../../constants/analysis-thresholds.constants';

@Injectable()
export class LowQualityScoreRule implements RecommendationRule {
  readonly code = 'LOW_QUALITY_SCORE';
  readonly category = RecommendationCategory.OPERATIONAL;

  evaluate(context: AnalysisContext): RecommendationDraft[] {
    const qualityScore = context.qualityScore;

    if (!qualityScore || qualityScore.overallScore >= QUALITY_SCORE_THRESHOLDS.LOW_OVERALL_SCORE) {
      return [];
    }

    const weakestArea = this.resolveWeakestArea(qualityScore);

    return [
      {
        ruleCode: this.code,
        category: weakestArea.category,
        severity:
          qualityScore.overallScore < QUALITY_SCORE_THRESHOLDS.CRITICAL_OVERALL_SCORE
            ? RecommendationSeverity.CRITICAL
            : RecommendationSeverity.HIGH,
        title: 'Overall package quality is too low for publication',
        explanation: `Overall quality score is ${qualityScore.overallScore}/${QUALITY_SCORE_THRESHOLDS.MAX_SCORE}. The weakest area is ${weakestArea.label}, which should be reviewed before publishing.`,
        suggestedAction: weakestArea.action,
        affectedMetric: 'overallScore',
      },
    ];
  }

  private resolveWeakestArea(qualityScore: NonNullable<AnalysisContext['qualityScore']>) {
    const areas = [
      {
        metric: 'profitabilityScore',
        label: 'profitability',
        score: qualityScore.profitabilityScore,
        category: RecommendationCategory.FINANCIAL,
        action: 'Review price, group size, fixed costs, and variable cost per person.',
      },
      {
        metric: 'itineraryBalanceScore',
        label: 'itinerary balance',
        score: qualityScore.itineraryBalanceScore,
        category: RecommendationCategory.ITINERARY,
        action: 'Reduce overloaded days, add rest periods, or distribute activities more evenly.',
      },
      {
        metric: 'operationalFeasibilityScore',
        label: 'operational feasibility',
        score: qualityScore.operationalFeasibilityScore,
        category: RecommendationCategory.OPERATIONAL,
        action: 'Add buffers, reduce transfer-heavy days, and fix unrealistic timing.',
      },
      {
        metric: 'costStructureScore',
        label: 'cost structure',
        score: qualityScore.costStructureScore,
        category: RecommendationCategory.COST_STRUCTURE,
        action: 'Review dominant cost categories, supplier concentration, and fixed cost exposure.',
      },
    ];

    return areas.sort((a, b) => a.score - b.score)[0];
  }
}
