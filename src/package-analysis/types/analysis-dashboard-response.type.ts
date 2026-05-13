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

    costPerPerson: number;
    profitPerPerson: number;
    contributionPerPerson: number;

    breakEvenGroupSize: number;
    breakEvenGroupSizeRounded: number;
    breakEvenSafetyTravelers: number;
    breakEvenUtilizationPercent: number;

    requiredPriceForTargetMargin: number;
    priceGapPerPerson: number;
    requiredCostReductionForTargetMargin: number;

    markupPercent: number;
    financialRiskLevel: FinancialRiskLevel;

    categoryCostBreakdown: Array<{
      category: string;
      totalCost: number;
      sharePercent: number;
    }>;

    supplierCostBreakdown: Array<{
      supplierId: number | null;
      supplierName: string;
      totalCost: number;
      sharePercent: number;
    }>;
  };
  itinerary: {
    itineraryBalanceScore: number;
    averageFatigueScore: number;
    averageBalanceScore: number;

    overloadedDaysCount: number;
    criticalDaysCount: number;
    consecutiveHighFatigueSequences: number;

    validationWarnings: string[];

    dailyResults: Array<{
      dayId: number;
      dayNumber: number;
      title?: string;
      isRestDay: boolean;

      activityCount: number;
      transferMinutes: number;
      flightMinutes: number;
      freeTimeMinutes: number;
      mealMinutes: number;
      dayDurationMinutes: number;

      activityLoad: number;
      transferLoad: number;
      intensityLoad: number;
      compressionPenalty: number;
      restCredit: number;

      fatigueScore: number;
      balanceScore: number;
      fatigueLevel: FatigueLevel;

      transferSharePercent: number;
      activityDensity: number;
      restRatioPercent: number;

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
