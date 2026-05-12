import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';

import { AnalysisStatus } from '../../common/enums/analysis-status.enum';
import { PackageStatus } from '../../common/enums/package-status.enum';
import { TourPackage } from '../../tour-packages/entities/tour-package.entity';
import { DailyFatigueResult } from '../entities/daily-fatigue-result.entity';
import { FinancialAnalysisResult } from '../entities/financial-analysis-result.entity';
import { GeneratedRecommendation } from '../entities/generated-recommendation.entity';
import { PackageAnalysisRun } from '../entities/package-analysis-run.entity';
import { PackageScoreResult } from '../entities/package-score-result.entity';
import { AnalysisContext } from '../types/analysis-context.type';
import { RecommendationDraft } from '../types/recommendation-draft.type';

export type PersistedAnalysisResults = {
  analysisRun: PackageAnalysisRun;
  financialResult: FinancialAnalysisResult;
  dailyFatigueResults: DailyFatigueResult[];
  scoreResult: PackageScoreResult;
  recommendations: GeneratedRecommendation[];
};

@Injectable()
export class AnalysisResultPersisterService {
  async persistCompletedAnalysis(
    manager: EntityManager,
    analysisRun: PackageAnalysisRun,
    context: AnalysisContext,
    recommendationDrafts: RecommendationDraft[],
  ): Promise<PersistedAnalysisResults> {
    const financialMetrics = this.requireValue(context.financialMetrics, 'Financial metrics');
    const dailyFatigueMetrics = this.requireValue(context.dailyFatigueResults, 'Daily fatigue results');
    const qualityScore = this.requireValue(context.qualityScore, 'Quality score');

    const financialResult = await manager.save(
      FinancialAnalysisResult,
      manager.create(FinancialAnalysisResult, {
        analysisRunId: analysisRun.id,
        totalRevenue: financialMetrics.totalRevenue.toFixed(2),
        totalCost: financialMetrics.totalCost.toFixed(2),
        grossProfit: financialMetrics.grossProfit.toFixed(2),
        grossMarginPercent: financialMetrics.grossMarginPercent.toFixed(2),
        fixedCostTotal: financialMetrics.fixedCostTotal.toFixed(2),
        variableCostTotal: financialMetrics.variableCostTotal.toFixed(2),
        variableCostPerPerson: financialMetrics.variableCostPerPerson.toFixed(2),
        contributionPerPerson: financialMetrics.contributionPerPerson.toFixed(2),
        breakEvenGroupSize: financialMetrics.breakEvenGroupSize.toFixed(2),
      }),
    );

    const dailyFatigueResults = await manager.save(
      DailyFatigueResult,
      dailyFatigueMetrics.map((result) =>
        manager.create(DailyFatigueResult, {
          analysisRunId: analysisRun.id,
          dayId: result.dayId,
          activityLoad: result.activityLoad.toFixed(2),
          transferLoad: result.transferLoad.toFixed(2),
          intensityLoad: result.intensityLoad.toFixed(2),
          compressionPenalty: result.compressionPenalty.toFixed(2),
          restCredit: result.restCredit.toFixed(2),
          fatigueScore: result.fatigueScore,
          balanceScore: result.balanceScore,
          fatigueLevel: result.fatigueLevel,
          reasons: result.reasons,
        }),
      ),
    );

    const scoreResult = await manager.save(
      PackageScoreResult,
      manager.create(PackageScoreResult, {
        analysisRunId: analysisRun.id,
        overallScore: qualityScore.overallScore,
        profitabilityScore: qualityScore.profitabilityScore,
        itineraryBalanceScore: qualityScore.itineraryBalanceScore,
        operationalFeasibilityScore: qualityScore.operationalFeasibilityScore,
        costStructureScore: qualityScore.costStructureScore,
      }),
    );

    const recommendations = await manager.save(
      GeneratedRecommendation,
      recommendationDrafts.map((recommendation) =>
        manager.create(GeneratedRecommendation, {
          analysisRunId: analysisRun.id,
          ruleCode: recommendation.ruleCode,
          category: recommendation.category,
          severity: recommendation.severity,
          title: recommendation.title,
          explanation: recommendation.explanation,
          suggestedAction: recommendation.suggestedAction,
          affectedMetric: recommendation.affectedMetric ?? null,
          affectedDayId: recommendation.affectedDayId ?? null,
          affectedItemId: recommendation.affectedItemId ?? null,
        }),
      ),
    );

    await manager.update(PackageAnalysisRun, analysisRun.id, {
      analysisStatus: AnalysisStatus.COMPLETED,
    });

    if (context.package.status === PackageStatus.DRAFT || context.package.status === PackageStatus.ANALYZED) {
      await manager.update(TourPackage, context.package.id, { status: PackageStatus.ANALYZED });
    }

    return {
      analysisRun: {
        ...analysisRun,
        analysisStatus: AnalysisStatus.COMPLETED,
      },
      financialResult,
      dailyFatigueResults,
      scoreResult,
      recommendations,
    };
  }

  private requireValue<T>(value: T | undefined, label: string): T {
    if (value === undefined) {
      throw new Error(`${label} must be calculated before persistence`);
    }

    return value;
  }
}
