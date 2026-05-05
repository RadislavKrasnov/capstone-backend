import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Agency } from '../agencies/entities/agency.entity';
import { TourPackage } from './entities/tour-package.entity';
import { TourPackagesController } from './tour-packages.controller';
import { TourPackagesService } from './tour-packages.service';

@Module({
  imports: [TypeOrmModule.forFeature([TourPackage, Agency])],
  controllers: [TourPackagesController],
  providers: [TourPackagesService],
  exports: [TypeOrmModule, TourPackagesService],
})
export class TourPackagesModule {}
