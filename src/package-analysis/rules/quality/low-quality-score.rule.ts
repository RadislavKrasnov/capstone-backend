import { Injectable } from '@nestjs/common';

import { RecommendationCategory } from '../../../common/enums/recommendation-category.enum';
import { RecommendationSeverity } from '../../../common/enums/recommendation-severity.enum';
import { AnalysisContext } from '../../types/analysis-context.type';
import { RecommendationDraft } from '../../types/recommendation-draft.type';
import { RecommendationRule } from '../recommendation-rule.interface';

@Injectable()
export class LowQualityScoreRule implements RecommendationRule {
  readonly code = 'LOW_QUALITY_SCORE';
  readonly category = RecommendationCategory.OPERATIONAL;

  evaluate(context: AnalysisContext): RecommendationDraft[] {
    const qualityScore = context.qualityScore;

    if (!qualityScore || qualityScore.overallScore >= 55) {
      return [];
    }

    return [
      {
        ruleCode: this.code,
        category: this.category,
        severity: qualityScore.overallScore < 40 ? RecommendationSeverity.CRITICAL : RecommendationSeverity.HIGH,
        title: 'Overall package quality is too low for publication',
        explanation: `Overall quality score is ${qualityScore.overallScore}/100. Publishing this package may create financial or customer-experience risk.`,
        suggestedAction: 'Resolve the highest-severity recommendations before publishing the package.',
        affectedMetric: 'overallScore',
      },
    ];
  }
}
