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
import { CreatePackageExclusionDto } from './dto/create-package-exclusion.dto';
import { FindPackageExclusionsQueryDto } from './dto/find-package-exclusions-query.dto';
import { UpdatePackageExclusionDto } from './dto/update-package-exclusion.dto';
import { PackageExclusionsService } from './package-exclusions.service';

@UseGuards(JwtAuthGuard)
@Controller('package-exclusions')
export class PackageExclusionsController {
  constructor(private readonly packageExclusionsService: PackageExclusionsService) {}

  @Get()
  findAll(@Query() query: FindPackageExclusionsQueryDto) {
    return this.packageExclusionsService.findAll(query);
  }

  @Get(':uuid')
  findOne(@Param('uuid', ParseUUIDPipe) uuid: string) {
    return this.packageExclusionsService.findOne(uuid);
  }

  @Post()
  create(@Body() dto: CreatePackageExclusionDto) {
    return this.packageExclusionsService.create(dto);
  }

  @Patch(':uuid')
  update(@Param('uuid', ParseUUIDPipe) uuid: string, @Body() dto: UpdatePackageExclusionDto) {
    return this.packageExclusionsService.update(uuid, dto);
  }

  @Delete(':uuid')
  remove(@Param('uuid', ParseUUIDPipe) uuid: string) {
    return this.packageExclusionsService.remove(uuid);
  }
}
