import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ItineraryController } from './itinerary.controller';
import { ItineraryItemsController } from './itinerary-items.controller';
import { ItineraryService } from './itinerary.service';
import { ItineraryItemsService } from './itinerary-items.service';
import { ItineraryItem } from './entities/itinerary-item.entity';
import { TourDay } from './entities/tour-day.entity';
import { TourPackage } from '../tour-packages/entities/tour-package.entity';

@Module({
  imports: [TypeOrmModule.forFeature([TourDay, ItineraryItem, TourPackage])],
  controllers: [ItineraryController, ItineraryItemsController],
  providers: [ItineraryService, ItineraryItemsService],
  exports: [TypeOrmModule, ItineraryService, ItineraryItemsService],
})
export class ItineraryModule {}
