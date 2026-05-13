import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';

import { AnalysisStatus } from '../common/enums/analysis-status.enum';
import { RecommendationCategory } from '../common/enums/recommendation-category.enum';
import { RecommendationSeverity } from '../common/enums/recommendation-severity.enum';
import { DailyFatigueResult } from './entities/daily-fatigue-result.entity';
import { FinancialAnalysisResult } from './entities/financial-analysis-result.entity';
import { GeneratedRecommendation } from './entities/generated-recommendation.entity';
import { PackageAnalysisRun } from './entities/package-analysis-run.entity';
import { PackageScoreResult } from './entities/package-score-result.entity';
import { AnalysisConfigurationResolverService } from './services/analysis-configuration-resolver.service';
import { AnalysisInputLoaderService } from './services/analysis-input-loader.service';
import { AnalysisResultPersisterService } from './services/analysis-result-persister.service';
import { FinancialAnalysisService } from './services/financial-analysis.service';
import { ItineraryFatigueAnalysisService } from './services/itinerary-fatigue-analysis.service';
import { PackageQualityScoreService } from './services/package-quality-score.service';
import { RecommendationEngineService } from './services/recommendation-engine.service';
import { AnalysisContext } from './types/analysis-context.type';
import {
  AnalysisDashboardRecommendation,
  AnalysisDashboardResponse,
  FinancialRiskLevel,
  QualityLevel,
} from './types/analysis-dashboard-response.type';
import { RecommendationDraft } from './types/recommendation-draft.type';

@Injectable()
export class PackageAnalysisService {
  private readonly algorithmVersion = 'v1';

  constructor(
    private readonly dataSource: DataSource,

    @InjectRepository(PackageAnalysisRun)
    private readonly packageAnalysisRunsRepository: Repository<PackageAnalysisRun>,

    private readonly analysisInputLoader: AnalysisInputLoaderService,
    private readonly configurationResolver: AnalysisConfigurationResolverService,
    private readonly financialAnalysisService: FinancialAnalysisService,
    private readonly itineraryFatigueAnalysisService: ItineraryFatigueAnalysisService,
    private readonly packageQualityScoreService: PackageQualityScoreService,
    private readonly recommendationEngineService: RecommendationEngineService,
    private readonly analysisResultPersister: AnalysisResultPersisterService,
  ) {}

  async analyzePackage(
    packageUuid: string,
    triggeredByUserId?: number,
  ): Promise<AnalysisDashboardResponse> {
    const context = await this.buildBaseContext(packageUuid);

    this.validateAnalysisCompleteness(context);

    const analysisRun = await this.packageAnalysisRunsRepository.save(
      this.packageAnalysisRunsRepository.create({
        packageId: context.package.id,
        triggeredByUserId: triggeredByUserId ?? null,
        analysisStatus: AnalysisStatus.FAILED,
        algorithmVersion: this.algorithmVersion,
      }),
    );

    try {
      return await this.dataSource.transaction(async (manager) => {
        this.calculateFullContext(context);

        const recommendationDrafts =
          this.recommendationEngineService.generateRecommendations(context);

        const persisted = await this.analysisResultPersister.persistCompletedAnalysis(
          manager,
          analysisRun,
          context,
          recommendationDrafts,
        );

        return this.buildDashboardResponse({
          ...persisted,
          context,
        });
      });
    } catch (error) {
      await this.packageAnalysisRunsRepository.update(analysisRun.id, {
        analysisStatus: AnalysisStatus.FAILED,
      });

      throw error;
    }
  }

  async getLatestCompletedAnalysis(packageUuid: string): Promise<AnalysisDashboardResponse> {
    const context = await this.buildBaseContext(packageUuid);

    const analysisRun = await this.packageAnalysisRunsRepository.findOne({
      where: {
        packageId: context.package.id,
        analysisStatus: AnalysisStatus.COMPLETED,
      },
      relations: {
        financialResult: true,
        scoreResult: true,
        dailyFatigueResults: true,
        recommendations: true,
      },
      order: {
        createdAt: 'DESC',
      },
    });

    if (!analysisRun) {
      throw new NotFoundException('Completed analysis was not found for this package');
    }

    this.calculateFullContext(context);

    return this.buildDashboardResponse({
      analysisRun,
      financialResult: analysisRun.financialResult,
      dailyFatigueResults: this.sortDailyFatigueResults(analysisRun.dailyFatigueResults),
      scoreResult: analysisRun.scoreResult,
      recommendations: this.sortRecommendations(analysisRun.recommendations),
      context,
    });
  }

  async getAnalysisRuns(packageUuid: string) {
    const context = await this.buildBaseContext(packageUuid);
    const [runs, totalItems] = await this.packageAnalysisRunsRepository.findAndCount({
      where: {
        packageId: context.package.id,
      },
      order: {
        createdAt: 'DESC',
      },
    });

    return {
      data: runs.map((run) => ({
        uuid: run.uuid,
        status: run.analysisStatus,
        algorithmVersion: run.algorithmVersion,
        createdAt: run.createdAt,
      })),
      meta: {
        totalItems,
      },
    };
  }

  async getAnalysisRun(runUuid: string): Promise<AnalysisDashboardResponse> {
    const analysisRun = await this.packageAnalysisRunsRepository.findOne({
      where: { uuid: runUuid },
      relations: {
        package: true,
        financialResult: true,
        scoreResult: true,
        dailyFatigueResults: true,
        recommendations: true,
      },
    });

    if (!analysisRun) {
      throw new NotFoundException('Analysis run was not found');
    }

    if (analysisRun.analysisStatus !== AnalysisStatus.COMPLETED) {
      throw new NotFoundException('Completed results were not found for this analysis run');
    }

    const context = await this.buildBaseContext(analysisRun.package.uuid);
    this.calculateFullContext(context);

    return this.buildDashboardResponse({
      analysisRun,
      financialResult: analysisRun.financialResult,
      dailyFatigueResults: this.sortDailyFatigueResults(analysisRun.dailyFatigueResults),
      scoreResult: analysisRun.scoreResult,
      recommendations: this.sortRecommendations(analysisRun.recommendations),
      context,
    });
  }

  private async buildBaseContext(packageUuid: string): Promise<AnalysisContext> {
    const input = await this.analysisInputLoader.loadPackageAnalysisInput(packageUuid);
    const configuration = await this.configurationResolver.resolveForAgency(input.package.agencyId);

    return {
      ...input,
      configuration,
    };
  }

  private calculateFullContext(context: AnalysisContext): void {
    context.financialMetrics = this.financialAnalysisService.calculateFinancialMetrics(context);
    const itineraryAnalysis =
      this.itineraryFatigueAnalysisService.calculateItineraryFatigue(context);
    context.dailyFatigueResults = itineraryAnalysis.dailyFatigueResults;
    context.itineraryMetrics = itineraryAnalysis.itineraryMetrics;
    context.costStructureMetrics =
      this.packageQualityScoreService.calculateCostStructureMetrics(context);
    context.qualityScore = this.packageQualityScoreService.calculateQualityScore(context);
  }

  private buildDashboardResponse(input: {
    analysisRun: PackageAnalysisRun;
    financialResult: FinancialAnalysisResult;
    dailyFatigueResults: DailyFatigueResult[];
    scoreResult: PackageScoreResult;
    recommendations: GeneratedRecommendation[];
    context?: AnalysisContext;
  }): AnalysisDashboardResponse {
    const financial = {
      totalRevenue: this.toNumber(input.financialResult.totalRevenue),
      totalCost: this.toNumber(input.financialResult.totalCost),
      grossProfit: this.toNumber(input.financialResult.grossProfit),
      grossMarginPercent: this.toNumber(input.financialResult.grossMarginPercent),
      fixedCostTotal: this.toNumber(input.financialResult.fixedCostTotal),
      variableCostTotal: this.toNumber(input.financialResult.variableCostTotal),
      variableCostPerPerson: this.toNumber(input.financialResult.variableCostPerPerson),
      contributionPerPerson: this.toNumber(input.financialResult.contributionPerPerson),
      breakEvenGroupSize: this.toNumber(input.financialResult.breakEvenGroupSize),
    };

    const calculatedFinancial = input.context?.financialMetrics;
    const expectedGroupSize = input.context?.package.expectedGroupSize ?? 0;
    const sellingPricePerPerson = input.context
      ? this.toNumber(input.context.package.sellingPricePerPerson)
      : 0;

    const minTargetMarginPercent = input.context
      ? this.toNumber(input.context.configuration.minTargetMarginPercent)
      : 15;

    const targetMarginRatio = minTargetMarginPercent / 100;

    const fallbackBreakEvenGroupSizeRounded =
      financial.contributionPerPerson > 0 ? Math.ceil(financial.breakEvenGroupSize) : 0;

    const fallbackBreakEvenSafetyTravelers =
      expectedGroupSize > 0 && financial.contributionPerPerson > 0
        ? expectedGroupSize - fallbackBreakEvenGroupSizeRounded
        : 0;

    const fallbackBreakEvenUtilizationPercent =
      expectedGroupSize > 0 && financial.contributionPerPerson > 0
        ? (fallbackBreakEvenGroupSizeRounded / expectedGroupSize) * 100
        : 100;

    const fallbackRequiredPriceForTargetMargin =
      expectedGroupSize > 0 && targetMarginRatio < 1
        ? financial.totalCost / (expectedGroupSize * (1 - targetMarginRatio))
        : 0;

    const fallbackPriceGapPerPerson = fallbackRequiredPriceForTargetMargin - sellingPricePerPerson;

    const fallbackRequiredCostReductionForTargetMargin = Math.max(
      0,
      financial.totalCost - financial.totalRevenue * (1 - targetMarginRatio),
    );

    const fallbackCostPerPerson =
      expectedGroupSize > 0 ? financial.totalCost / expectedGroupSize : 0;
    const fallbackProfitPerPerson = sellingPricePerPerson - fallbackCostPerPerson;
    const fallbackMarkupPercent =
      financial.totalCost > 0 ? (financial.grossProfit / financial.totalCost) * 100 : 0;

    const recommendationDtos = input.recommendations.map((recommendation) =>
      this.buildRecommendationDto(recommendation),
    );

    const itineraryAnalysis = input.context
      ? this.itineraryFatigueAnalysisService.calculateItineraryFatigue(input.context)
      : undefined;

    return {
      analysisRun: {
        uuid: input.analysisRun.uuid,
        status: input.analysisRun.analysisStatus,
        algorithmVersion: input.analysisRun.algorithmVersion,
        createdAt: input.analysisRun.createdAt,
      },
      financial: {
        ...financial,

        costPerPerson: calculatedFinancial?.costPerPerson ?? this.round(fallbackCostPerPerson),
        profitPerPerson:
          calculatedFinancial?.profitPerPerson ?? this.round(fallbackProfitPerPerson),

        breakEvenGroupSizeRounded:
          calculatedFinancial?.breakEvenGroupSizeRounded ?? fallbackBreakEvenGroupSizeRounded,

        breakEvenSafetyTravelers:
          calculatedFinancial?.breakEvenSafetyTravelers ??
          this.round(fallbackBreakEvenSafetyTravelers),

        breakEvenUtilizationPercent:
          calculatedFinancial?.breakEvenUtilizationPercent ??
          this.round(fallbackBreakEvenUtilizationPercent),

        requiredPriceForTargetMargin:
          calculatedFinancial?.requiredPriceForTargetMargin ??
          this.round(fallbackRequiredPriceForTargetMargin),

        priceGapPerPerson:
          calculatedFinancial?.priceGapPerPerson ?? this.round(fallbackPriceGapPerPerson),

        requiredCostReductionForTargetMargin:
          calculatedFinancial?.requiredCostReductionForTargetMargin ??
          this.round(fallbackRequiredCostReductionForTargetMargin),

        markupPercent: calculatedFinancial?.markupPercent ?? this.round(fallbackMarkupPercent),

        financialRiskLevel:
          calculatedFinancial?.financialRiskLevel ??
          this.resolveFinancialRiskLevel(
            financial.grossProfit,
            financial.contributionPerPerson,
            financial.grossMarginPercent,
            fallbackBreakEvenUtilizationPercent,
            minTargetMarginPercent,
          ),

        categoryCostBreakdown: calculatedFinancial?.categoryCostBreakdown ?? [],
        supplierCostBreakdown: calculatedFinancial?.supplierCostBreakdown ?? [],
      },
      itinerary: {
        itineraryBalanceScore: input.scoreResult.itineraryBalanceScore,
        averageFatigueScore: itineraryAnalysis?.averageFatigueScore ?? 0,
        averageBalanceScore: itineraryAnalysis?.averageBalanceScore ?? 0,
        overloadedDaysCount: itineraryAnalysis?.overloadedDaysCount ?? 0,
        criticalDaysCount: itineraryAnalysis?.criticalDaysCount ?? 0,
        consecutiveHighFatigueSequences: itineraryAnalysis?.consecutiveHighFatigueSequences ?? 0,
        validationWarnings: itineraryAnalysis?.validationWarnings ?? [],
        dailyResults: this.buildItineraryDailyResults(input.dailyFatigueResults, input.context),
      },
      quality: {
        overallScore: input.scoreResult.overallScore,
        qualityLevel: this.resolveQualityLevel(input.scoreResult.overallScore),
        profitabilityScore: input.scoreResult.profitabilityScore,
        itineraryBalanceScore: input.scoreResult.itineraryBalanceScore,
        operationalFeasibilityScore: input.scoreResult.operationalFeasibilityScore,
        costStructureScore: input.scoreResult.costStructureScore,
        appliedCaps: input.context?.qualityScore?.appliedCaps ?? [],
      },
      recommendations: {
        countsBySeverity: {
          critical: recommendationDtos.filter(
            (recommendation) => recommendation.severity === RecommendationSeverity.CRITICAL,
          ).length,
          high: recommendationDtos.filter(
            (recommendation) => recommendation.severity === RecommendationSeverity.HIGH,
          ).length,
          medium: recommendationDtos.filter(
            (recommendation) => recommendation.severity === RecommendationSeverity.MEDIUM,
          ).length,
          low: recommendationDtos.filter(
            (recommendation) => recommendation.severity === RecommendationSeverity.LOW,
          ).length,
        },
        topRecommendations: recommendationDtos.slice(0, 8),
        groups: {
          financial: recommendationDtos.filter(
            (recommendation) => recommendation.category === RecommendationCategory.FINANCIAL,
          ),
          itinerary: recommendationDtos.filter(
            (recommendation) => recommendation.category === RecommendationCategory.ITINERARY,
          ),
          operational: recommendationDtos.filter(
            (recommendation) => recommendation.category === RecommendationCategory.OPERATIONAL,
          ),
          costStructure: recommendationDtos.filter(
            (recommendation) => recommendation.category === RecommendationCategory.COST_STRUCTURE,
          ),
        },
      },
    };
  }

  private buildRecommendationDto(
    recommendation: GeneratedRecommendation | RecommendationDraft,
  ): AnalysisDashboardRecommendation {
    return {
      uuid: 'uuid' in recommendation ? recommendation.uuid : undefined,
      ruleCode: recommendation.ruleCode,
      category: recommendation.category,
      severity: recommendation.severity,
      title: recommendation.title,
      explanation: recommendation.explanation,
      suggestedAction: recommendation.suggestedAction,
      affectedMetric: recommendation.affectedMetric ?? null,
      affectedDayId: recommendation.affectedDayId ?? null,
      affectedItemId: recommendation.affectedItemId ?? null,
    };
  }

  private resolveFinancialRiskLevel(
    grossProfit: number,
    contributionPerPerson: number,
    grossMarginPercent: number,
    breakEvenUtilizationPercent: number,
    minTargetMarginPercent: number,
  ): FinancialRiskLevel {
    if (grossProfit < 0 || contributionPerPerson <= 0) {
      return 'CRITICAL';
    }

    if (grossMarginPercent < minTargetMarginPercent / 2 || breakEvenUtilizationPercent > 100) {
      return 'HIGH';
    }

    if (grossMarginPercent < minTargetMarginPercent || breakEvenUtilizationPercent > 80) {
      return 'MEDIUM';
    }

    return 'LOW';
  }

  private resolveQualityLevel(score: number): QualityLevel {
    if (score >= 85) {
      return 'EXCELLENT';
    }

    if (score >= 70) {
      return 'GOOD';
    }

    if (score >= 55) {
      return 'RISKY';
    }

    if (score >= 40) {
      return 'POOR';
    }

    return 'CRITICAL';
  }

  private sortDailyFatigueResults(results: DailyFatigueResult[]): DailyFatigueResult[] {
    return [...results].sort((a, b) => a.dayId - b.dayId);
  }

  private sortRecommendations(
    recommendations: GeneratedRecommendation[],
  ): GeneratedRecommendation[] {
    return [...recommendations].sort(
      (a, b) => this.getSeverityOrder(a.severity) - this.getSeverityOrder(b.severity),
    );
  }

  private getSeverityOrder(severity: RecommendationSeverity): number {
    const order: Record<RecommendationSeverity, number> = {
      [RecommendationSeverity.CRITICAL]: 0,
      [RecommendationSeverity.HIGH]: 1,
      [RecommendationSeverity.MEDIUM]: 2,
      [RecommendationSeverity.LOW]: 3,
    };

    return order[severity];
  }

  private toNumber(value: string | number | null | undefined): number {
    if (value === null || value === undefined) {
      return 0;
    }

    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  private round(value: number): number {
    return Math.round(value * 100) / 100;
  }

  private buildItineraryDailyResults(
    dailyResults: DailyFatigueResult[],
    context?: AnalysisContext,
  ): AnalysisDashboardResponse['itinerary']['dailyResults'] {
    const itineraryMetricsByDayId = new Map(
      (context?.itineraryMetrics ?? []).map((metric) => [metric.dayId, metric]),
    );

    return dailyResults
      .sort((a, b) => a.dayId - b.dayId)
      .map((result) => {
        const metric = itineraryMetricsByDayId.get(result.dayId);

        return {
          dayId: result.dayId,
          dayNumber: metric?.dayNumber ?? 0,
          title: metric?.title,
          isRestDay: metric?.isRestDay ?? false,

          activityCount: metric?.activityCount ?? 0,
          transferMinutes: metric?.transferMinutes ?? 0,
          flightMinutes: metric?.flightMinutes ?? 0,
          freeTimeMinutes: metric?.freeTimeMinutes ?? 0,
          mealMinutes: metric?.mealMinutes ?? 0,
          dayDurationMinutes: metric?.dayDurationMinutes ?? 0,

          activityLoad: this.toNumber(result.activityLoad),
          transferLoad: this.toNumber(result.transferLoad),
          intensityLoad: this.toNumber(result.intensityLoad),
          compressionPenalty: this.toNumber(result.compressionPenalty),
          restCredit: this.toNumber(result.restCredit),

          fatigueScore: result.fatigueScore,
          balanceScore: result.balanceScore,
          fatigueLevel: result.fatigueLevel,

          transferSharePercent: metric?.transferSharePercent ?? 0,
          activityDensity: metric?.activityDensity ?? 0,
          restRatioPercent: metric?.restRatioPercent ?? 0,

          reasons: result.reasons,
        };
      });
  }

  private validateAnalysisCompleteness(context: AnalysisContext): void {
    const blockingRecommendations = this.recommendationEngineService
      .generateRecommendations(context)
      .filter((recommendation) =>
        ['MISSING_COST_DATA', 'MISSING_ITINERARY_DATA'].includes(recommendation.ruleCode),
      );

    if (!blockingRecommendations.length) {
      return;
    }

    throw new BadRequestException({
      message: 'Package cannot be analyzed because required analysis data is missing.',
      recommendations: blockingRecommendations.map((recommendation) =>
        this.buildRecommendationDto(recommendation),
      ),
    });
  }
}
