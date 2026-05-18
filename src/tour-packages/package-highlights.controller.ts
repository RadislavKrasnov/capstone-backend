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
import { CreatePackageHighlightDto } from './dto/create-package-highlight.dto';
import { FindPackageHighlightsQueryDto } from './dto/find-package-highlights-query.dto';
import { UpdatePackageHighlightDto } from './dto/update-package-highlight.dto';
import { PackageHighlightsService } from './package-highlights.service';

@UseGuards(JwtAuthGuard)
@Controller('package-highlights')
export class PackageHighlightsController {
  constructor(private readonly packageHighlightsService: PackageHighlightsService) {}

  @Get()
  findAll(@Query() query: FindPackageHighlightsQueryDto) {
    return this.packageHighlightsService.findAll(query);
  }

  @Get(':uuid')
  findOne(@Param('uuid', ParseUUIDPipe) uuid: string) {
    return this.packageHighlightsService.findOne(uuid);
  }

  @Post()
  create(@Body() dto: CreatePackageHighlightDto) {
    return this.packageHighlightsService.create(dto);
  }

  @Patch(':uuid')
  update(@Param('uuid', ParseUUIDPipe) uuid: string, @Body() dto: UpdatePackageHighlightDto) {
    return this.packageHighlightsService.update(uuid, dto);
  }

  @Delete(':uuid')
  remove(@Param('uuid', ParseUUIDPipe) uuid: string) {
    return this.packageHighlightsService.remove(uuid);
  }
}
