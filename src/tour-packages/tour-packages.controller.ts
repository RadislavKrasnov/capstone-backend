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
import { CreateTourPackageDto } from './dto/create-tour-package.dto';
import { FindTourPackagesQueryDto } from './dto/find-tour-packages-query.dto';
import { UpdateTourPackageDto } from './dto/update-tour-package.dto';
import { TourPackagesService } from './tour-packages.service';

@UseGuards(JwtAuthGuard)
@Controller('tour-packages')
export class TourPackagesController {
  constructor(private readonly tourPackagesService: TourPackagesService) {}

  @Get()
  findAll(@Query() query: FindTourPackagesQueryDto) {
    return this.tourPackagesService.findAll(query);
  }

  @Get(':uuid')
  findOne(@Param('uuid', ParseUUIDPipe) uuid: string) {
    return this.tourPackagesService.findOne(uuid);
  }

  @Post()
  create(@Body() dto: CreateTourPackageDto) {
    return this.tourPackagesService.create(dto);
  }

  @Patch(':uuid')
  update(@Param('uuid', ParseUUIDPipe) uuid: string, @Body() dto: UpdateTourPackageDto) {
    return this.tourPackagesService.update(uuid, dto);
  }

  @Delete(':uuid')
  remove(@Param('uuid', ParseUUIDPipe) uuid: string) {
    return this.tourPackagesService.remove(uuid);
  }
}
