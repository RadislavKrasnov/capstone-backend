import { Injectable } from '@nestjs/common';

import { RecommendationCategory } from '../../../common/enums/recommendation-category.enum';
import { RecommendationSeverity } from '../../../common/enums/recommendation-severity.enum';
import { AnalysisContext } from '../../types/analysis-context.type';
import { RecommendationDraft } from '../../types/recommendation-draft.type';
import { RecommendationRule } from '../recommendation-rule.interface';
import { QUALITY_SCORE_THRESHOLDS } from '../../constants/analysis-thresholds.constants';

@Injectable()
export class OverloadedDayRule implements RecommendationRule {
  readonly code = 'OVERLOADED_DAY';
  readonly category = RecommendationCategory.ITINERARY;

  evaluate(context: AnalysisContext): RecommendationDraft[] {
    const dailyResults = context.dailyFatigueResults ?? [];

    return dailyResults
      .filter((result) => result.fatigueScore > context.configuration.maxDailyFatigueScore)
      .map((result) => ({
        ruleCode: this.code,
        category: this.category,
        severity: RecommendationSeverity.HIGH,
        title: `Day ${result.dayNumber} is overloaded`,
        explanation: `Fatigue score is ${result.fatigueScore}/${QUALITY_SCORE_THRESHOLDS.MAX_SCORE}, above the configured limit of ${context.configuration.maxDailyFatigueScore}.`,
        suggestedAction:
          'Move one activity to another day, reduce transfer time, or add more free time.',
        affectedMetric: 'fatigueScore',
        affectedDayId: result.dayId,
      }));
  }
}
