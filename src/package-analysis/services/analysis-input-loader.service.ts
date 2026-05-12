import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { CostItem } from '../../costs/entities/cost-item.entity';
import { Supplier } from '../../costs/entities/supplier.entity';
import { ItineraryItem } from '../../itinerary/entities/itinerary-item.entity';
import { TourDay } from '../../itinerary/entities/tour-day.entity';
import { TourPackage } from '../../tour-packages/entities/tour-package.entity';
import { AnalysisInput } from '../types/analysis-context.type';

@Injectable()
export class AnalysisInputLoaderService {
  constructor(
    @InjectRepository(TourPackage)
    private readonly tourPackagesRepository: Repository<TourPackage>,

    @InjectRepository(TourDay)
    private readonly tourDaysRepository: Repository<TourDay>,

    @InjectRepository(ItineraryItem)
    private readonly itineraryItemsRepository: Repository<ItineraryItem>,

    @InjectRepository(CostItem)
    private readonly costItemsRepository: Repository<CostItem>,

    @InjectRepository(Supplier)
    private readonly suppliersRepository: Repository<Supplier>,
  ) {}

  async loadPackageAnalysisInput(packageUuid: string): Promise<AnalysisInput> {
    const tourPackage = await this.tourPackagesRepository.findOne({
      where: { uuid: packageUuid },
      relations: { agency: true },
    });

    if (!tourPackage) {
      throw new NotFoundException('Tour package was not found');
    }

    const days = await this.tourDaysRepository.find({
      where: { packageId: tourPackage.id },
      order: { dayNumber: 'ASC' },
    });

    const dayIds = days.map((day) => day.id);

    const itineraryItems = dayIds.length
      ? await this.itineraryItemsRepository
          .createQueryBuilder('item')
          .where('item.day_id IN (:...dayIds)', { dayIds })
          .orderBy('item.day_id', 'ASC')
          .addOrderBy('item.item_order', 'ASC')
          .getMany()
      : [];

    const costItems = await this.costItemsRepository.find({
      where: { packageId: tourPackage.id, isRequired: true },
      relations: { supplier: true, day: true, itineraryItem: true },
      order: { createdAt: 'ASC' },
    });

    const suppliers = await this.suppliersRepository.find({
      where: { agencyId: tourPackage.agencyId },
      order: { name: 'ASC' },
    });

    return {
      package: tourPackage,
      days,
      itineraryItems,
      costItems,
      suppliers,
    };
  }
}
