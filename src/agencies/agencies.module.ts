import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AgenciesController } from './agencies.controller';
import { AgenciesService } from './agencies.service';
import { Agency } from './entities/agency.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Agency])],
  controllers: [AgenciesController],
  providers: [AgenciesService],
  exports: [TypeOrmModule, AgenciesService],
})
export class AgenciesModule {}
