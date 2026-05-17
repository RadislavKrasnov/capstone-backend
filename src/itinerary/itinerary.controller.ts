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
import { CreateTourDayDto } from './dto/create-tour-day.dto';
import { FindTourDaysQueryDto } from './dto/find-tour-days-query.dto';
import { UpdateTourDayDto } from './dto/update-tour-day.dto';
import { ItineraryService } from './itinerary.service';

@UseGuards(JwtAuthGuard)
@Controller('tour-days')
export class ItineraryController {
  constructor(private readonly itineraryService: ItineraryService) {}

  @Get()
  findAll(@Query() query: FindTourDaysQueryDto) {
    return this.itineraryService.findAll(query);
  }

  @Get(':uuid')
  findOne(@Param('uuid', ParseUUIDPipe) uuid: string) {
    return this.itineraryService.findOne(uuid);
  }

  @Post()
  create(@Body() dto: CreateTourDayDto) {
    return this.itineraryService.create(dto);
  }

  @Patch(':uuid')
  update(@Param('uuid', ParseUUIDPipe) uuid: string, @Body() dto: UpdateTourDayDto) {
    return this.itineraryService.update(uuid, dto);
  }

  @Delete(':uuid')
  remove(@Param('uuid', ParseUUIDPipe) uuid: string) {
    return this.itineraryService.remove(uuid);
  }
}
