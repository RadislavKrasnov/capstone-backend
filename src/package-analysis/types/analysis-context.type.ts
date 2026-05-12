import { CostItem } from '../../costs/entities/cost-item.entity';
import { Supplier } from '../../costs/entities/supplier.entity';
import { ItineraryItem } from '../../itinerary/entities/itinerary-item.entity';
import { TourDay } from '../../itinerary/entities/tour-day.entity';
import { TourPackage } from '../../tour-packages/entities/tour-package.entity';
import { AnalysisConfiguration } from '../entities/analysis-configuration.entity';
import { FinancialMetrics } from './financial-metrics.type';
import { DailyFatigueMetric, DayItineraryMetric } from './itinerary-metrics.type';
import { CostStructureMetrics, QualityScore } from './quality-score.type';

export type AnalysisInput = {
  package: TourPackage;
  days: TourDay[];
  itineraryItems: ItineraryItem[];
  costItems: CostItem[];
  suppliers: Supplier[];
};

export type AnalysisContext = AnalysisInput & {
  configuration: AnalysisConfiguration;
  financialMetrics?: FinancialMetrics;
  dailyFatigueResults?: DailyFatigueMetric[];
  itineraryMetrics?: DayItineraryMetric[];
  costStructureMetrics?: CostStructureMetrics;
  qualityScore?: QualityScore;
};
