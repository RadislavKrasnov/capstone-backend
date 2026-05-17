import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { ItineraryItem } from '../itinerary/entities/itinerary-item.entity';
import { TourDay } from '../itinerary/entities/tour-day.entity';
import { TourPackage } from '../tour-packages/entities/tour-package.entity';
import { CostItem } from './entities/cost-item.entity';
import { Supplier } from './entities/supplier.entity';
import { CreateCostItemDto } from './dto/create-cost-item.dto';
import { FindCostItemsQueryDto } from './dto/find-cost-items-query.dto';
import { UpdateCostItemDto } from './dto/update-cost-item.dto';

@Injectable()
export class CostItemsService {
  constructor(
    @InjectRepository(CostItem)
    private readonly costItemsRepository: Repository<CostItem>,

    @InjectRepository(TourPackage)
    private readonly tourPackagesRepository: Repository<TourPackage>,

    @InjectRepository(Supplier)
    private readonly suppliersRepository: Repository<Supplier>,

    @InjectRepository(TourDay)
    private readonly tourDaysRepository: Repository<TourDay>,

    @InjectRepository(ItineraryItem)
    private readonly itineraryItemsRepository: Repository<ItineraryItem>,
  ) {}

  async findAll(query: FindCostItemsQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    const [costItems, totalItems] = await this.costItemsRepository.findAndCount({
      where: {
        ...(query.packageId ? { packageId: query.packageId } : {}),
        ...(query.supplierId ? { supplierId: query.supplierId } : {}),
        ...(query.dayId ? { dayId: query.dayId } : {}),
        ...(query.category ? { category: query.category } : {}),
        ...(query.costType ? { costType: query.costType } : {}),
      },
      relations: {
        package: true,
        supplier: true,
        day: true,
        itineraryItem: true,
      },
      order: {
        packageId: 'ASC',
        category: 'ASC',
        name: 'ASC',
      },
      skip,
      take: limit,
    });

    return {
      data: costItems.map((costItem) => this.buildSafeCostItem(costItem)),
      meta: {
        page,
        limit,
        totalItems,
        totalPages: Math.ceil(totalItems / limit),
      },
    };
  }

  async findOne(uuid: string) {
    const costItem = await this.findCostItemEntityOrFail(uuid, true);

    return this.buildSafeCostItem(costItem);
  }

  async create(dto: CreateCostItemDto) {
    await this.findTourPackageEntityOrFail(dto.packageId);

    if (dto.supplierId !== undefined && dto.supplierId !== null) {
      await this.findSupplierEntityOrFail(dto.supplierId);
    }

    if (dto.dayId !== undefined && dto.dayId !== null) {
      await this.validateDayBelongsToPackage(dto.dayId, dto.packageId);
    }

    if (dto.itineraryItemId !== undefined && dto.itineraryItemId !== null) {
      await this.validateItineraryItemBelongsToPackage(
        dto.itineraryItemId,
        dto.packageId,
        dto.dayId,
      );
    }

    const costItem = this.costItemsRepository.create({
      packageId: dto.packageId,
      supplierId: dto.supplierId ?? null,
      dayId: dto.dayId ?? null,
      itineraryItemId: dto.itineraryItemId ?? null,
      category: dto.category,
      name: this.normalizeText(dto.name),
      description: dto.description ?? null,
      costType: dto.costType,
      quantity: this.toNumericString(dto.quantity ?? 1),
      unitCost: this.toNumericString(dto.unitCost),
      currencyCode: dto.currencyCode ?? 'EUR',
      isRequired: dto.isRequired ?? true,
    });

    const savedCostItem = await this.costItemsRepository.save(costItem);

    return this.buildSafeCostItem(savedCostItem);
  }

  async update(uuid: string, dto: UpdateCostItemDto) {
    const costItem = await this.findCostItemEntityOrFail(uuid);

    const packageId = dto.packageId ?? costItem.packageId;
    const dayId = dto.dayId !== undefined ? dto.dayId : costItem.dayId;
    const itineraryItemId =
      dto.itineraryItemId !== undefined ? dto.itineraryItemId : costItem.itineraryItemId;

    if (dto.packageId !== undefined) {
      await this.findTourPackageEntityOrFail(dto.packageId);
    }

    if (dto.supplierId !== undefined && dto.supplierId !== null) {
      await this.findSupplierEntityOrFail(dto.supplierId);
    }

    if (dayId !== undefined && dayId !== null) {
      await this.validateDayBelongsToPackage(dayId, packageId);
    }

    if (itineraryItemId !== undefined && itineraryItemId !== null) {
      await this.validateItineraryItemBelongsToPackage(itineraryItemId, packageId, dayId);
    }

    const updatePayload: Partial<CostItem> = {};

    if (dto.packageId !== undefined) {
      updatePayload.packageId = dto.packageId;
    }

    if (dto.supplierId !== undefined) {
      updatePayload.supplierId = dto.supplierId;
    }

    if (dto.dayId !== undefined) {
      updatePayload.dayId = dto.dayId;
    }

    if (dto.itineraryItemId !== undefined) {
      updatePayload.itineraryItemId = dto.itineraryItemId;
    }

    if (dto.category !== undefined) {
      updatePayload.category = dto.category;
    }

    if (dto.name !== undefined) {
      updatePayload.name = this.normalizeText(dto.name);
    }

    if (dto.description !== undefined) {
      updatePayload.description = dto.description;
    }

    if (dto.costType !== undefined) {
      updatePayload.costType = dto.costType;
    }

    if (dto.quantity !== undefined) {
      updatePayload.quantity = this.toNumericString(dto.quantity);
    }

    if (dto.unitCost !== undefined) {
      updatePayload.unitCost = this.toNumericString(dto.unitCost);
    }

    if (dto.currencyCode !== undefined) {
      updatePayload.currencyCode = dto.currencyCode;
    }

    if (dto.isRequired !== undefined) {
      updatePayload.isRequired = dto.isRequired;
    }

    const updatedCostItem = this.costItemsRepository.merge(costItem, updatePayload);
    const savedCostItem = await this.costItemsRepository.save(updatedCostItem);

    return this.buildSafeCostItem(savedCostItem);
  }

  async remove(uuid: string) {
    const costItem = await this.findCostItemEntityOrFail(uuid);

    await this.costItemsRepository.remove(costItem);

    return {
      message: 'Cost item was deleted successfully',
    };
  }

  private async findCostItemEntityOrFail(uuid: string, withRelations = false): Promise<CostItem> {
    try {
      return await this.costItemsRepository.findOneOrFail({
        where: { uuid },
        relations: withRelations
          ? {
              package: true,
              supplier: true,
              day: true,
              itineraryItem: true,
            }
          : undefined,
      });
    } catch {
      throw new NotFoundException('Cost item was not found');
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

  private async findSupplierEntityOrFail(id: number): Promise<Supplier> {
    try {
      return await this.suppliersRepository.findOneOrFail({
        where: { id },
      });
    } catch {
      throw new NotFoundException('Supplier was not found');
    }
  }

  private async validateDayBelongsToPackage(dayId: number, packageId: number) {
    const day = await this.tourDaysRepository.findOne({
      where: { id: dayId },
      select: {
        id: true,
        packageId: true,
      },
    });

    if (!day) {
      throw new NotFoundException('Tour day was not found');
    }

    if (day.packageId !== packageId) {
      throw new BadRequestException('Tour day does not belong to the selected tour package');
    }
  }

  private async validateItineraryItemBelongsToPackage(
    itineraryItemId: number,
    packageId: number,
    dayId?: number | null,
  ) {
    const itineraryItem = await this.itineraryItemsRepository.findOne({
      where: { id: itineraryItemId },
      relations: {
        day: true,
      },
    });

    if (!itineraryItem) {
      throw new NotFoundException('Itinerary item was not found');
    }

    if (!itineraryItem.day || itineraryItem.day.packageId !== packageId) {
      throw new BadRequestException('Itinerary item does not belong to the selected tour package');
    }

    if (dayId !== undefined && dayId !== null && itineraryItem.dayId !== dayId) {
      throw new BadRequestException('Itinerary item does not belong to the selected tour day');
    }
  }

  private normalizeText(value: string) {
    return value.trim();
  }

  private toNumericString(value: number) {
    return value.toFixed(2);
  }

  private buildSafeCostItem(costItem: CostItem) {
    return {
      id: costItem.id,
      uuid: costItem.uuid,
      packageId: costItem.packageId,
      package: costItem.package
        ? {
            id: costItem.package.id,
            uuid: costItem.package.uuid,
            title: costItem.package.title,
            slug: costItem.package.slug,
          }
        : undefined,
      supplierId: costItem.supplierId,
      supplier: costItem.supplier
        ? {
            id: costItem.supplier.id,
            uuid: costItem.supplier.uuid,
            name: costItem.supplier.name,
            type: costItem.supplier.type,
          }
        : undefined,
      dayId: costItem.dayId,
      day: costItem.day
        ? {
            id: costItem.day.id,
            uuid: costItem.day.uuid,
            dayNumber: costItem.day.dayNumber,
            title: costItem.day.title,
          }
        : undefined,
      itineraryItemId: costItem.itineraryItemId,
      itineraryItem: costItem.itineraryItem
        ? {
            id: costItem.itineraryItem.id,
            uuid: costItem.itineraryItem.uuid,
            itemOrder: costItem.itineraryItem.itemOrder,
            type: costItem.itineraryItem.type,
            title: costItem.itineraryItem.title,
          }
        : undefined,
      category: costItem.category,
      name: costItem.name,
      description: costItem.description,
      costType: costItem.costType,
      quantity: costItem.quantity,
      unitCost: costItem.unitCost,
      currencyCode: costItem.currencyCode,
      isRequired: costItem.isRequired,
      createdAt: costItem.createdAt,
      updatedAt: costItem.updatedAt,
    };
  }
}
