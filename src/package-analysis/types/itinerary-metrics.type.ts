import { FatigueLevel } from '../../common/enums/fatigue-level.enum';

export type DayItineraryMetric = {
  dayId: number;
  dayNumber: number;
  title?: string;

  activityCount: number;
  majorActivityCount: number;
  highIntensityActivityCount: number;

  transferMinutes: number;
  flightMinutes: number;
  freeTimeMinutes: number;
  mealMinutes: number;
  dayDurationMinutes: number;

  shortBufferCount: number;
  missingDurationCount: number;
  invalidTimingCount: number;

  activityDensity: number;
  transferSharePercent: number;
  restRatioPercent: number;

  hasMealBreak: boolean;
  startsEarly: boolean;
  finishesLate: boolean;
};

export type DailyFatigueMetric = {
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
};

export type ItineraryAnalysisResult = {
  dailyFatigueResults: DailyFatigueMetric[];
  itineraryMetrics: DayItineraryMetric[];

  averageFatigueScore: number;
  averageBalanceScore: number;

  overloadedDaysCount: number;
  criticalDaysCount: number;
  highFatigueDaysCount: number;
  consecutiveHighFatigueSequences: number;

  validationWarnings: string[];
};
