import { BadRequestException, Injectable } from '@nestjs/common';

import { FatigueLevel } from '../../common/enums/fatigue-level.enum';
import { ItineraryIntensity } from '../../common/enums/itinerary-intensity.enum';
import { ItineraryItemType } from '../../common/enums/itinerary-item-type.enum';
import { ItineraryItem } from '../../itinerary/entities/itinerary-item.entity';
import {
  ITINERARY_FATIGUE_MODEL,
  ITINERARY_RULE_THRESHOLDS,
  NUMERIC_FORMAT,
  QUALITY_SCORE_THRESHOLDS,
} from '../constants/analysis-thresholds.constants';
import { AnalysisContext } from '../types/analysis-context.type';
import {
  DailyFatigueMetric,
  DayItineraryMetric,
  ItineraryAnalysisResult,
} from '../types/itinerary-metrics.type';

@Injectable()
export class ItineraryFatigueAnalysisService {
  calculateItineraryFatigue(context: AnalysisContext): ItineraryAnalysisResult {
    if (!context.days.length) {
      throw new BadRequestException('At least one tour day is required for itinerary analysis');
    }

    const dailyFatigueResults: DailyFatigueMetric[] = [];
    const itineraryMetrics: DayItineraryMetric[] = [];
    const validationWarnings: string[] = [];

    for (const day of context.days) {
      const items = context.itineraryItems
        .filter((item) => item.dayId === day.id)
        .sort((a, b) => a.itemOrder - b.itemOrder);

      if (!items.length) {
        validationWarnings.push(`Day ${day.dayNumber} has no itinerary items.`);
      }

      const dayMetric = this.calculateDayMetric(
        day.id,
        day.dayNumber,
        day.title,
        day.isRestDay,
        items,
        context.configuration.minBufferMinutes,
      );

      const fatigueMetric = this.calculateDailyFatigueMetric(dayMetric, items);

      if (dayMetric.missingDurationCount > 0) {
        validationWarnings.push(
          `Day ${day.dayNumber} has ${dayMetric.missingDurationCount} item(s) with missing duration or time data.`,
        );
      }

      if (dayMetric.invalidTimingCount > 0) {
        validationWarnings.push(
          `Day ${day.dayNumber} has ${dayMetric.invalidTimingCount} item(s) where end time is not after start time.`,
        );
      }

      itineraryMetrics.push(dayMetric);
      dailyFatigueResults.push(fatigueMetric);
    }

    const averageFatigueScore = dailyFatigueResults.length
      ? this.round(
          dailyFatigueResults.reduce((sum, day) => sum + day.fatigueScore, 0) /
            dailyFatigueResults.length,
        )
      : 0;

    const averageBalanceScore = dailyFatigueResults.length
      ? this.round(
          dailyFatigueResults.reduce((sum, day) => sum + day.balanceScore, 0) /
            dailyFatigueResults.length,
        )
      : 0;

    return {
      dailyFatigueResults,
      itineraryMetrics,
      averageFatigueScore,
      averageBalanceScore,
      overloadedDaysCount: dailyFatigueResults.filter(
        (day) => day.fatigueScore > context.configuration.maxDailyFatigueScore,
      ).length,
      criticalDaysCount: dailyFatigueResults.filter(
        (day) => day.fatigueLevel === FatigueLevel.CRITICAL,
      ).length,
      highFatigueDaysCount: dailyFatigueResults.filter(
        (day) => day.fatigueLevel === FatigueLevel.HIGH,
      ).length,
      consecutiveHighFatigueSequences:
        this.countConsecutiveHighFatigueSequences(dailyFatigueResults),
      validationWarnings,
    };
  }

  private calculateDayMetric(
    dayId: number,
    dayNumber: number,
    title: string | undefined,
    isRestDay: boolean,
    items: ItineraryItem[],
    minBufferMinutes: number,
  ): DayItineraryMetric {
    const activityItems = items.filter((item) => item.type === ItineraryItemType.ACTIVITY);

    const transferMinutes = this.sumDuration(items, ItineraryItemType.TRANSFER);
    const flightMinutes = this.sumDuration(items, ItineraryItemType.FLIGHT);
    const freeTimeMinutes = this.sumDuration(items, ItineraryItemType.FREE_TIME);
    const mealMinutes = this.sumDuration(items, ItineraryItemType.MEAL);

    const activeDayMinutes = this.sumActiveDayMinutes(items);
    const dayDurationMinutes = this.calculateDayDurationMinutes(items);

    const shortBufferCount = this.calculateShortBufferCount(items, minBufferMinutes);
    const missingDurationCount = this.countMissingDurationItems(items);
    const invalidTimingCount = this.countInvalidTimingItems(items);

    const restMinutes = freeTimeMinutes + mealMinutes;

    return {
      dayId,
      dayNumber,
      title,
      isRestDay,

      activityCount: activityItems.length,
      majorActivityCount: activityItems.filter((item) => item.isMajorActivity).length,
      highIntensityActivityCount: activityItems.filter(
        (item) => item.intensity === ItineraryIntensity.HIGH,
      ).length,

      transferMinutes,
      flightMinutes,
      freeTimeMinutes,
      mealMinutes,
      dayDurationMinutes,

      shortBufferCount,
      missingDurationCount,
      invalidTimingCount,

      activityDensity:
        activeDayMinutes > 0
          ? this.round(activityItems.length / (activeDayMinutes / NUMERIC_FORMAT.MINUTES_PER_HOUR))
          : 0,

      transferSharePercent:
        activeDayMinutes > 0
          ? this.round(
              ((transferMinutes + flightMinutes) / activeDayMinutes) *
                NUMERIC_FORMAT.PERCENT_MULTIPLIER,
            )
          : 0,

      restRatioPercent:
        activeDayMinutes > 0
          ? this.round((restMinutes / activeDayMinutes) * NUMERIC_FORMAT.PERCENT_MULTIPLIER)
          : 0,

      hasMealBreak:
        mealMinutes >= ITINERARY_RULE_THRESHOLDS.MIN_MEAL_BREAK_MINUTES ||
        items.some((item) => item.type === ItineraryItemType.MEAL),
      startsEarly:
        this.getFirstStartMinute(items) !== null &&
        (this.getFirstStartMinute(items) ?? 0) < ITINERARY_FATIGUE_MODEL.EARLY_START_MINUTES,
      finishesLate:
        this.getLastEndMinute(items) !== null &&
        (this.getLastEndMinute(items) ?? 0) > ITINERARY_FATIGUE_MODEL.LATE_FINISH_MINUTES,
    };
  }

  private calculateDailyFatigueMetric(
    dayMetric: DayItineraryMetric,
    items: ItineraryItem[],
  ): DailyFatigueMetric {
    const activityLoad = dayMetric.activityCount * ITINERARY_FATIGUE_MODEL.ACTIVITY_LOAD_POINTS;

    const transferLoad =
      dayMetric.transferMinutes * ITINERARY_FATIGUE_MODEL.TRANSFER_LOAD_PER_MINUTE +
      dayMetric.flightMinutes * ITINERARY_FATIGUE_MODEL.FLIGHT_LOAD_PER_MINUTE;

    const intensityLoad = this.calculateIntensityPoints(items);

    const longDayPenalty = this.calculateLongDayPenalty(dayMetric.dayDurationMinutes);
    const shortBufferPenalty = Math.min(
      dayMetric.shortBufferCount * ITINERARY_FATIGUE_MODEL.SHORT_BUFFER_PENALTY_POINTS,
      ITINERARY_FATIGUE_MODEL.MAX_SHORT_BUFFER_PENALTY_POINTS,
    );
    const lateFinishPenalty = dayMetric.finishesLate
      ? ITINERARY_FATIGUE_MODEL.LATE_FINISH_PENALTY_POINTS
      : 0;
    const earlyStartPenalty = dayMetric.startsEarly
      ? ITINERARY_FATIGUE_MODEL.EARLY_START_PENALTY_POINTS
      : 0;
    const noMealBreakPenalty =
      dayMetric.dayDurationMinutes >
        ITINERARY_RULE_THRESHOLDS.LONG_DAY_REQUIRES_MEAL_BREAK_MINUTES && !dayMetric.hasMealBreak
        ? ITINERARY_FATIGUE_MODEL.NO_MEAL_BREAK_PENALTY_POINTS
        : 0;
    const highIntensityPenalty =
      dayMetric.highIntensityActivityCount >= ITINERARY_FATIGUE_MODEL.HIGH_INTENSITY_ACTIVITY_COUNT
        ? ITINERARY_FATIGUE_MODEL.HIGH_INTENSITY_DAY_PENALTY_POINTS
        : 0;

    const compressionPenalty =
      longDayPenalty +
      shortBufferPenalty +
      lateFinishPenalty +
      earlyStartPenalty +
      noMealBreakPenalty +
      highIntensityPenalty;

    const mealCredit = Math.min(
      dayMetric.mealMinutes * ITINERARY_FATIGUE_MODEL.MEAL_REST_CREDIT_PER_MINUTE,
      ITINERARY_FATIGUE_MODEL.MAX_MEAL_REST_CREDIT_POINTS,
    );
    const restCredit = Math.min(
      dayMetric.freeTimeMinutes * ITINERARY_FATIGUE_MODEL.FREE_TIME_REST_CREDIT_PER_MINUTE +
        mealCredit,
      ITINERARY_FATIGUE_MODEL.MAX_TOTAL_REST_CREDIT_POINTS,
    );

    const fatigueScore = this.clamp(
      Math.round(activityLoad + transferLoad + intensityLoad + compressionPenalty - restCredit),
      QUALITY_SCORE_THRESHOLDS.MIN_SCORE,
      QUALITY_SCORE_THRESHOLDS.MAX_SCORE,
    );

    const balanceScore = this.calculateBalanceScore(dayMetric, fatigueScore);
    const fatigueLevel = this.resolveFatigueLevel(fatigueScore);
    const reasons = this.buildReasons(dayMetric, fatigueScore);

    return {
      dayId: dayMetric.dayId,
      dayNumber: dayMetric.dayNumber,

      activityLoad: this.round(activityLoad),
      transferLoad: this.round(transferLoad),
      intensityLoad: this.round(intensityLoad),
      compressionPenalty: this.round(compressionPenalty),
      restCredit: this.round(restCredit),

      fatigueScore,
      balanceScore,
      fatigueLevel,
      reasons,
    };
  }

  private calculateBalanceScore(dayMetric: DayItineraryMetric, fatigueScore: number): number {
    let balanceScore = this.clamp(
      QUALITY_SCORE_THRESHOLDS.MAX_SCORE - fatigueScore,
      QUALITY_SCORE_THRESHOLDS.MIN_SCORE,
      QUALITY_SCORE_THRESHOLDS.MAX_SCORE,
    );

    if (dayMetric.isRestDay) {
      return balanceScore;
    }

    if (
      dayMetric.activityCount === 0 &&
      dayMetric.freeTimeMinutes <
        ITINERARY_RULE_THRESHOLDS.MIN_FREE_TIME_FOR_EMPTY_NON_REST_DAY_MINUTES
    ) {
      balanceScore = Math.min(
        balanceScore,
        ITINERARY_FATIGUE_MODEL.REST_DAY_LOW_ACTIVITY_BALANCE_CAP,
      );
    }

    if (
      dayMetric.activityCount === 1 &&
      dayMetric.dayDurationMinutes < ITINERARY_RULE_THRESHOLDS.SHORT_ACTIVITY_DAY_DURATION_MINUTES
    ) {
      balanceScore = Math.min(
        balanceScore,
        ITINERARY_FATIGUE_MODEL.SHORT_SINGLE_ACTIVITY_BALANCE_CAP,
      );
    }

    return balanceScore;
  }

  private calculateLongDayPenalty(dayDurationMinutes: number): number {
    if (dayDurationMinutes > ITINERARY_RULE_THRESHOLDS.VERY_LONG_DAY_MINUTES) {
      return ITINERARY_FATIGUE_MODEL.VERY_LONG_DAY_PENALTY_POINTS;
    }

    if (dayDurationMinutes > ITINERARY_RULE_THRESHOLDS.LONG_DAY_MINUTES) {
      return ITINERARY_FATIGUE_MODEL.LONG_DAY_PENALTY_POINTS;
    }

    return 0;
  }

  private calculateIntensityPoints(items: ItineraryItem[]): number {
    return items.reduce((sum, item) => {
      if (item.type !== ItineraryItemType.ACTIVITY) {
        return sum;
      }

      if (item.intensity === ItineraryIntensity.HIGH) {
        return sum + ITINERARY_FATIGUE_MODEL.HIGH_INTENSITY_ACTIVITY_POINTS;
      }

      if (item.intensity === ItineraryIntensity.LOW) {
        return sum + ITINERARY_FATIGUE_MODEL.LOW_INTENSITY_ACTIVITY_POINTS;
      }

      return sum + ITINERARY_FATIGUE_MODEL.MEDIUM_INTENSITY_ACTIVITY_POINTS;
    }, 0);
  }

  private buildReasons(dayMetric: DayItineraryMetric, fatigueScore: number): string[] {
    const reasons: string[] = [];

    if (dayMetric.activityCount >= ITINERARY_FATIGUE_MODEL.MANY_ACTIVITIES_COUNT) {
      reasons.push(
        `${dayMetric.activityCount} activities are planned, which may overload the day.`,
      );
    }

    if (dayMetric.transferMinutes > ITINERARY_FATIGUE_MODEL.HIGH_TRANSFER_REASON_MINUTES) {
      reasons.push(
        `Transfer time is ${dayMetric.transferMinutes} minutes, exceeding the recommended ${ITINERARY_FATIGUE_MODEL.HIGH_TRANSFER_REASON_MINUTES}-minute limit.`,
      );
    }

    if (
      dayMetric.flightMinutes > 0 &&
      dayMetric.transferMinutes + dayMetric.flightMinutes >
        ITINERARY_FATIGUE_MODEL.HIGH_TRANSFER_REASON_MINUTES
    ) {
      reasons.push('Combined transfer and flight time is high for one day.');
    }

    if (dayMetric.shortBufferCount > 0) {
      reasons.push('Some major itinerary items have insufficient buffer time between them.');
    }

    if (dayMetric.dayDurationMinutes > ITINERARY_RULE_THRESHOLDS.LONG_DAY_MINUTES) {
      reasons.push('The planned day is longer than 12 hours.');
    }

    if (dayMetric.startsEarly) {
      reasons.push('The day starts before 07:00, which may reduce traveler comfort.');
    }

    if (dayMetric.finishesLate) {
      reasons.push('The day finishes after 22:00, which may reduce recovery time.');
    }

    if (
      dayMetric.dayDurationMinutes >
        ITINERARY_RULE_THRESHOLDS.LONG_DAY_REQUIRES_MEAL_BREAK_MINUTES &&
      !dayMetric.hasMealBreak
    ) {
      reasons.push('No meal break is scheduled during a long day.');
    }

    if (
      dayMetric.freeTimeMinutes < ITINERARY_RULE_THRESHOLDS.MIN_REST_MINUTES_FOR_BUSY_DAY &&
      dayMetric.activityCount >= ITINERARY_RULE_THRESHOLDS.BUSY_DAY_ACTIVITY_COUNT
    ) {
      reasons.push('Limited free time is planned despite a busy activity schedule.');
    }

    if (
      dayMetric.highIntensityActivityCount >= ITINERARY_FATIGUE_MODEL.HIGH_INTENSITY_ACTIVITY_COUNT
    ) {
      reasons.push('Multiple high-intensity activities are planned in one day.');
    }

    if (dayMetric.activityDensity > ITINERARY_RULE_THRESHOLDS.HIGH_ACTIVITY_DENSITY) {
      reasons.push('Activity density is high, which may make the schedule feel rushed.');
    }

    if (dayMetric.activityCount === 0 && dayMetric.isRestDay) {
      reasons.push('The day is marked as a planned rest day.');
    }

    if (
      !dayMetric.isRestDay &&
      dayMetric.activityCount === 0 &&
      dayMetric.freeTimeMinutes <
        ITINERARY_RULE_THRESHOLDS.MIN_FREE_TIME_FOR_EMPTY_NON_REST_DAY_MINUTES
    ) {
      reasons.push('The day appears underfilled and may reduce perceived package value.');
    }

    if (
      !dayMetric.isRestDay &&
      dayMetric.activityCount === 1 &&
      dayMetric.dayDurationMinutes < ITINERARY_RULE_THRESHOLDS.SHORT_ACTIVITY_DAY_DURATION_MINUTES
    ) {
      reasons.push('The day has only one short planned activity and may feel weakly filled.');
    }

    if (dayMetric.missingDurationCount > 0) {
      reasons.push('Some itinerary items have missing duration or time data.');
    }

    if (dayMetric.invalidTimingCount > 0) {
      reasons.push(
        'Some itinerary items have invalid timing where end time is not after start time.',
      );
    }

    if (!reasons.length && fatigueScore <= ITINERARY_FATIGUE_MODEL.BALANCED_DAY_MAX_FATIGUE_SCORE) {
      reasons.push('The day has a balanced activity and rest structure.');
    }

    return reasons;
  }

  private sumDuration(items: ItineraryItem[], type: ItineraryItemType): number {
    return items
      .filter((item) => item.type === type)
      .reduce((sum, item) => sum + this.resolveDurationMinutes(item), 0);
  }

  private sumActiveDayMinutes(items: ItineraryItem[]): number {
    const activeTypes = new Set<ItineraryItemType>([
      ItineraryItemType.ACTIVITY,
      ItineraryItemType.TRANSFER,
      ItineraryItemType.MEAL,
      ItineraryItemType.FREE_TIME,
      ItineraryItemType.FLIGHT,
    ]);

    return items
      .filter((item) => activeTypes.has(item.type))
      .reduce((sum, item) => sum + this.resolveDurationMinutes(item), 0);
  }

  private calculateDayDurationMinutes(items: ItineraryItem[]): number {
    const meaningfulItems = items.filter((item) =>
      [
        ItineraryItemType.ACTIVITY,
        ItineraryItemType.TRANSFER,
        ItineraryItemType.MEAL,
        ItineraryItemType.FREE_TIME,
        ItineraryItemType.FLIGHT,
      ].includes(item.type),
    );

    const startMinutes = meaningfulItems
      .map((item) => this.parseTimeToMinutes(item.startTime))
      .filter((value): value is number => value !== null);

    const endMinutes = meaningfulItems
      .map((item) => this.parseTimeToMinutes(item.endTime))
      .filter((value): value is number => value !== null);

    if (startMinutes.length && endMinutes.length) {
      return Math.max(0, Math.max(...endMinutes) - Math.min(...startMinutes));
    }

    return meaningfulItems.reduce((sum, item) => sum + this.resolveDurationMinutes(item), 0);
  }

  private calculateShortBufferCount(items: ItineraryItem[], minBufferMinutes: number): number {
    const scheduledMajorItems = items
      .filter((item) => this.isMajorScheduledItem(item))
      .sort((a, b) => {
        const aStart = this.parseTimeToMinutes(a.startTime) ?? 0;
        const bStart = this.parseTimeToMinutes(b.startTime) ?? 0;

        return aStart - bStart;
      });

    let count = 0;

    for (let index = 1; index < scheduledMajorItems.length; index += 1) {
      const previousEnd = this.parseTimeToMinutes(scheduledMajorItems[index - 1].endTime);
      const currentStart = this.parseTimeToMinutes(scheduledMajorItems[index].startTime);

      if (previousEnd === null || currentStart === null) {
        continue;
      }

      const gapMinutes = currentStart - previousEnd;

      if (gapMinutes >= 0 && gapMinutes < minBufferMinutes) {
        count += 1;
      }
    }

    return count;
  }

  private isMajorScheduledItem(item: ItineraryItem): boolean {
    return (
      item.isMajorActivity ||
      item.type === ItineraryItemType.ACTIVITY ||
      item.type === ItineraryItemType.TRANSFER ||
      item.type === ItineraryItemType.FLIGHT
    );
  }

  private resolveDurationMinutes(item: ItineraryItem): number {
    if (item.durationMinutes !== null && item.durationMinutes !== undefined) {
      return Math.max(0, item.durationMinutes);
    }

    return this.calculateItemDurationFromTime(item);
  }

  private calculateItemDurationFromTime(item: ItineraryItem): number {
    const start = this.parseTimeToMinutes(item.startTime);
    const end = this.parseTimeToMinutes(item.endTime);

    if (start === null || end === null || end <= start) {
      return 0;
    }

    return end - start;
  }

  private countMissingDurationItems(items: ItineraryItem[]): number {
    return items.filter((item) => {
      const hasDuration = item.durationMinutes !== null && item.durationMinutes !== undefined;
      const hasValidTimeDuration = this.calculateItemDurationFromTime(item) > 0;

      return !hasDuration && !hasValidTimeDuration;
    }).length;
  }

  private countInvalidTimingItems(items: ItineraryItem[]): number {
    return items.filter((item) => {
      const start = this.parseTimeToMinutes(item.startTime);
      const end = this.parseTimeToMinutes(item.endTime);

      return start !== null && end !== null && end <= start;
    }).length;
  }

  private countConsecutiveHighFatigueSequences(dailyResults: DailyFatigueMetric[]): number {
    const sortedResults = [...dailyResults].sort((a, b) => a.dayNumber - b.dayNumber);
    let count = 0;

    for (let index = 1; index < sortedResults.length; index += 1) {
      if (
        sortedResults[index - 1].fatigueScore >
          ITINERARY_FATIGUE_MODEL.CONSECUTIVE_HIGH_FATIGUE_SCORE &&
        sortedResults[index].fatigueScore > ITINERARY_FATIGUE_MODEL.CONSECUTIVE_HIGH_FATIGUE_SCORE
      ) {
        count += 1;
      }
    }

    return count;
  }

  private getFirstStartMinute(items: ItineraryItem[]): number | null {
    const startMinutes = items
      .map((item) => this.parseTimeToMinutes(item.startTime))
      .filter((value): value is number => value !== null);

    return startMinutes.length ? Math.min(...startMinutes) : null;
  }

  private getLastEndMinute(items: ItineraryItem[]): number | null {
    const endMinutes = items
      .map((item) => this.parseTimeToMinutes(item.endTime))
      .filter((value): value is number => value !== null);

    return endMinutes.length ? Math.max(...endMinutes) : null;
  }

  private parseTimeToMinutes(value?: string | null): number | null {
    if (!value) {
      return null;
    }

    const [hoursRaw, minutesRaw] = value.split(':');
    const hours = Number(hoursRaw);
    const minutes = Number(minutesRaw);

    if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
      return null;
    }

    return hours * NUMERIC_FORMAT.MINUTES_PER_HOUR + minutes;
  }

  private resolveFatigueLevel(fatigueScore: number): FatigueLevel {
    if (fatigueScore >= ITINERARY_FATIGUE_MODEL.CRITICAL_FATIGUE_SCORE) {
      return FatigueLevel.CRITICAL;
    }

    if (fatigueScore >= ITINERARY_FATIGUE_MODEL.HIGH_FATIGUE_SCORE) {
      return FatigueLevel.HIGH;
    }

    if (fatigueScore >= ITINERARY_FATIGUE_MODEL.MODERATE_FATIGUE_SCORE) {
      return FatigueLevel.MODERATE;
    }

    return FatigueLevel.LOW;
  }

  private clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  }

  private round(value: number): number {
    return (
      Math.round(value * NUMERIC_FORMAT.PERCENT_MULTIPLIER) / NUMERIC_FORMAT.PERCENT_MULTIPLIER
    );
  }
}
