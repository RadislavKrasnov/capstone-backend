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
import { AgenciesService } from './agencies.service';
import { CreateAgencyDto } from './dto/create-agency.dto';
import { FindAgenciesQueryDto } from './dto/find-agencies-query.dto';
import { UpdateAgencyDto } from './dto/update-agency.dto';

@UseGuards(JwtAuthGuard)
@Controller('agencies')
export class AgenciesController {
  constructor(private readonly agenciesService: AgenciesService) {}

  @Get()
  findAll(@Query() query: FindAgenciesQueryDto) {
    return this.agenciesService.findAll(query);
  }

  @Get(':uuid')
  findOne(@Param('uuid', ParseUUIDPipe) uuid: string) {
    return this.agenciesService.findOne(uuid);
  }

  @Post()
  create(@Body() dto: CreateAgencyDto) {
    return this.agenciesService.create(dto);
  }

  @Patch(':uuid')
  update(@Param('uuid', ParseUUIDPipe) uuid: string, @Body() dto: UpdateAgencyDto) {
    return this.agenciesService.update(uuid, dto);
  }

  @Delete(':uuid')
  remove(@Param('uuid', ParseUUIDPipe) uuid: string) {
    return this.agenciesService.remove(uuid);
  }
}
