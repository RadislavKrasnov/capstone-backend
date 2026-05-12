import { RecommendationCategory } from '../../common/enums/recommendation-category.enum';
import { RecommendationSeverity } from '../../common/enums/recommendation-severity.enum';

export type RecommendationDraft = {
  ruleCode: string;
  category: RecommendationCategory;
  severity: RecommendationSeverity;
  title: string;
  explanation: string;
  suggestedAction: string;
  affectedMetric?: string | null;
  affectedDayId?: number | null;
  affectedItemId?: number | null;
};
