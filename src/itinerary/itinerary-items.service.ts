import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { TourDay } from './entities/tour-day.entity';
import { ItineraryItem } from './entities/itinerary-item.entity';
import { CreateItineraryItemDto } from './dto/create-itinerary-item.dto';
import { FindItineraryItemsQueryDto } from './dto/find-itinerary-items-query.dto';
import { UpdateItineraryItemDto } from './dto/update-itinerary-item.dto';

@Injectable()
export class ItineraryItemsService {
  constructor(
    @InjectRepository(ItineraryItem)
    private readonly itineraryItemsRepository: Repository<ItineraryItem>,

    @InjectRepository(TourDay)
    private readonly tourDaysRepository: Repository<TourDay>,
  ) {}

  async findAll(query: FindItineraryItemsQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    const [items, totalItems] = await this.itineraryItemsRepository.findAndCount({
      where: {
        ...(query.dayId ? { dayId: query.dayId } : {}),
        ...(query.type ? { type: query.type } : {}),
      },
      relations: {
        day: true,
      },
      order: {
        dayId: 'ASC',
        itemOrder: 'ASC',
      },
      skip,
      take: limit,
    });

    const totalPages = Math.ceil(totalItems / limit);

    return {
      data: items.map((item) => this.buildSafeItineraryItem(item)),
      meta: {
        page,
        limit,
        totalItems,
        totalPages,
      },
    };
  }

  async findOne(uuid: string) {
    const item = await this.findItineraryItemEntityOrFail(uuid, true);

    return this.buildSafeItineraryItem(item);
  }

  async create(dto: CreateItineraryItemDto) {
    await this.findTourDayEntityOrFail(dto.dayId);
    await this.ensureItemOrderIsAvailable(dto.dayId, dto.itemOrder);
    this.validateTimeRange(dto.startTime, dto.endTime);

    const item = this.itineraryItemsRepository.create({
      dayId: dto.dayId,
      itemOrder: dto.itemOrder,
      type: dto.type,
      title: this.normalizeText(dto.title),
      description: dto.description ?? null,
      startTime: dto.startTime ?? null,
      endTime: dto.endTime ?? null,
      durationMinutes: dto.durationMinutes ?? null,
      locationName: this.normalizeNullableText(dto.locationName),
      startLocation: this.normalizeNullableText(dto.startLocation),
      endLocation: this.normalizeNullableText(dto.endLocation),
      intensity: dto.intensity ?? null,
      isMajorActivity: dto.isMajorActivity ?? false,
    });

    const savedItem = await this.itineraryItemsRepository.save(item);

    return this.buildSafeItineraryItem(savedItem);
  }

  async update(uuid: string, dto: UpdateItineraryItemDto) {
    const item = await this.findItineraryItemEntityOrFail(uuid);

    const updatePayload: Partial<ItineraryItem> = {};

    const dayId = dto.dayId ?? item.dayId;
    const itemOrder = dto.itemOrder ?? item.itemOrder;

    if (dto.dayId !== undefined) {
      await this.findTourDayEntityOrFail(dto.dayId);
      updatePayload.dayId = dto.dayId;
    }

    if (dto.dayId !== undefined || dto.itemOrder !== undefined) {
      await this.ensureItemOrderIsAvailable(dayId, itemOrder, item.id);
    }

    const startTime = dto.startTime !== undefined ? dto.startTime : item.startTime;
    const endTime = dto.endTime !== undefined ? dto.endTime : item.endTime;
    this.validateTimeRange(startTime, endTime);

    if (dto.itemOrder !== undefined) {
      updatePayload.itemOrder = dto.itemOrder;
    }

    if (dto.type !== undefined) {
      updatePayload.type = dto.type;
    }

    if (dto.title !== undefined) {
      updatePayload.title = this.normalizeText(dto.title);
    }

    if (dto.description !== undefined) {
      updatePayload.description = dto.description;
    }

    if (dto.startTime !== undefined) {
      updatePayload.startTime = dto.startTime;
    }

    if (dto.endTime !== undefined) {
      updatePayload.endTime = dto.endTime;
    }

    if (dto.durationMinutes !== undefined) {
      updatePayload.durationMinutes = dto.durationMinutes;
    }

    if (dto.locationName !== undefined) {
      updatePayload.locationName = this.normalizeNullableText(dto.locationName);
    }

    if (dto.startLocation !== undefined) {
      updatePayload.startLocation = this.normalizeNullableText(dto.startLocation);
    }

    if (dto.endLocation !== undefined) {
      updatePayload.endLocation = this.normalizeNullableText(dto.endLocation);
    }

    if (dto.intensity !== undefined) {
      updatePayload.intensity = dto.intensity;
    }

    if (dto.isMajorActivity !== undefined) {
      updatePayload.isMajorActivity = dto.isMajorActivity;
    }

    const updatedItem = this.itineraryItemsRepository.merge(item, updatePayload);
    const savedItem = await this.itineraryItemsRepository.save(updatedItem);

    return this.buildSafeItineraryItem(savedItem);
  }

  async remove(uuid: string) {
    const item = await this.findItineraryItemEntityOrFail(uuid);

    await this.itineraryItemsRepository.remove(item);

    return {
      message: 'Itinerary item was deleted successfully',
    };
  }

  private async findItineraryItemEntityOrFail(
    uuid: string,
    withRelations = false,
  ): Promise<ItineraryItem> {
    try {
      return await this.itineraryItemsRepository.findOneOrFail({
        where: { uuid },
        relations: withRelations
          ? {
              day: true,
            }
          : undefined,
      });
    } catch {
      throw new NotFoundException('Itinerary item was not found');
    }
  }

  private async findTourDayEntityOrFail(id: number): Promise<TourDay> {
    try {
      return await this.tourDaysRepository.findOneOrFail({
        where: { id },
      });
    } catch {
      throw new NotFoundException('Tour day was not found');
    }
  }

  private async ensureItemOrderIsAvailable(
    dayId: number,
    itemOrder: number,
    ignoredItemId?: number,
  ) {
    const existingItem = await this.itineraryItemsRepository.findOne({
      where: {
        dayId,
        itemOrder,
      },
      select: {
        id: true,
      },
    });

    if (!existingItem) {
      return;
    }

    if (ignoredItemId && existingItem.id === ignoredItemId) {
      return;
    }

    throw new ConflictException('Itinerary item with this order already exists in this tour day');
  }

  private validateTimeRange(startTime?: string | null, endTime?: string | null) {
    if (!startTime || !endTime) {
      return;
    }

    if (this.parseTimeToMinutes(endTime) <= this.parseTimeToMinutes(startTime)) {
      throw new BadRequestException('End time must be later than start time');
    }
  }

  private parseTimeToMinutes(value: string): number {
    const [hours, minutes] = value.split(':').map(Number);

    return hours * 60 + minutes;
  }

  private normalizeText(value: string) {
    return value.trim();
  }

  private normalizeNullableText(value?: string | null) {
    if (value === undefined || value === null) {
      return value ?? null;
    }

    const normalizedValue = value.trim();

    return normalizedValue.length ? normalizedValue : null;
  }

  private buildSafeItineraryItem(item: ItineraryItem) {
    return {
      id: item.id,
      uuid: item.uuid,
      dayId: item.dayId,
      day: item.day
        ? {
            id: item.day.id,
            uuid: item.day.uuid,
            dayNumber: item.day.dayNumber,
            title: item.day.title,
            isRestDay: item.day.isRestDay,
          }
        : undefined,
      itemOrder: item.itemOrder,
      type: item.type,
      title: item.title,
      description: item.description,
      startTime: item.startTime,
      endTime: item.endTime,
      durationMinutes: item.durationMinutes,
      locationName: item.locationName,
      startLocation: item.startLocation,
      endLocation: item.endLocation,
      intensity: item.intensity,
      isMajorActivity: item.isMajorActivity,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    };
  }
}
