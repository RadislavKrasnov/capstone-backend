import { Injectable } from '@nestjs/common';

import { FatigueLevel } from '../../common/enums/fatigue-level.enum';
import { ItineraryIntensity } from '../../common/enums/itinerary-intensity.enum';
import { ItineraryItemType } from '../../common/enums/itinerary-item-type.enum';
import { ItineraryItem } from '../../itinerary/entities/itinerary-item.entity';
import { AnalysisContext } from '../types/analysis-context.type';
import { DailyFatigueMetric, DayItineraryMetric, ItineraryAnalysisResult } from '../types/itinerary-metrics.type';

@Injectable()
export class ItineraryFatigueAnalysisService {
  calculateItineraryFatigue(context: AnalysisContext): ItineraryAnalysisResult {
    const dailyFatigueResults: DailyFatigueMetric[] = [];
    const itineraryMetrics: DayItineraryMetric[] = [];

    for (const day of context.days) {
      const items = context.itineraryItems
        .filter((item) => item.dayId === day.id)
        .sort((a, b) => a.itemOrder - b.itemOrder);

      const dayMetric = this.calculateDayMetric(day.id, day.dayNumber, items, context.configuration.minBufferMinutes);
      const fatigueMetric = this.calculateDailyFatigueMetric(dayMetric, items);

      itineraryMetrics.push(dayMetric);
      dailyFatigueResults.push(fatigueMetric);
    }

    const averageFatigueScore = dailyFatigueResults.length
      ? this.round(dailyFatigueResults.reduce((sum, day) => sum + day.fatigueScore, 0) / dailyFatigueResults.length)
      : 0;
    const averageBalanceScore = dailyFatigueResults.length
      ? this.round(dailyFatigueResults.reduce((sum, day) => sum + day.balanceScore, 0) / dailyFatigueResults.length)
      : 0;

    return {
      dailyFatigueResults,
      itineraryMetrics,
      averageFatigueScore,
      averageBalanceScore,
      overloadedDaysCount: dailyFatigueResults.filter((day) => day.fatigueScore > context.configuration.maxDailyFatigueScore).length,
      criticalDaysCount: dailyFatigueResults.filter((day) => day.fatigueLevel === FatigueLevel.CRITICAL).length,
      highFatigueDaysCount: dailyFatigueResults.filter((day) => day.fatigueLevel === FatigueLevel.HIGH).length,
    };
  }

  private calculateDayMetric(
    dayId: number,
    dayNumber: number,
    items: ItineraryItem[],
    minBufferMinutes: number,
  ): DayItineraryMetric {
    const activityItems = items.filter((item) => item.type === ItineraryItemType.ACTIVITY);
    const transferMinutes = this.sumDuration(items, ItineraryItemType.TRANSFER);
    const flightMinutes = this.sumDuration(items, ItineraryItemType.FLIGHT);
    const freeTimeMinutes = this.sumDuration(items, ItineraryItemType.FREE_TIME);
    const mealMinutes = this.sumDuration(items, ItineraryItemType.MEAL);
    const dayDurationMinutes = this.calculateDayDurationMinutes(items);
    const shortBufferCount = this.calculateShortBufferCount(items, minBufferMinutes);
    const restMinutes = freeTimeMinutes + mealMinutes;

    return {
      dayId,
      dayNumber,
      activityCount: activityItems.length,
      majorActivityCount: activityItems.filter((item) => item.isMajorActivity).length,
      transferMinutes,
      flightMinutes,
      freeTimeMinutes,
      mealMinutes,
      dayDurationMinutes,
      shortBufferCount,
      activityDensity: dayDurationMinutes > 0 ? this.round((activityItems.length / dayDurationMinutes) * 60) : 0,
      transferSharePercent: dayDurationMinutes > 0 ? this.round(((transferMinutes + flightMinutes) / dayDurationMinutes) * 100) : 0,
      restRatioPercent: dayDurationMinutes > 0 ? this.round((restMinutes / dayDurationMinutes) * 100) : 0,
      hasMealBreak: mealMinutes >= 30 || items.some((item) => item.type === ItineraryItemType.MEAL),
      startsEarly: this.getFirstStartMinute(items) !== null && (this.getFirstStartMinute(items) ?? 0) < 8 * 60,
      finishesLate: this.getLastEndMinute(items) !== null && (this.getLastEndMinute(items) ?? 0) > 21 * 60,
    };
  }

  private calculateDailyFatigueMetric(dayMetric: DayItineraryMetric, items: ItineraryItem[]): DailyFatigueMetric {
    const activityLoad = Math.min(35, dayMetric.activityCount * 7 + dayMetric.majorActivityCount * 5);
    const transferLoad = Math.min(30, (dayMetric.transferMinutes + dayMetric.flightMinutes) / 15);
    const intensityLoad = Math.min(25, this.calculateIntensityPoints(items));

    const longDayPenalty = Math.max(0, (dayMetric.dayDurationMinutes - 10 * 60) / 30) * 4;
    const shortBufferPenalty = dayMetric.shortBufferCount * 5;
    const noMealPenalty = dayMetric.hasMealBreak ? 0 : 8;
    const lateEarlyPenalty = (dayMetric.startsEarly ? 4 : 0) + (dayMetric.finishesLate ? 4 : 0);
    const compressionPenalty = Math.min(30, longDayPenalty + shortBufferPenalty + noMealPenalty + lateEarlyPenalty);

    const restCredit = Math.min(20, dayMetric.freeTimeMinutes / 30 + dayMetric.mealMinutes / 60);
    const fatigueScore = this.clamp(Math.round(activityLoad + transferLoad + intensityLoad + compressionPenalty - restCredit), 0, 100);
    const balanceScore = this.clamp(100 - fatigueScore, 0, 100);
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

  private calculateIntensityPoints(items: ItineraryItem[]): number {
    return items.reduce((sum, item) => {
      if (item.type !== ItineraryItemType.ACTIVITY) {
        return sum;
      }

      if (item.intensity === ItineraryIntensity.HIGH) {
        return sum + 8;
      }

      if (item.intensity === ItineraryIntensity.MEDIUM) {
        return sum + 5;
      }

      return sum + 2;
    }, 0);
  }

  private buildReasons(dayMetric: DayItineraryMetric, fatigueScore: number): string[] {
    const reasons: string[] = [];

    if (dayMetric.activityCount >= 5) {
      reasons.push('High number of activities planned for one day.');
    }

    if (dayMetric.transferMinutes + dayMetric.flightMinutes > 180) {
      reasons.push('Transfer and flight time is high for one day.');
    }

    if (dayMetric.shortBufferCount > 0) {
      reasons.push('Some itinerary items have short buffers between them.');
    }

    if (dayMetric.dayDurationMinutes > 10 * 60) {
      reasons.push('The planned day is longer than 10 hours.');
    }

    if (!dayMetric.hasMealBreak) {
      reasons.push('No clear meal break is planned.');
    }

    if (dayMetric.freeTimeMinutes < 60 && dayMetric.activityCount >= 3) {
      reasons.push('Limited free time for recovery.');
    }

    if (!reasons.length && fatigueScore <= 40) {
      reasons.push('The day has a balanced activity and rest structure.');
    }

    return reasons;
  }

  private sumDuration(items: ItineraryItem[], type: ItineraryItemType): number {
    return items
      .filter((item) => item.type === type)
      .reduce((sum, item) => sum + (item.durationMinutes ?? this.calculateItemDurationFromTime(item)), 0);
  }

  private calculateDayDurationMinutes(items: ItineraryItem[]): number {
    const startMinutes = items.map((item) => this.parseTimeToMinutes(item.startTime)).filter((value): value is number => value !== null);
    const endMinutes = items.map((item) => this.parseTimeToMinutes(item.endTime)).filter((value): value is number => value !== null);

    if (startMinutes.length && endMinutes.length) {
      return Math.max(...endMinutes) - Math.min(...startMinutes);
    }

    return items.reduce((sum, item) => sum + (item.durationMinutes ?? 0), 0);
  }

  private calculateShortBufferCount(items: ItineraryItem[], minBufferMinutes: number): number {
    const timedItems = items
      .map((item) => ({
        start: this.parseTimeToMinutes(item.startTime),
        end: this.parseTimeToMinutes(item.endTime),
      }))
      .filter((item): item is { start: number; end: number } => item.start !== null && item.end !== null)
      .sort((a, b) => a.start - b.start);

    let shortBuffers = 0;

    for (let index = 1; index < timedItems.length; index += 1) {
      const buffer = timedItems[index].start - timedItems[index - 1].end;

      if (buffer >= 0 && buffer < minBufferMinutes) {
        shortBuffers += 1;
      }
    }

    return shortBuffers;
  }

  private calculateItemDurationFromTime(item: ItineraryItem): number {
    const start = this.parseTimeToMinutes(item.startTime);
    const end = this.parseTimeToMinutes(item.endTime);

    if (start === null || end === null || end < start) {
      return 0;
    }

    return end - start;
  }

  private getFirstStartMinute(items: ItineraryItem[]): number | null {
    const starts = items.map((item) => this.parseTimeToMinutes(item.startTime)).filter((value): value is number => value !== null);
    return starts.length ? Math.min(...starts) : null;
  }

  private getLastEndMinute(items: ItineraryItem[]): number | null {
    const ends = items.map((item) => this.parseTimeToMinutes(item.endTime)).filter((value): value is number => value !== null);
    return ends.length ? Math.max(...ends) : null;
  }

  private parseTimeToMinutes(time?: string | null): number | null {
    if (!time) {
      return null;
    }

    const [hours, minutes] = time.split(':').map((part) => Number(part));

    if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
      return null;
    }

    return hours * 60 + minutes;
  }

  private resolveFatigueLevel(fatigueScore: number): FatigueLevel {
    if (fatigueScore >= 85) {
      return FatigueLevel.CRITICAL;
    }

    if (fatigueScore >= 70) {
      return FatigueLevel.HIGH;
    }

    if (fatigueScore >= 45) {
      return FatigueLevel.MODERATE;
    }

    return FatigueLevel.LOW;
  }

  private clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  }

  private round(value: number): number {
    return Math.round(value * 100) / 100;
  }
}
