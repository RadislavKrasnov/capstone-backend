import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Agency } from '../agencies/entities/agency.entity';
import { PackageExclusion } from './entities/package-exclusion.entity';
import { PackageHighlight } from './entities/package-highlight.entity';
import { PackageInclusion } from './entities/package-inclusion.entity';
import { TourPackage } from './entities/tour-package.entity';
import { PackageExclusionsController } from './package-exclusions.controller';
import { PackageExclusionsService } from './package-exclusions.service';
import { PackageHighlightsController } from './package-highlights.controller';
import { PackageHighlightsService } from './package-highlights.service';
import { PackageInclusionsController } from './package-inclusions.controller';
import { PackageInclusionsService } from './package-inclusions.service';
import { TourPackagesController } from './tour-packages.controller';
import { TourPackagesService } from './tour-packages.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TourPackage,
      Agency,
      PackageHighlight,
      PackageInclusion,
      PackageExclusion,
    ]),
  ],
  controllers: [
    TourPackagesController,
    PackageHighlightsController,
    PackageInclusionsController,
    PackageExclusionsController,
  ],
  providers: [
    TourPackagesService,
    PackageHighlightsService,
    PackageInclusionsService,
    PackageExclusionsService,
  ],
  exports: [
    TypeOrmModule,
    TourPackagesService,
    PackageHighlightsService,
    PackageInclusionsService,
    PackageExclusionsService,
  ],
})
export class TourPackagesModule {}
