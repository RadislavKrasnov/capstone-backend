import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { dataSourceOptions } from './database/data-source';
import { AgenciesModule } from './agencies/agencies.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { CommonModule } from './common/common.module';
import { CostsModule } from './costs/costs.module';
import { ItineraryModule } from './itinerary/itinerary.module';
import { PackageAnalysisModule } from './package-analysis/package-analysis.module';
import { TourPackagesModule } from './tour-packages/tour-packages.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRoot(dataSourceOptions),
    AgenciesModule,
    UsersModule,
    AuthModule,
    CommonModule,
    CostsModule,
    ItineraryModule,
    PackageAnalysisModule,
    TourPackagesModule,
  ],
})
export class AppModule {}
