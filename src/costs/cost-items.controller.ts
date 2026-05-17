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
import { CostItemsService } from './cost-items.service';
import { CreateCostItemDto } from './dto/create-cost-item.dto';
import { FindCostItemsQueryDto } from './dto/find-cost-items-query.dto';
import { UpdateCostItemDto } from './dto/update-cost-item.dto';

@UseGuards(JwtAuthGuard)
@Controller('cost-items')
export class CostItemsController {
  constructor(private readonly costItemsService: CostItemsService) {}

  @Get()
  findAll(@Query() query: FindCostItemsQueryDto) {
    return this.costItemsService.findAll(query);
  }

  @Get(':uuid')
  findOne(@Param('uuid', ParseUUIDPipe) uuid: string) {
    return this.costItemsService.findOne(uuid);
  }

  @Post()
  create(@Body() dto: CreateCostItemDto) {
    return this.costItemsService.create(dto);
  }

  @Patch(':uuid')
  update(@Param('uuid', ParseUUIDPipe) uuid: string, @Body() dto: UpdateCostItemDto) {
    return this.costItemsService.update(uuid, dto);
  }

  @Delete(':uuid')
  remove(@Param('uuid', ParseUUIDPipe) uuid: string) {
    return this.costItemsService.remove(uuid);
  }
}
