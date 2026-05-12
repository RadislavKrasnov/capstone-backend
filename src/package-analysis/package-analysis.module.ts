import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { CostItem } from '../costs/entities/cost-item.entity';
import { Supplier } from '../costs/entities/supplier.entity';
import { ItineraryItem } from '../itinerary/entities/itinerary-item.entity';
import { TourDay } from '../itinerary/entities/tour-day.entity';
import { TourPackage } from '../tour-packages/entities/tour-package.entity';
import { AnalysisConfiguration } from './entities/analysis-configuration.entity';
import { DailyFatigueResult } from './entities/daily-fatigue-result.entity';
import { FinancialAnalysisResult } from './entities/financial-analysis-result.entity';
import { GeneratedRecommendation } from './entities/generated-recommendation.entity';
import { PackageAnalysisRun } from './entities/package-analysis-run.entity';
import { PackageScoreResult } from './entities/package-score-result.entity';
import { PackageAnalysisRunsController } from './package-analysis-runs.controller';
import { PackageAnalysisController } from './package-analysis.controller';
import { PackageAnalysisService } from './package-analysis.service';
import { BreakEvenRiskRule } from './rules/financial/break-even-risk.rule';
import { LowMarginRule } from './rules/financial/low-margin.rule';
import { NegativeProfitRule } from './rules/financial/negative-profit.rule';
import { NonPositiveContributionRule } from './rules/financial/non-positive-contribution.rule';
import { WeakSafetyBufferRule } from './rules/financial/weak-safety-buffer.rule';
import { ConsecutiveHighFatigueDaysRule } from './rules/itinerary/consecutive-high-fatigue-days.rule';
import { CriticalFatigueDayRule } from './rules/itinerary/critical-fatigue-day.rule';
import { InsufficientRestTimeRule } from './rules/itinerary/insufficient-rest-time.rule';
import { OverloadedDayRule } from './rules/itinerary/overloaded-day.rule';
import { UnderfilledDayRule } from './rules/itinerary/underfilled-day.rule';
import { HighOtherCostShareRule } from './rules/cost-structure/high-other-cost-share.rule';
import { HotelCostDominanceRule } from './rules/cost-structure/hotel-cost-dominance.rule';
import { SupplierDependencyRiskRule } from './rules/cost-structure/supplier-dependency-risk.rule';
import { TransportCostDominanceRule } from './rules/cost-structure/transport-cost-dominance.rule';
import { ExcessiveTransferTimeRule } from './rules/operational/excessive-transfer-time.rule';
import { LateFinishEarlyStartRule } from './rules/operational/late-finish-early-start.rule';
import { LongDayDurationRule } from './rules/operational/long-day-duration.rule';
import { NoMealBreakRule } from './rules/operational/no-meal-break.rule';
import { ShortBuffersRule } from './rules/operational/short-buffers.rule';
import { LowQualityScoreRule } from './rules/quality/low-quality-score.rule';
import { WeakSubScoreRule } from './rules/quality/weak-sub-score.rule';
import { AnalysisConfigurationResolverService } from './services/analysis-configuration-resolver.service';
import { AnalysisInputLoaderService } from './services/analysis-input-loader.service';
import { AnalysisResultPersisterService } from './services/analysis-result-persister.service';
import { FinancialAnalysisService } from './services/financial-analysis.service';
import { ItineraryFatigueAnalysisService } from './services/itinerary-fatigue-analysis.service';
import { PackageQualityScoreService } from './services/package-quality-score.service';
import { RecommendationEngineService } from './services/recommendation-engine.service';
import { HighFixedCostExposureRule } from './rules/financial/high-fixed-cost-exposure.rule';
import { VeryLowMarginRule } from './rules/financial/very-low-margin.rule';
import { HighActivityDensityRule } from './rules/operational/high-activity-density.rule';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TourPackage,
      TourDay,
      ItineraryItem,
      CostItem,
      Supplier,
      AnalysisConfiguration,
      PackageAnalysisRun,
      FinancialAnalysisResult,
      DailyFatigueResult,
      PackageScoreResult,
      GeneratedRecommendation,
    ]),
  ],
  controllers: [PackageAnalysisController, PackageAnalysisRunsController],
  providers: [
    PackageAnalysisService,
    AnalysisInputLoaderService,
    AnalysisConfigurationResolverService,
    AnalysisResultPersisterService,
    FinancialAnalysisService,
    ItineraryFatigueAnalysisService,
    PackageQualityScoreService,
    RecommendationEngineService,
    NegativeProfitRule,
    LowMarginRule,
    BreakEvenRiskRule,
    NonPositiveContributionRule,
    WeakSafetyBufferRule,
    OverloadedDayRule,
    CriticalFatigueDayRule,
    InsufficientRestTimeRule,
    UnderfilledDayRule,
    ConsecutiveHighFatigueDaysRule,
    ExcessiveTransferTimeRule,
    ShortBuffersRule,
    LongDayDurationRule,
    NoMealBreakRule,
    LateFinishEarlyStartRule,
    SupplierDependencyRiskRule,
    HotelCostDominanceRule,
    TransportCostDominanceRule,
    HighOtherCostShareRule,
    LowQualityScoreRule,
    WeakSubScoreRule,
    VeryLowMarginRule,
    HighFixedCostExposureRule,
    HighActivityDensityRule,
  ],
  exports: [PackageAnalysisService],
})
export class PackageAnalysisModule {}
