import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AnalysisConfigurationsService } from './analysis-configurations.service';
import { CreateAnalysisConfigurationDto } from './dto/create-analysis-configuration.dto';
import { FindAnalysisConfigurationsQueryDto } from './dto/find-analysis-configurations-query.dto';
import { UpdateAnalysisConfigurationDto } from './dto/update-analysis-configuration.dto';

@UseGuards(JwtAuthGuard)
@Controller('analysis-configurations')
export class AnalysisConfigurationsController {
  constructor(private readonly analysisConfigurationsService: AnalysisConfigurationsService) {}

  @Get()
  findAll(@Query() query: FindAnalysisConfigurationsQueryDto) {
    return this.analysisConfigurationsService.findAll(query);
  }

  @Get(':uuid')
  findOne(@Param('uuid', ParseUUIDPipe) uuid: string) {
    return this.analysisConfigurationsService.findOne(uuid);
  }

  @Post()
  create(@Body() dto: CreateAnalysisConfigurationDto) {
    return this.analysisConfigurationsService.create(dto);
  }

  @Patch(':uuid')
  update(@Param('uuid', ParseUUIDPipe) uuid: string, @Body() dto: UpdateAnalysisConfigurationDto) {
    return this.analysisConfigurationsService.update(uuid, dto);
  }

  @Delete(':uuid')
  remove(@Param('uuid', ParseUUIDPipe) uuid: string) {
    return this.analysisConfigurationsService.remove(uuid);
  }
}
