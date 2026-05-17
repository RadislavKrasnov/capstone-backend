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
import { CreateItineraryItemDto } from './dto/create-itinerary-item.dto';
import { FindItineraryItemsQueryDto } from './dto/find-itinerary-items-query.dto';
import { UpdateItineraryItemDto } from './dto/update-itinerary-item.dto';
import { ItineraryItemsService } from './itinerary-items.service';

@UseGuards(JwtAuthGuard)
@Controller('itinerary-items')
export class ItineraryItemsController {
  constructor(private readonly itineraryItemsService: ItineraryItemsService) {}

  @Get()
  findAll(@Query() query: FindItineraryItemsQueryDto) {
    return this.itineraryItemsService.findAll(query);
  }

  @Get(':uuid')
  findOne(@Param('uuid', ParseUUIDPipe) uuid: string) {
    return this.itineraryItemsService.findOne(uuid);
  }

  @Post()
  create(@Body() dto: CreateItineraryItemDto) {
    return this.itineraryItemsService.create(dto);
  }

  @Patch(':uuid')
  update(@Param('uuid', ParseUUIDPipe) uuid: string, @Body() dto: UpdateItineraryItemDto) {
    return this.itineraryItemsService.update(uuid, dto);
  }

  @Delete(':uuid')
  remove(@Param('uuid', ParseUUIDPipe) uuid: string) {
    return this.itineraryItemsService.remove(uuid);
  }
}
