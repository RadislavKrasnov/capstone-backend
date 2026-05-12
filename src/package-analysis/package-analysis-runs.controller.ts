import { Controller, Get, Param, ParseUUIDPipe, UseGuards } from '@nestjs/common';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PackageAnalysisService } from './package-analysis.service';

@UseGuards(JwtAuthGuard)
@Controller('package-analysis/runs')
export class PackageAnalysisRunsController {
  constructor(private readonly packageAnalysisService: PackageAnalysisService) {}

  @Get(':uuid')
  getAnalysisRun(@Param('uuid', ParseUUIDPipe) uuid: string) {
    return this.packageAnalysisService.getAnalysisRun(uuid);
  }
}
