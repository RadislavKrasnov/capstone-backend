import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Agency } from '../agencies/entities/agency.entity';
import { ItineraryItem } from '../itinerary/entities/itinerary-item.entity';
import { TourDay } from '../itinerary/entities/tour-day.entity';
import { TourPackage } from '../tour-packages/entities/tour-package.entity';
import { CostItemsController } from './cost-items.controller';
import { CostItemsService } from './cost-items.service';
import { CostItem } from './entities/cost-item.entity';
import { Supplier } from './entities/supplier.entity';
import { SuppliersController } from './suppliers.controller';
import { SuppliersService } from './suppliers.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([CostItem, Supplier, Agency, TourPackage, TourDay, ItineraryItem]),
  ],
  controllers: [CostItemsController, SuppliersController],
  providers: [CostItemsService, SuppliersService],
  exports: [TypeOrmModule, CostItemsService, SuppliersService],
})
export class CostsModule {}
