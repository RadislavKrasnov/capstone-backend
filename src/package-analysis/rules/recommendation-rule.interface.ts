import { RecommendationCategory } from '../../common/enums/recommendation-category.enum';
import { AnalysisContext } from '../types/analysis-context.type';
import { RecommendationDraft } from '../types/recommendation-draft.type';

export interface RecommendationRule {
  readonly code: string;
  readonly category: RecommendationCategory;

  evaluate(context: AnalysisContext): RecommendationDraft[];
}
