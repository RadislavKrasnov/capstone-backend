import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { TourPackage } from '../tour-packages/entities/tour-package.entity';
import { CreateTourDayDto } from './dto/create-tour-day.dto';
import { FindTourDaysQueryDto } from './dto/find-tour-days-query.dto';
import { UpdateTourDayDto } from './dto/update-tour-day.dto';
import { TourDay } from './entities/tour-day.entity';

@Injectable()
export class ItineraryService {
  constructor(
    @InjectRepository(TourDay)
    private readonly tourDaysRepository: Repository<TourDay>,

    @InjectRepository(TourPackage)
    private readonly tourPackagesRepository: Repository<TourPackage>,
  ) {}

  async findAll(query: FindTourDaysQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    const [tourDays, totalItems] = await this.tourDaysRepository.findAndCount({
      where: query.packageId
        ? {
            packageId: query.packageId,
          }
        : undefined,
      relations: {
        package: true,
      },
      order: {
        packageId: 'ASC',
        dayNumber: 'ASC',
      },
      skip,
      take: limit,
    });

    const totalPages = Math.ceil(totalItems / limit);

    return {
      data: tourDays.map((tourDay) => this.buildSafeTourDay(tourDay)),
      meta: {
        page,
        limit,
        totalItems,
        totalPages,
      },
    };
  }

  async findOne(uuid: string) {
    const tourDay = await this.findTourDayEntityOrFail(uuid, true);

    return this.buildSafeTourDay(tourDay);
  }

  async create(dto: CreateTourDayDto) {
    await this.findTourPackageEntityOrFail(dto.packageId);

    await this.ensureTourDayNumberIsAvailable(dto.packageId, dto.dayNumber);

    const tourDay = this.tourDaysRepository.create({
      packageId: dto.packageId,
      dayNumber: dto.dayNumber,
      title: this.normalizeText(dto.title),
      description: dto.description ?? null,
      isRestDay: dto.isRestDay ?? false,
    });

    const savedTourDay = await this.tourDaysRepository.save(tourDay);

    return this.buildSafeTourDay(savedTourDay);
  }

  async update(uuid: string, dto: UpdateTourDayDto) {
    const tourDay = await this.findTourDayEntityOrFail(uuid);

    const updatePayload: Partial<TourDay> = {};

    const packageId = dto.packageId ?? tourDay.packageId;
    const dayNumber = dto.dayNumber ?? tourDay.dayNumber;

    if (dto.packageId !== undefined) {
      await this.findTourPackageEntityOrFail(dto.packageId);
      updatePayload.packageId = dto.packageId;
    }

    if (dto.packageId !== undefined || dto.dayNumber !== undefined) {
      await this.ensureTourDayNumberIsAvailable(packageId, dayNumber, tourDay.id);
    }

    if (dto.dayNumber !== undefined) {
      updatePayload.dayNumber = dto.dayNumber;
    }

    if (dto.title !== undefined) {
      updatePayload.title = this.normalizeText(dto.title);
    }

    if (dto.description !== undefined) {
      updatePayload.description = dto.description;
    }

    if (dto.isRestDay !== undefined) {
      updatePayload.isRestDay = dto.isRestDay;
    }

    const updatedTourDay = this.tourDaysRepository.merge(tourDay, updatePayload);
    const savedTourDay = await this.tourDaysRepository.save(updatedTourDay);

    return this.buildSafeTourDay(savedTourDay);
  }

  async remove(uuid: string) {
    const tourDay = await this.findTourDayEntityOrFail(uuid);

    await this.tourDaysRepository.remove(tourDay);

    return {
      message: 'Tour day was deleted successfully',
    };
  }

  private async findTourDayEntityOrFail(uuid: string, withRelations = false): Promise<TourDay> {
    try {
      return await this.tourDaysRepository.findOneOrFail({
        where: { uuid },
        relations: withRelations
          ? {
              package: true,
            }
          : undefined,
      });
    } catch {
      throw new NotFoundException('Tour day was not found');
    }
  }

  private async findTourPackageEntityOrFail(id: number): Promise<TourPackage> {
    try {
      return await this.tourPackagesRepository.findOneOrFail({
        where: { id },
      });
    } catch {
      throw new NotFoundException('Tour package was not found');
    }
  }

  private async ensureTourDayNumberIsAvailable(
    packageId: number,
    dayNumber: number,
    ignoredTourDayId?: number,
  ) {
    const existingTourDay = await this.tourDaysRepository.findOne({
      where: {
        packageId,
        dayNumber,
      },
      select: {
        id: true,
      },
    });

    if (!existingTourDay) {
      return;
    }

    if (ignoredTourDayId && existingTourDay.id === ignoredTourDayId) {
      return;
    }

    throw new ConflictException('Tour day with this day number already exists in this package');
  }

  private normalizeText(value: string) {
    return value.trim();
  }

  private buildSafeTourDay(tourDay: TourDay) {
    return {
      id: tourDay.id,
      uuid: tourDay.uuid,
      packageId: tourDay.packageId,
      package: tourDay.package
        ? {
            id: tourDay.package.id,
            uuid: tourDay.package.uuid,
            title: tourDay.package.title,
            slug: tourDay.package.slug,
          }
        : undefined,
      dayNumber: tourDay.dayNumber,
      title: tourDay.title,
      description: tourDay.description,
      isRestDay: tourDay.isRestDay,
      createdAt: tourDay.createdAt,
      updatedAt: tourDay.updatedAt,
    };
  }
}
