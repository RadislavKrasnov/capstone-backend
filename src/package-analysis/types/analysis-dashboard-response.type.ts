import { AnalysisStatus } from '../../common/enums/analysis-status.enum';
import { FatigueLevel } from '../../common/enums/fatigue-level.enum';
import { RecommendationCategory } from '../../common/enums/recommendation-category.enum';
import { RecommendationSeverity } from '../../common/enums/recommendation-severity.enum';
import { AppliedScoreCap } from './quality-score.type';

export type FinancialRiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type QualityLevel = 'EXCELLENT' | 'GOOD' | 'RISKY' | 'POOR' | 'CRITICAL';

export type AnalysisDashboardRecommendation = {
  uuid?: string;
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

export type AnalysisDashboardResponse = {
  analysisRun: {
    uuid: string;
    status: AnalysisStatus;
    algorithmVersion: string;
    createdAt: Date;
  };
  financial: {
    totalRevenue: number;
    totalCost: number;
    grossProfit: number;
    grossMarginPercent: number;
    fixedCostTotal: number;
    variableCostTotal: number;
    variableCostPerPerson: number;
    contributionPerPerson: number;
    breakEvenGroupSize: number;
    breakEvenSafetyTravelers: number;
    breakEvenUtilizationPercent: number;
    requiredPriceForTargetMargin: number;
    requiredCostReductionForTargetMargin: number;
    financialRiskLevel: FinancialRiskLevel;
  };
  itinerary: {
    itineraryBalanceScore: number;
    averageFatigueScore: number;
    overloadedDaysCount: number;
    criticalDaysCount: number;
    dailyResults: Array<{
      dayId: number;
      dayNumber: number;
      activityLoad: number;
      transferLoad: number;
      intensityLoad: number;
      compressionPenalty: number;
      restCredit: number;
      fatigueScore: number;
      balanceScore: number;
      fatigueLevel: FatigueLevel;
      reasons: string[];
    }>;
  };
  quality: {
    overallScore: number;
    qualityLevel: QualityLevel;
    profitabilityScore: number;
    itineraryBalanceScore: number;
    operationalFeasibilityScore: number;
    costStructureScore: number;
    appliedCaps: AppliedScoreCap[];
  };
  recommendations: {
    countsBySeverity: Record<'critical' | 'high' | 'medium' | 'low', number>;
    topRecommendations: AnalysisDashboardRecommendation[];
    groups: {
      financial: AnalysisDashboardRecommendation[];
      itinerary: AnalysisDashboardRecommendation[];
      operational: AnalysisDashboardRecommendation[];
      costStructure: AnalysisDashboardRecommendation[];
    };
  };
};
