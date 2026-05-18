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
import { CreatePackageInclusionDto } from './dto/create-package-inclusion.dto';
import { FindPackageInclusionsQueryDto } from './dto/find-package-inclusions-query.dto';
import { UpdatePackageInclusionDto } from './dto/update-package-inclusion.dto';
import { PackageInclusionsService } from './package-inclusions.service';

@UseGuards(JwtAuthGuard)
@Controller('package-inclusions')
export class PackageInclusionsController {
  constructor(private readonly packageInclusionsService: PackageInclusionsService) {}

  @Get()
  findAll(@Query() query: FindPackageInclusionsQueryDto) {
    return this.packageInclusionsService.findAll(query);
  }

  @Get(':uuid')
  findOne(@Param('uuid', ParseUUIDPipe) uuid: string) {
    return this.packageInclusionsService.findOne(uuid);
  }

  @Post()
  create(@Body() dto: CreatePackageInclusionDto) {
    return this.packageInclusionsService.create(dto);
  }

  @Patch(':uuid')
  update(@Param('uuid', ParseUUIDPipe) uuid: string, @Body() dto: UpdatePackageInclusionDto) {
    return this.packageInclusionsService.update(uuid, dto);
  }

  @Delete(':uuid')
  remove(@Param('uuid', ParseUUIDPipe) uuid: string) {
    return this.packageInclusionsService.remove(uuid);
  }
}
