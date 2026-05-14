import { Injectable } from '@nestjs/common';

import { FatigueLevel } from '../../../common/enums/fatigue-level.enum';
import { RecommendationCategory } from '../../../common/enums/recommendation-category.enum';
import { RecommendationSeverity } from '../../../common/enums/recommendation-severity.enum';
import { AnalysisContext } from '../../types/analysis-context.type';
import { RecommendationDraft } from '../../types/recommendation-draft.type';
import { RecommendationRule } from '../recommendation-rule.interface';
import { QUALITY_SCORE_THRESHOLDS } from '../../constants/analysis-thresholds.constants';

@Injectable()
export class CriticalFatigueDayRule implements RecommendationRule {
  readonly code = 'CRITICAL_FATIGUE_DAY';
  readonly category = RecommendationCategory.ITINERARY;

  evaluate(context: AnalysisContext): RecommendationDraft[] {
    const dailyResults = context.dailyFatigueResults ?? [];

    return dailyResults
      .filter((result) => result.fatigueLevel === FatigueLevel.CRITICAL)
      .map((result) => ({
        ruleCode: this.code,
        category: this.category,
        severity: RecommendationSeverity.CRITICAL,
        title: `Day ${result.dayNumber} has critical fatigue`,
        explanation: `Fatigue score is ${result.fatigueScore}/${QUALITY_SCORE_THRESHOLDS.MAX_SCORE}. Main reasons: ${result.reasons.join(' ')}`,
        suggestedAction:
          'Move one major activity or transfer to another day and add recovery time.',
        affectedMetric: 'fatigueScore',
        affectedDayId: result.dayId,
      }));
  }
}
