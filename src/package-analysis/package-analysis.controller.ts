import { Controller, Get, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PackageAnalysisService } from './package-analysis.service';

@UseGuards(JwtAuthGuard)
@Controller('tour-packages')
export class PackageAnalysisController {
  constructor(private readonly packageAnalysisService: PackageAnalysisService) {}

  @Post(':uuid/analyze')
  analyzePackage(@Param('uuid', ParseUUIDPipe) uuid: string, @CurrentUser('id') userId: number) {
    return this.packageAnalysisService.analyzePackage(uuid, userId);
  }

  @Get(':uuid/analysis/latest')
  getLatestCompletedAnalysis(@Param('uuid', ParseUUIDPipe) uuid: string) {
    return this.packageAnalysisService.getLatestCompletedAnalysis(uuid);
  }

  @Get(':uuid/analysis-runs')
  getAnalysisRuns(@Param('uuid', ParseUUIDPipe) uuid: string) {
    return this.packageAnalysisService.getAnalysisRuns(uuid);
  }
}
