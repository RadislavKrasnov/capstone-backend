import { Injectable } from '@nestjs/common';

import { FatigueLevel } from '../../../common/enums/fatigue-level.enum';
import { RecommendationCategory } from '../../../common/enums/recommendation-category.enum';
import { RecommendationSeverity } from '../../../common/enums/recommendation-severity.enum';
import { AnalysisContext } from '../../types/analysis-context.type';
import { RecommendationDraft } from '../../types/recommendation-draft.type';
import { RecommendationRule } from '../recommendation-rule.interface';

@Injectable()
export class OverloadedDayRule implements RecommendationRule {
  readonly code = 'OVERLOADED_DAY';
  readonly category = RecommendationCategory.ITINERARY;

  evaluate(context: AnalysisContext): RecommendationDraft[] {
    const dailyResults = context.dailyFatigueResults ?? [];

    return dailyResults
      .filter((result) => result.fatigueLevel === FatigueLevel.HIGH)
      .map((result) => ({
        ruleCode: this.code,
        category: this.category,
        severity: RecommendationSeverity.HIGH,
        title: `Day ${result.dayNumber} is overloaded`,
        explanation: `Fatigue score is ${result.fatigueScore}/100, which may reduce customer satisfaction.`,
        suggestedAction: 'Reduce the number of activities, add free time, or shorten transfers.',
        affectedMetric: 'fatigueScore',
        affectedDayId: result.dayId,
      }));
  }
}
